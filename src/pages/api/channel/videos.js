// API route for fetching videos from a YouTube channel
import axios from 'axios';
import config from '../../../config';
import apiCache from '../../../core/utils/api-cache';
import batchRequests from '../../../core/utils/batch-requests';

// YouTube API key (should be stored in environment variables in production)
const YOUTUBE_API_KEY = config.youtube?.apiKey || process.env.YOUTUBE_API_KEY;

// Cache TTL for videos (6 hours - shorter than channel info since videos update more frequently)
const CACHE_TTL = config.youtube.api.cacheTTL.videos || 6 * 60 * 60 * 1000;

// Cache TTL for video details (24 hours)
const VIDEO_DETAILS_CACHE_TTL = config.youtube.api.cacheTTL.videoDetails || 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelId, pageToken, sortBy = 'date', minDuration = 0 } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    // Map sort parameter to YouTube API order parameter
    const order = sortBy === 'popularity' ? 'viewCount' : 'date';

    // Track total API cost for this request
    let totalApiCost = 0;

    try {
      // Fetch channel videos from YouTube API with caching
      // According to YouTube Data API v3 Quota Calculator:
      // - search.list costs 100 units per request
      // - Each part specified costs additional units (snippet = 1 unit)
      // Total cost = 100 units
      const searchQuotaCost = 100;
      
      const { response, fromCache } = await apiCache.cachedRequest(
        // Request function
        () => axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: YOUTUBE_API_KEY,
            channelId,
            part: 'snippet',
            maxResults: 10,
            order,
            type: 'video',
            videoDuration: 'long', // Only fetch videos longer than 20 minutes
            pageToken: pageToken || undefined
          }
        }),
        // Endpoint for cache key
        'youtube/search/videos',
        // Parameters for cache key
        { channelId, order, pageToken: pageToken || 'null' },
        // Cache options
        { 
          ttl: CACHE_TTL, 
          quotaCost: searchQuotaCost,
          forceNetwork: false, // Don't force network request if approaching quota
          apiType: 'videos' // Track as videos operation
        }
      );
      
      totalApiCost += searchQuotaCost;

      if (!response.data.items || response.data.items.length === 0) {
        return res.json({
          videos: [],
          nextPageToken: null,
          totalCount: 0,
          filteredCount: 0,
          fromCache,
          apiCost: fromCache ? 0 : totalApiCost
        });
      }

      // Extract video IDs for detailed info
      const videoIds = response.data.items.map(item => item.id.videoId);
      
      // Process videos and filter by duration if needed
      let videos = [];
      let totalVideos = response.data.pageInfo.totalResults;
      let filteredCount = 0;
      
      // Use batch requests if enabled, otherwise use regular API request
      if (batchRequests.isBatchingEnabled()) {
        // Get video details using batch requests (much more efficient)
        // According to YouTube Data API v3 Quota Calculator:
        // - videos.list costs 1 unit per request (not per video)
        // - Each part specified costs additional units (snippet = 1, contentDetails = 1, statistics = 1)
        // Total cost = 1 unit for the batch request
        const videoDetailsPromises = videoIds.map(videoId => batchRequests.getVideoDetails(videoId));
        const videoDetailsResults = await Promise.allSettled(videoDetailsPromises);
        
        // Process each video
        videoDetailsResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const videoDetails = result.value;
            const videoId = videoDetails.id;
            const searchItem = response.data.items.find(item => item.id.videoId === videoId);
            
            if (searchItem) {
              // Parse duration
              const duration = videoDetails.contentDetails.duration;
              const durationInSeconds = parseDuration(duration);
              const durationInMinutes = Math.floor(durationInSeconds / 60);
              
              // Check if this is a YouTube Short and skip it
              if (isYouTubeShort(searchItem, videoDetails, durationInSeconds)) {
                filteredCount++;
                return; // Skip this video
              }
              
              // Filter by minimum duration if specified
              if (minDuration > 0 && durationInMinutes < minDuration) {
                filteredCount++;
                return; // Skip this video
              }
              
              // Format video data
              videos.push({
                id: videoId,
                title: searchItem.snippet.title,
                description: searchItem.snippet.description,
                publishedAt: searchItem.snippet.publishedAt,
                thumbnails: searchItem.snippet.thumbnails,
                channelTitle: searchItem.snippet.channelTitle,
                duration,
                durationInSeconds,
                durationFormatted: formatDuration(durationInSeconds),
                viewCount: parseInt(videoDetails.statistics.viewCount || 0),
                likeCount: parseInt(videoDetails.statistics.likeCount || 0),
                commentCount: parseInt(videoDetails.statistics.commentCount || 0)
              });
            }
          }
        });
        
        // Batch requests cost is already tracked in the batch-requests.js module
        // We're just adding 1 unit to our tracking for clarity
        totalApiCost += 1;
      } else {
        // Fetch video details for duration and other info with caching (original method)
        // According to YouTube Data API v3 Quota Calculator:
        // - videos.list costs 1 unit per request (not per video)
        // - Each part specified costs additional units (snippet = 1, contentDetails = 1, statistics = 1)
        // Total cost = 1 unit for the request
        const videoDetailsQuotaCost = 1;
        
        const { response: videoDetailsResponse, fromCache: videoDetailsFromCache } = await apiCache.cachedRequest(
          // Request function
          () => axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              key: YOUTUBE_API_KEY,
              id: videoIds.join(','),
              part: 'contentDetails,statistics,snippet'
            }
          }),
          // Endpoint for cache key
          'youtube/videos/details',
          // Parameters for cache key
          { videoIds: videoIds.join(',') },
          // Cache options
          { 
            ttl: VIDEO_DETAILS_CACHE_TTL, 
            quotaCost: videoDetailsQuotaCost, // Video details costs 1 unit per request (not per video)
            forceNetwork: false, // Don't force network request if approaching quota
            apiType: 'videos' // Track as videos operation
          }
        );
        
        totalApiCost += videoDetailsQuotaCost;

        if (videoDetailsResponse.data.items && videoDetailsResponse.data.items.length > 0) {
          // Map search results to video details
          const videoDetailsMap = {};
          videoDetailsResponse.data.items.forEach(video => {
            videoDetailsMap[video.id] = video;
          });

          // Process each video
          response.data.items.forEach(item => {
            const videoId = item.id.videoId;
            const videoDetails = videoDetailsMap[videoId];
            
            if (videoDetails) {
              // Parse duration
              const duration = videoDetails.contentDetails.duration;
              const durationInSeconds = parseDuration(duration);
              const durationInMinutes = Math.floor(durationInSeconds / 60);
              
              // Check if this is a YouTube Short and skip it
              if (isYouTubeShort(item, videoDetails, durationInSeconds)) {
                filteredCount++;
                return; // Skip this video
              }
              
              // Filter by minimum duration if specified
              if (minDuration > 0 && durationInMinutes < minDuration) {
                filteredCount++;
                return; // Skip this video
              }
              
              // Format video data
              videos.push({
                id: videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,
                thumbnails: item.snippet.thumbnails,
                channelTitle: item.snippet.channelTitle,
                duration,
                durationInSeconds,
                durationFormatted: formatDuration(durationInSeconds),
                viewCount: parseInt(videoDetails.statistics.viewCount || 0),
                likeCount: parseInt(videoDetails.statistics.likeCount || 0),
                commentCount: parseInt(videoDetails.statistics.commentCount || 0)
              });
            }
          });
        }
      }

      // Return formatted response
      res.json({
        videos,
        nextPageToken: response.data.nextPageToken || null,
        totalCount: totalVideos,
        filteredCount,
        fromCache,
        apiCost: fromCache ? 0 : totalApiCost
      });
    } catch (error) {
      // If we hit quota limit, return appropriate error
      if (error.message === 'YouTube API quota exceeded. Please try again tomorrow.') {
        return res.status(429).json({
          error: 'YouTube API quota exceeded',
          message: 'The daily quota for YouTube API requests has been exceeded. Please try again tomorrow.'
        });
      }
      throw error; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error fetching channel videos:', error);
    
    // Handle YouTube API errors specifically
    if (error.response && error.response.data) {
      // Check for quota exceeded error
      const errorDetails = error.response.data.error;
      if (errorDetails && errorDetails.errors && errorDetails.errors.length > 0) {
        const apiError = errorDetails.errors[0];
        
        if (apiError.reason === 'quotaExceeded') {
          return res.status(429).json({
            error: 'YouTube API quota exceeded',
            message: 'The daily quota for YouTube API requests has been exceeded. Please try again tomorrow.'
          });
        }
      }
      
      return res.status(error.response.status || 500).json({ 
        error: 'Failed to fetch channel videos',
        details: errorDetails || error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch channel videos',
      message: error.message
    });
  }
}

// Helper function to parse ISO 8601 duration format
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  const hours = (match[1] && parseInt(match[1])) || 0;
  const minutes = (match[2] && parseInt(match[2])) || 0;
  const seconds = (match[3] && parseInt(match[3])) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Helper function to format duration in HH:MM:SS or MM:SS format
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to check if a video is a YouTube Short
function isYouTubeShort(videoItem, videoDetails, durationInSeconds) {
  // YouTube Shorts are typically vertical videos under 60 seconds
  const isShortDuration = durationInSeconds <= 60;
  
  // Check title for "#shorts" hashtag
  const titleHasShortTag = videoItem.snippet.title.toLowerCase().includes('#short');
  
  // Check description for shorts indicators
  const descriptionHasShortTag = videoItem.snippet.description.toLowerCase().includes('#short');
  
  // Check if video has vertical aspect ratio
  let isVerticalVideo = false;
  if (videoDetails.player && videoDetails.player.embedHeight && videoDetails.player.embedWidth) {
    isVerticalVideo = videoDetails.player.embedHeight > videoDetails.player.embedWidth;
  } else if (videoItem.snippet.thumbnails && videoItem.snippet.thumbnails.medium) {
    const thumbnail = videoItem.snippet.thumbnails.medium;
    if (thumbnail.width && thumbnail.height) {
      isVerticalVideo = thumbnail.height > thumbnail.width;
    }
  }
  
  // Consider it a Short if it meets at least two criteria or has #shorts in title
  return (titleHasShortTag && isShortDuration) || 
         (isShortDuration && isVerticalVideo) || 
         (titleHasShortTag && descriptionHasShortTag);
}
