// API route for summarizing transcripts
import path from 'path';
import fs from 'fs';
import cache from './cache/cache';
import Models from '../../core/utils/models';
import { summarizeTranscript } from '../../core/summarize-transcript';
import config from '../../config';

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl, model, currency, skipCache, forceCache } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Generate cache key
    const cacheKey = cache.generateKey({
      type: 'summary',
      videoId,
      model: model || config.ai.model,
      currency: currency || config.currency.default
    });

    // Check cache if not explicitly skipping
    if (!skipCache) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        console.log(`Returning cached summary for ${videoId}`);
        return res.json(cachedResult);
      }
    }

    // If forceCache is true, we should check the cache periodically
    // This is useful when another process might be generating the summary
    if (forceCache) {
      // Try to check the cache a few times with a delay
      for (let i = 0; i < 3; i++) {
        // Wait for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check cache again
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
          console.log(`Found cached summary for ${videoId} after waiting`);
          return res.json(cachedResult);
        }
      }

      // If we still don't have a cached result, inform the client
      return res.status(404).json({
        error: 'No cached summary available',
        message: 'The summary is not available in cache and forceCache was set to true'
      });
    }

    // Generate summary with options from centralized config
    const summaryOptions = {
      model: model || config.ai.model,
      currency: currency || config.currency.default,
      parallelProcessing: config.ai.parallelProcessing,
      maxConcurrentRequests: config.ai.maxConcurrentRequests,
      chunkingStrategy: config.ai.chunkingStrategy
    };
    
    const summaryResult = await summarizeTranscript(videoId, summaryOptions);

    if (!summaryResult || !summaryResult.text) {
      console.error('Failed to generate summary:', summaryResult);
      return res.status(500).json({ error: 'Failed to generate summary' });
    }

    // Add debugging information
    console.log('Summary result structure:', Object.keys(summaryResult));
    console.log('Usage information:', summaryResult.usage);
    console.log('Cost information:', summaryResult.cost);

    // Get cost information from the summarizeTranscript result
    const costInfo = {
      videoId,
      model: summaryOptions.model,
      modelName: summaryResult.cost?.model || summaryOptions.model,
      inputTokens: summaryResult.usage?.promptTokens || 0,
      outputTokens: summaryResult.usage?.completionTokens || 0,
      totalTokens: summaryResult.usage?.totalTokens || 0,
      inputCost: summaryResult.cost?.inputCost || 0,
      outputCost: summaryResult.cost?.outputCost || 0,
      totalCost: summaryResult.cost?.totalCost || 0,
      inputCostFormatted: summaryResult.cost?.inputCostFormatted || '$0.00',
      outputCostFormatted: summaryResult.cost?.outputCostFormatted || '$0.00',
      totalCostFormatted: summaryResult.cost?.totalCostFormatted || '$0.00',
      currency: summaryResult.cost?.currency || summaryOptions.currency || 'USD',
      exchangeRate: summaryResult.cost?.exchangeRate || 1,
      processingTime: summaryResult.processingTime || 0,
      timestamp: new Date().toISOString(),
      fromCache: false,
      cacheKey
    };

    // Prepare result
    const result = {
      videoId,
      summary: summaryResult.text,
      cost: costInfo
    };

    // Cache the result
    cache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error summarizing transcript:', error);
    res.status(500).json({ error: 'Failed to summarize transcript' });
  }
}
