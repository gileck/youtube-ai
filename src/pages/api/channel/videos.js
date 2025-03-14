// API route for fetching videos from a YouTube channel
import axios from 'axios';
import config from '../../../config';
import apiCache from '../../../core/utils/api-cache';

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
          items: [],
          totalResults: 0,
          filteredResults: 0,
          nextPageToken: null,
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
      
      // Fetch video details for duration and other info with caching
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

      // Sort videos based on the requested sort order
      if (sortBy === 'popularity') {
        videos.sort((a, b) => b.viewCount - a.viewCount);
      } else {
        videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      }

      // Return the formatted response
      return res.json({
        items: videos,
        totalResults: totalVideos,
        filteredResults: filteredCount,
        nextPageToken: response.data.nextPageToken || null,
        fromCache: fromCache && videoDetailsFromCache,
        apiCost: (fromCache && videoDetailsFromCache) ? 0 : totalApiCost
      });
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      return res.json({ 
        success: false,
        error: 'Error fetching channel videos', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in channel videos API:', error);
    return res.json({ 
      success: false,
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Helper function to parse ISO 8601 duration format
 * @param {string} duration - ISO 8601 duration string (e.g., PT1H30M15S)
 * @returns {number} - Duration in seconds
 */
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Helper function to format duration in HH:MM:SS or MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Helper function to check if a video is a YouTube Short
 * @param {Object} videoItem - YouTube search result item
 * @param {Object} videoDetails - YouTube video details
 * @param {number} durationInSeconds - Video duration in seconds
 * @returns {boolean} - True if the video is a YouTube Short
 */
function isYouTubeShort(videoItem, videoDetails, durationInSeconds) {
  // YouTube Shorts are typically vertical videos with duration <= 60 seconds
  // They also often have "#shorts" in the title or description
  
  // Check duration (Shorts are usually <= 60 seconds)
  if (durationInSeconds <= 60) {
    return true;
  }
  
  // Check for #shorts hashtag in title or description
  const title = videoItem.snippet.title.toLowerCase();
  const description = videoItem.snippet.description.toLowerCase();
  
  if (
    title.includes('#short') || 
    description.includes('#short') ||
    title.includes('shorts') ||
    description.includes('shorts')
  ) {
    return true;
  }
  
  return false;
}
