// API route for checking if a summary is in cache
import cache from './cache/cache';
import Models from '../../core/utils/models';
import { extractVideoId } from '../../core/pure-functions';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl, model, currency } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Generate cache keys for both estimate and summary
    const estimateCacheKey = cache.generateKey({
      type: 'estimate',
      videoId,
      model: model || Models.DEFAULT_MODEL,
      currency: currency || 'USD'
    });

    const summaryCacheKey = cache.generateKey({
      type: 'summary',
      videoId,
      model: model || Models.DEFAULT_MODEL,
      currency: currency || 'USD'
    });

    // Check if either is in cache
    const estimateInCache = cache.get(estimateCacheKey) !== null;
    const summaryInCache = cache.get(summaryCacheKey) !== null;

    res.json({
      inCache: estimateInCache || summaryInCache,
      estimateInCache,
      summaryInCache,
      videoId
    });
  } catch (error) {
    console.error('Error checking cache:', error);
    res.status(400).json({ 
      success: false,
      error: 'Failed to check cache',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
