const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');
const Models = require('./utils/models');
const TranscriptSummarizer = require('./services/transcript-summarizer');
const { getTranscriptWithChapters } = require('./transcript-with-chapters');
const Pricing = require('./utils/pricing');
const Currency = require('./utils/currency');
const config = require('../config');

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Extracts the video ID from a YouTube URL
 * @param {string} url - The YouTube URL
 * @returns {string|null} - The video ID or null if not found
 */
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Summarize a transcript using AI
 * @param {string} videoId - The YouTube video ID
 * @param {Object} options - Options for summarization
 * @returns {Promise<Object>} - The generated summary result
 */
async function summarizeTranscript(videoId, options = {}) {
  try {
    // Merge options with defaults from config
    const mergedConfig = {
      model: config.ai.model,
      includeChapterBreakdown: config.ai.includeChapterBreakdown,
      chunkingStrategy: config.ai.chunkingStrategy,
      currency: config.currency.default,
      parallelProcessing: config.ai.parallelProcessing,
      maxConcurrentRequests: config.ai.maxConcurrentRequests,
      promptFile: config.ai.promptFile,
      ...options
    };

    console.log(`Transcript file not found. Generating transcript for video ${videoId}...`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Create a proper configuration object for getTranscriptWithChapters
    const transcriptConfig = {
      paths: {
        output: config.paths.output || 'output'
      },
      youtube: config.youtube || {
        chapterOffset: 0,
        skipFirstChapterOffset: true,
        chapterFilters: {
          enabled: true,
          patterns: []
        }
      }
    };

    console.log('Using transcript config:', JSON.stringify(transcriptConfig, null, 2));

    try {
      const transcript = await getTranscriptWithChapters(url, transcriptConfig);
      if (!transcript) {
        console.error(`Failed to get transcript for video ${videoId}`);
        return null;
      }

      // Create transcript summarizer service
      const summarizer = new TranscriptSummarizer(mergedConfig);

      console.log('\nGenerating summary...');

      // Generate the summary
      const result = await summarizer.summarize(transcript);

      // Calculate actual cost based on usage
      const actualCost = Pricing.calculateCost(mergedConfig.model, result.usage.promptTokens, result.usage.completionTokens);

      // Format cost with currency conversion
      const formattedCost = formatCost(actualCost, mergedConfig.currency);

      console.log(`\nActual API Cost:`);
      console.log(`Model: ${actualCost.model}`);
      console.log(`Input: ${result.usage.promptTokens.toLocaleString()} tokens (${formattedCost.inputCostFormatted})`);
      console.log(`Output: ${result.usage.completionTokens.toLocaleString()} tokens (${formattedCost.outputCostFormatted})`);
      console.log(`Total: ${formattedCost.totalCostFormatted}`);
      if (formattedCost.currency !== 'USD') {
        console.log(`Exchange rate: 1 USD = ${formattedCost.exchangeRate} ${formattedCost.currency}`);
      }
      console.log(`Processing time: ${result.processingTime} seconds`);

      // Create the final result object
      const finalResult = {
        text: result.text,
        usage: result.usage,
        cost: {
          ...actualCost,
          ...formattedCost
        },
        processingTime: parseFloat(result.processingTime)
      };

      // Debug the result object structure
      console.log('\nResult object structure:');
      console.log('- text:', typeof finalResult.text === 'string' ? 'String of length ' + finalResult.text.length : typeof finalResult.text);
      console.log('- usage:', finalResult.usage);
      console.log('- cost:', finalResult.cost);
      console.log('- processingTime:', finalResult.processingTime);

      // Return the full result object instead of just the text
      return finalResult;
    } catch (error) {
      throw error
      console.error(`Error generating transcript for video ${videoId}:`, error.message);
      return null;
    }
  } catch (error) {
    throw error
    // console.error(`Error summarizing transcript for video ${videoId}:`, error.message);
    return null;
  }
}

/**
 * Format cost with currency conversion if needed
 * @param {Object} cost - Cost object from Pricing.calculateCost
 * @param {string} currency - Currency code
 * @returns {Object} - Formatted cost with currency conversion
 */
function formatCost(cost, currency = 'USD') {
  const formattedCost = { ...cost };

  // Apply currency conversion if needed
  if (currency !== 'USD') {
    const converted = Currency.convertFromUsd(cost.inputCost, currency);
    const outputCostConverted = Currency.convertFromUsd(cost.outputCost, currency);
    const totalCostConverted = Currency.convertFromUsd(cost.totalCost, currency);

    formattedCost.inputCostFormatted = converted.formattedConverted;
    formattedCost.outputCostFormatted = outputCostConverted.formattedConverted;
    formattedCost.totalCostFormatted = totalCostConverted.formattedConverted;
    formattedCost.currency = currency;
    formattedCost.exchangeRate = converted.rate;
  } else {
    // Default to USD
    formattedCost.inputCostFormatted = `$${cost.inputCost.toFixed(4)}`;
    formattedCost.outputCostFormatted = `$${cost.outputCost.toFixed(4)}`;
    formattedCost.totalCostFormatted = `$${cost.totalCost.toFixed(4)}`;
    formattedCost.currency = 'USD';
    formattedCost.exchangeRate = 1;
  }

  return formattedCost;
}

/**
 * Processes a YouTube URL to summarize the transcript
 * @param {string} url - The YouTube URL
 * @returns {Promise<void>}
 */
async function processYouTubeUrl(url) {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error('Invalid YouTube URL');
      return;
    }

    // Summarize transcript
    const summary = await summarizeTranscript(videoId);
    if (!summary) {
      console.error('Failed to generate summary');
      return;
    }

    console.log('\nSummary:');
    console.log(summary);
  } catch (error) {
    console.error('Error processing YouTube URL:', error.message);
  }
}

/**
 * Processes YouTube URLs from a file
 * @param {string} filePath - Path to the file containing YouTube URLs
 * @returns {Promise<void>}
 */
async function processUrlsFromFile(filePath) {
  try {
    // Read URLs from file
    const urls = fs.readFileSync(filePath, 'utf-8').split('\n').filter(url => url.trim());

    // Process each URL
    for (const url of urls) {
      if (url.trim()) {
        console.log(`\nProcessing URL: ${url}`);
        await processYouTubeUrl(url);
      }
    }
  } catch (error) {
    console.error('Error processing URLs from file:', error.message);
  }
}

// Export functions for potential reuse
module.exports = {
  extractVideoId,
  summarizeTranscript,
  processYouTubeUrl,
  processUrlsFromFile
};
