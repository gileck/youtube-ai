// API route for summarizing transcripts
import path from 'path';
import fs from 'fs';
import cache from './cache/cache';
import Models from '../../core/utils/models';
import config from '../../config';
// Import pure functions
import { 
  extractVideoId, 
  getTranscript, 
  getChapters, 
  getTranscriptWithChapters,
  getVideoInfo,
  summarizeChapters
} from '../../core/pure-functions';
// Import the transcript summarizer for full transcript fallback
import { summarizeTranscript } from '../../core/pure-functions/summarization';

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

    // Fetch video information
    console.log(`Fetching video information for ${videoId}...`);
    const videoInfo = await getVideoInfo(videoId);
    console.log(`Video title: ${videoInfo.title}`);
    console.log(`Channel: ${videoInfo.channel.name}`);

    // Fetch transcript and chapters using pure functions
    console.log(`Fetching transcript and chapters for video ${videoId}...`);
    const transcriptData = await getTranscript(videoId);
    const chaptersData = await getChapters(videoId, {
      chapterOffset: config.youtube?.chapterOffset || 0,
      skipFirstChapterOffset: config.youtube?.skipFirstChapterOffset !== false
    });

    // Combine transcript and chapters
    const transcriptWithChapters = getTranscriptWithChapters(
      videoId, 
      transcriptData, 
      chaptersData, 
      {
        chapterFilters: config.youtube?.chapterFilters || { enabled: false, patterns: [] }
      }
    );

    // Prepare video metadata for summarization
    const videoMetadata = {
      title: videoInfo.title,
      description: videoInfo.description || '',
      channelName: videoInfo.channel.name,
      publishDate: videoInfo.publishDate
    };

    // Generate summary with options from centralized config
    const summaryOptions = {
      model: model || config.ai.model,
      currency: currency || config.currency.default,
      parallelProcessing: config.ai.parallelProcessing,
      maxConcurrentRequests: config.ai.maxConcurrentRequests,
      chunkingStrategy: config.ai.chunkingStrategy,
      includeChapterBreakdown: config.ai.includeChapterBreakdown,
      includeVideoMetadata: config.ai.includeVideoMetadata !== false,
      videoMetadata // Pass video metadata to summarization functions
    };
    
    // Check if we have chapter content
    const hasChapterContent = transcriptWithChapters.chapterContent && 
                              Object.keys(transcriptWithChapters.chapterContent).length > 0;
    
    let summaryResult;
    
    if (hasChapterContent) {
      // Use chapter-based summarization if we have chapters
      console.log(`Using chapter-based summarization with ${Object.keys(transcriptWithChapters.chapterContent).length} chapters`);
      summaryResult = await summarizeChapters(
        videoId, 
        transcriptWithChapters.chapterContent, 
        summaryOptions
      );
    } else {
      // Fall back to full transcript summarization if no chapters are available
      console.log('No chapters found. Falling back to full transcript summarization');
      summaryResult = await summarizeTranscript(
        videoId, 
        transcriptWithChapters.formattedText, 
        summaryOptions
      );
    }

    if (!summaryResult || !summaryResult.text) {
      console.error('Failed to generate summary:', summaryResult);
      return res.json({ 
        success: false,
        error: 'Failed to generate summary', 
        message: 'Failed to generate summary',
        stack: process.env.NODE_ENV === 'development' ? 'Failed to generate summary' : undefined
      });
    }

    // Add debugging information
    console.log('Summary result structure:', Object.keys(summaryResult));
    console.log('Usage information:', summaryResult.usage);
    console.log('Cost information:', summaryResult.cost);

    // Get cost information from the summary result
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
      cost: costInfo,
      title: videoInfo.title,
      channelName: videoInfo.channel.name,
      publishDate: videoInfo.publishDate,
      thumbnails: videoInfo.thumbnails,
      videoUrl: videoInfo.url,
      chapterSummaries: summaryResult.chapterSummaries || [] // Include chapter summaries if available
    };

    // Cache the result
    cache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error summarizing transcript:', error);
    res.json({ 
      success: false,
      error: 'Failed to summarize transcript', 
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
