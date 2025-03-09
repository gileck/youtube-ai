// API route for estimating cost
import path from 'path';
import fs from 'fs';
import cache from './cache/cache';
import Models from '../../core/utils/models';
import { createTranscriptWithChapters } from '../../core/transcript-with-chapters';

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
      const generatedPath = await createTranscriptWithChapters(youtubeUrl, apiConfig);

      if (!generatedPath) {
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

    // Cache the result
    cache.set(cacheKey, estimate);

    res.json(estimate);
  } catch (error) {
    console.error('Error estimating cost:', error);
    res.status(500).json({ error: 'Failed to estimate cost' });
  }
}
