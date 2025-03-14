// API route for searching YouTube channels by handle or username
import axios from 'axios';
import config from '../../../config';
import apiCache from '../../../core/utils/api-cache';

// YouTube API key (should be stored in environment variables in production)
const YOUTUBE_API_KEY = config.youtube?.apiKey || process.env.YOUTUBE_API_KEY;

// Cache TTL for channel search (24 hours)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, type = 'username' } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Format the query based on type
    let formattedQuery = q;
    if (type === 'handle' && !q.startsWith('@')) {
      formattedQuery = `@${q}`;
    }

    // If it's already a channel ID (starts with UC), just return it
    if (q.startsWith('UC')) {
      return res.json({
        items: [{
          channelId: q,
          title: 'Channel', // We'll fetch the full details later
          description: '',
          thumbnails: {
            default: { url: '' },
            medium: { url: '' }
          }
        }],
        totalResults: 1,
        fromCache: false,
        apiCost: 0
      });
    }

    // Search for channels using YouTube API with caching
    try {
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
            part: 'snippet',
            q: formattedQuery,
            type: 'channel',
            maxResults: 1
          }
        }),
        // Endpoint for cache key
        'youtube/search/channels',
        // Parameters for cache key
        { q: formattedQuery, type },
        // Cache options
        { 
          ttl: CACHE_TTL, 
          quotaCost: searchQuotaCost, // Search costs 100 units
          apiType: 'search' // Track as search operation
        }
      );

      // Check if any channels were found
      if (!response.data.items || response.data.items.length === 0) {
        return res.status(404).json({ 
          error: 'Channel not found', 
          message: `No channel found for ${type === 'handle' ? 'handle' : 'username'}: ${q}`,
          fromCache,
          apiCost: fromCache ? 0 : searchQuotaCost
        });
      }

      // Get the first channel result
      const channel = response.data.items[0];
      
      // Return the channel ID and basic info
      res.json({
        items: [{
          channelId: channel.id.channelId,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnails: channel.snippet.thumbnails
        }],
        totalResults: 1,
        fromCache,
        apiCost: fromCache ? 0 : searchQuotaCost
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
    console.error('Error searching for channel:', error);
    
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
        error: 'Failed to search for channel',
        details: errorDetails || error.message,
        fromCache: false,
        apiCost: 0
      });
    }
    
    res.json({ 
      success: false,
      error: 'Failed to search for channel',
      message: error.message,
      fromCache: false,
      apiCost: 0,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
