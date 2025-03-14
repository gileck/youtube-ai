// API route for fetching YouTube video information
import axios from 'axios';
import config from '../../../config';
import apiCache from '../../../core/utils/api-cache';
import { extractVideoId } from '../../../core/pure-functions';

// YouTube API key (should be stored in environment variables in production)
const YOUTUBE_API_KEY = config.youtube?.apiKey || process.env.YOUTUBE_API_KEY;

// Cache TTL for video info (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId: rawVideoId, url } = req.query;

    // Extract video ID from URL or use provided videoId
    let videoId = rawVideoId;
    if (url) {
      videoId = extractVideoId(url);
    }

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID or valid YouTube URL is required' });
    }

    // YouTube API quota cost for video info is 1 unit
    const videoInfoQuotaCost = 1;
    
    // Fetch video information from YouTube API with caching
    try {
      const { response, fromCache } = await apiCache.cachedRequest(
        // Request function
        () => axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            key: YOUTUBE_API_KEY,
            id: videoId,
            part: 'snippet,contentDetails,statistics'
          }
        }),
        // Endpoint for cache key
        'youtube/videos/info',
        // Parameters for cache key
        { videoId },
        // Cache options
        { 
          ttl: CACHE_TTL, 
          quotaCost: videoInfoQuotaCost, // Video info costs 1 unit per request
          apiType: 'videoInfo' // Track as video info operation
        }
      );

      // Check if video exists
      if (!response.data.items || response.data.items.length === 0) {
        return res.status(404).json({ 
          error: 'Video not found',
          message: `No video found with ID: ${videoId}`,
          fromCache,
          apiCost: fromCache ? 0 : videoInfoQuotaCost
        });
      }

      const video = response.data.items[0];
      
      // Format the video info
      const videoInfo = {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishDate: video.snippet.publishedAt,
        thumbnails: video.snippet.thumbnails,
        channelId: video.snippet.channelId,
        channelName: video.snippet.channelTitle,
        duration: video.contentDetails.duration,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount,
        commentCount: video.statistics.commentCount,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
      
      // Return formatted video info with consistent response format
      res.json({
        items: [videoInfo],
        totalResults: 1,
        fromCache, // Include cache status
        apiCost: fromCache ? 0 : videoInfoQuotaCost // No cost for cached responses
      });
    } catch (error) {
      // If we hit quota limit, return appropriate error
      if (error.message === 'YouTube API quota exceeded. Please try again tomorrow.') {
        return res.status(429).json({
          error: 'YouTube API quota exceeded',
          message: 'The daily quota for YouTube API requests has been exceeded. Please try again tomorrow.',
          fromCache: false,
          apiCost: 0
        });
      }
      throw error; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error fetching video info:', error);
    
    // Handle YouTube API errors specifically
    if (error.response && error.response.data) {
      // Check for quota exceeded error
      const errorDetails = error.response.data.error;
      if (errorDetails && errorDetails.errors && errorDetails.errors.length > 0) {
        const apiError = errorDetails.errors[0];
        
        if (apiError.reason === 'quotaExceeded') {
          return res.status(429).json({
            error: 'YouTube API quota exceeded',
            message: 'The daily quota for YouTube API requests has been exceeded. Please try again tomorrow.',
            fromCache: false,
            apiCost: 0
          });
        }
      }
      
      return res.json({ 
        success: false,
        error: 'Failed to fetch video info',
        details: errorDetails || error.message,
        fromCache: false,
        apiCost: 0
      });
    }
    
    res.json({ 
      success: false,
      error: 'Failed to fetch video info',
      message: error.message,
      fromCache: false,
      apiCost: 0,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
