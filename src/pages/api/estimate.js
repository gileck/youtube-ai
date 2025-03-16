// API route for estimating cost
import path from 'path';
import fs from 'fs';
import cache from './cache/cache.js';
import Models from '../../core/utils/models.js';
import config from '../../config.js';
// Import pure functions
import { 
  extractVideoId, 
  getTranscript, 
  getChapters, 
  getTranscriptWithChapters 
} from '../../core/pure-functions/index.js';
import TranscriptSummarizer from '../../core/services/transcript-summarizer.js';

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
      type: 'estimate',
      videoId,
      model: model || Models.DEFAULT_MODEL,
      currency: currency || 'USD'
    });

    // Check cache if not explicitly skipping
    if (!skipCache) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        console.log(`Returning cached estimate for ${videoId}`);
        return res.json(cachedResult);
      }
    }

    // Handle force cache option
    if (forceCache) {
      // Try to check the cache a few times with a delay
      for (let i = 0; i < 3; i++) {
        // Wait for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check cache again
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
          console.log(`Found cached estimate for ${videoId} after waiting`);
          return res.json(cachedResult);
        }
      }

      // If we still don't have a cached result, inform the client
      return res.status(400).json({ error: 'No cached estimate available' });
    }

    // Fetch transcript and chapters
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

    // Create a temporary file to store the transcript
    const tempDir = path.join(process.cwd(), '.temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const transcriptPath = path.join(tempDir, `${videoId}.txt`);
    fs.writeFileSync(transcriptPath, transcriptWithChapters.formattedText);

    // Read transcript
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');

    // Create a temporary summarizer to estimate cost
    const summarizer = new TranscriptSummarizer({
      model: model || Models.DEFAULT_MODEL,
      currency: currency || 'USD'
    });

    // Estimate cost
    const estimate = await summarizer.estimateCost(transcript);
    
    // Check if the estimated cost exceeds the threshold
    const costApprovalThreshold = config.ai.costApprovalThreshold || 0.05; // Default to $0.05 if not set
    const requiresApproval = estimate.totalCost > costApprovalThreshold;
    
    // Add the requiresApproval flag to the response
    const estimateWithApprovalFlag = {
      ...estimate,
      requiresApproval
    };

    // Cache the result
    cache.set(cacheKey, estimateWithApprovalFlag);

    res.json(estimateWithApprovalFlag);
  } catch (error) {
    console.error('Error estimating cost:', error);
    res.json({ 
      success: false,
      error: 'Failed to estimate cost',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
