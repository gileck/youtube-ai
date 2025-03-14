// API route for retrieving API usage statistics
import cache from '../cache/cache';
import config from '../../../config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get YouTube API usage from localStorage on server-side
    // This is a placeholder - in a real app, you'd retrieve this from a database
    // or from the actual YouTube API quota management system
    
    // Get cache stats as a proxy for API usage
    const cacheStats = await cache.getStats();
    
    // Calculate estimated API usage based on cache hits/misses
    const estimatedUsage = {
      daily: Math.floor((cacheStats.misses || 0) * 1.5), // Each cache miss typically results in ~1.5 API calls
      quota: config.youtube.api.quotaLimit, // YouTube API quota from config
      timestamp: new Date().toISOString(),
      cacheStats,
      // Include cost per request information from config
      costPerRequest: config.youtube.api.costPerRequest,
      // Include breakdown of usage by operation type (placeholder values)
      breakdown: {
        search: Math.floor((cacheStats.misses || 0) * 0.6), // 60% of misses are searches
        channelInfo: Math.floor((cacheStats.misses || 0) * 0.2), // 20% of misses are channel info
        videos: Math.floor((cacheStats.misses || 0) * 0.15), // 15% of misses are video info
        other: Math.floor((cacheStats.misses || 0) * 0.05) // 5% of misses are other operations
      }
    };
    
    // Return the stats
    res.json(estimatedUsage);
  } catch (error) {
    console.error('Error retrieving API usage stats:', error);
    res.status(200).json({ 
      success: false,
      error: 'Failed to retrieve API usage statistics',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
