// API route for fetching YouTube channel information
import axios from 'axios';
import config from '../../../config';
import apiCache from '../../../core/utils/api-cache';

// YouTube API key (should be stored in environment variables in production)
const YOUTUBE_API_KEY = config.youtube?.apiKey || process.env.YOUTUBE_API_KEY;

// Cache TTL for channel info (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'Channel ID is required' });
    }

    // YouTube API quota cost for channel info is 1 unit
    const channelInfoQuotaCost = 1;
    
    // Fetch channel information from YouTube API with caching
    try {
      const { response, fromCache } = await apiCache.cachedRequest(
        // Request function
        () => axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: {
            key: YOUTUBE_API_KEY,
            id: channelId,
            part: 'snippet,statistics,brandingSettings'
          }
        }),
        // Endpoint for cache key
        'youtube/channels/info',
        // Parameters for cache key
        { channelId },
        // Cache options
        { 
          ttl: CACHE_TTL, 
          quotaCost: channelInfoQuotaCost, // Channel info costs 1 unit per request
          apiType: 'channelInfo' // Track as channel info operation
        }
      );

      // Check if channel exists
      if (!response.data.items || response.data.items.length === 0) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const channel = response.data.items[0];
      
      // Return formatted channel info
      res.json({
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
        thumbnails: channel.snippet.thumbnails,
        statistics: channel.statistics,
        bannerUrl: channel.brandingSettings?.image?.bannerExternalUrl || null,
        fromCache, // Include cache status
        apiCost: fromCache ? 0 : channelInfoQuotaCost // No cost for cached responses
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
    console.error('Error fetching channel info:', error);
    
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
        error: 'Failed to fetch channel info',
        details: errorDetails || error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch channel info',
      message: error.message
    });
  }
}
