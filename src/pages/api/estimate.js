// API route for estimating cost
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
  getTranscriptWithChapters 
} from '../../core/pure-functions';

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
        
        // Add requiresApproval flag based on cost threshold
        const costApprovalThreshold = config.ai.costApprovalThreshold || 0.05; // Default to $0.05 if not set
        const requiresApproval = cachedResult.totalCost > costApprovalThreshold;
        
        return res.json({
          ...cachedResult,
          requiresApproval
        });
      }
    }

    // Create a proper configuration object
    const apiConfig = {
      directories: {
        output: 'output',
        debug: {
          combined: 'debug/combined',
          transcripts: 'debug/transcripts',
          chapters: 'debug/chapters',
          json: 'debug/json'
        }
      }
    };

    // Check if transcript exists, if not generate it
    const outputDir = path.join(process.cwd(), 'output');
    const transcriptPath = path.join(outputDir, `${videoId}-transcript-with-chapters.txt`);

    if (!fs.existsSync(transcriptPath)) {
      console.log(`Generating transcript for ${videoId}...`);
      
      // Get transcript and chapters using pure functions
      const transcriptData = await getTranscript(videoId);
      const chaptersData = await getChapters(videoId);
      
      // Combine transcript and chapters
      const combinedData = getTranscriptWithChapters(videoId, transcriptData, chaptersData);
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write the formatted text to file
      fs.writeFileSync(transcriptPath, combinedData.formattedText);
      
      if (!fs.existsSync(transcriptPath)) {
        return res.status(500).json({ error: 'Failed to generate transcript' });
      }
    }

    // Read transcript
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');

    // Create a temporary summarizer to estimate cost
    const TranscriptSummarizer = require('../../core/services/transcript-summarizer');

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
    res.status(500).json({ error: 'Failed to estimate cost' });
  }
}
