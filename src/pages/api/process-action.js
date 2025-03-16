// API route for processing AI actions on videos
import cache from './cache/cache';
import config from '../../config';
// Import pure functions
import { 
  extractVideoId, 
  getTranscript, 
  getChapters, 
  getTranscriptWithChapters,
  getVideoInfo
} from '../../core/pure-functions';
// Import AI adapter factory for model selection
import AIAdapterFactory from '../../core/ai/adapter-factory';
// Import processors
import { getProcessorById, calculateCost } from '../../core/ai-actions';
// Import server-side prompt loader
import { loadPromptTemplate } from '../../core/ai-actions/server/prompt-loader';

/**
 * API route handler for processing AI actions
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl, actionId, model, currency, customParams } = req.body;
    
    // Validate required parameters
    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    if (!actionId) {
      return res.status(400).json({ error: 'Action ID is required' });
    }
    
    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Check if result is cached
    const cacheKey = `${actionId}_${videoId}_${model || config.ai.model}`;
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log(`Using cached result for ${cacheKey}`);
      return res.status(200).json(cachedResult);
    }
    
    // Get video info for metadata
    const videoInfo = await getVideoInfo(videoId);
    
    // Get transcript and chapters
    console.log(`Fetching transcript and chapters for ${videoId}...`);
    const transcriptWithChapters = await getTranscriptWithChapters(videoId);
    const { transcript, chapters } = transcriptWithChapters;
    
    if (!transcript) {
      return res.status(404).json({ error: 'No transcript available for this video' });
    }
    
    console.log(`Transcript length: ${transcript.length} characters`);
    console.log(`Number of chapters: ${chapters ? chapters.length : 0}`);
    
    // Get the processor for the requested action
    const processor = getProcessorById(actionId);
    if (!processor) {
      return res.status(400).json({ error: `Unsupported action: ${actionId}` });
    }
    
    // Load prompt template from file (server-side only)
    const promptTemplate = loadPromptTemplate(actionId);
    console.log(`Using ${promptTemplate ? 'file-based' : 'default'} prompt template for ${actionId}`);
    
    // Initialize the AI adapter based on the configured model or requested model
    const requestModel = model || config.ai.model;
    const aiAdapter = AIAdapterFactory.createAdapter(requestModel, {
      maxTokens: processor.config.maxTokens,
      temperature: processor.config.temperature
    });
    
    // Process the action using the appropriate processor
    const result = await processor.process({
      transcript,
      chapters,
      videoMetadata: {
        id: videoId,
        title: videoInfo.title,
        channelTitle: videoInfo.channelTitle,
        publishedAt: videoInfo.publishedAt
      },
      adapter: aiAdapter,
      options: {
        model: requestModel,
        promptTemplate: promptTemplate,
        ...customParams
      }
    });
    
    // Add cost information if usage data is available
    if (result.usage) {
      result.cost = calculateCost(result.usage, requestModel, currency);
    }
    
    // Prepare the response
    const response = {
      videoId,
      action: actionId,
      result: result.text,
      metadata: {
        videoTitle: videoInfo.title,
        channelTitle: videoInfo.channelTitle,
        publishedAt: videoInfo.publishedAt,
        thumbnails: videoInfo.thumbnails,
        usage: result.usage,
        cost: result.cost,
        processingTime: result.processingTime,
        timestamp: new Date().toISOString()
      }
    };
    
    // Cache the result
    await cache.set(cacheKey, response);
    
    // Return the response
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing action:', error);
    return res.status(500).json({ error: 'Failed to process action', message: error.message });
  }
}
