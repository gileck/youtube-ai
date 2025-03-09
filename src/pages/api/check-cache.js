// API route for checking if a summary is in cache
import cache from './cache/cache';
import Models from '../../core/utils/models';

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

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
    res.status(500).json({ error: 'Failed to check cache' });
  }
}
