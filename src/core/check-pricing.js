const fs = require('fs');
const path = require('path');
const Models = require('./utils/models');
const Pricing = require('./utils/pricing');
const TextChunker = require('./utils/text-chunker');

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
 * Check pricing for a transcript file
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<void>}
 */
async function checkPricing(videoId) {
  try {
    // Load configuration
    const config = {
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

    try {
      const configPath = path.join(__dirname, '..', 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        Object.assign(config, JSON.parse(configData));
      }
    } catch (error) {
      throw error
    }

    // Check if the transcript file exists
    const transcriptPath = path.join(__dirname, '..', config.directories.output, `${videoId}-transcript-with-chapters.txt`);
    if (!fs.existsSync(transcriptPath)) {
      console.error(`Transcript file not found: ${transcriptPath}`);
      return;
    }

    // Read the transcript file
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');

    // Estimate token count
    const inputTokenCount = TextChunker.estimateTokenCount(transcript);
    const estimatedOutputTokens = Math.min(4000, Math.ceil(inputTokenCount * 0.2)); // Estimate output as 20% of input, max 4000 tokens

    console.log(`\nTranscript Information:`);
    console.log(`Video ID: ${videoId}`);
    console.log(`File: ${transcriptPath}`);
    console.log(`Input tokens: ${inputTokenCount.toLocaleString()}`);
    console.log(`Estimated output tokens: ${estimatedOutputTokens.toLocaleString()}`);

    // Get pricing for all models
    const allModelCosts = Pricing.estimateAllModelCosts(inputTokenCount, estimatedOutputTokens);

    console.log('\nEstimated Costs by Model (Cheapest First):');
    console.log('===========================================');

    // Display pricing table
    console.log('Model                  | Input Cost | Output Cost | Total Cost');
    console.log('---------------------- | ---------- | ----------- | ----------');

    allModelCosts.forEach(cost => {
      const modelName = cost.model.padEnd(22);
      const inputCost = `$${cost.inputCost.toFixed(4)}`.padStart(10);
      const outputCost = `$${cost.outputCost.toFixed(4)}`.padStart(11);
      const totalCost = `$${cost.totalCost.toFixed(4)}`.padStart(10);

      console.log(`${modelName} | ${inputCost} | ${outputCost} | ${totalCost}`);
    });

    // Get the cheapest model
    const cheapestModel = allModelCosts[0];

    console.log('\nRecommendation:');
    console.log(`Use ${cheapestModel.model} for the most cost-effective processing.`);
    console.log(`Total estimated cost: $${cheapestModel.totalCost.toFixed(4)}`);

    // Compare with most expensive
    const mostExpensive = allModelCosts[allModelCosts.length - 1];
    const savingsPercent = ((1 - cheapestModel.totalCost / mostExpensive.totalCost) * 100).toFixed(1);

    console.log(`\nUsing ${cheapestModel.model} instead of ${mostExpensive.model} saves ${savingsPercent}% ($${(mostExpensive.totalCost - cheapestModel.totalCost).toFixed(4)})`);

  } catch (error) {
    console.error(`Error checking pricing for video ${videoId}:`, error.message);
  }
}

/**
 * Processes a YouTube URL to check pricing
 * @param {string} url - The YouTube URL
 * @returns {Promise<void>}
 */
async function processYouTubeUrl(url) {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error(`Invalid YouTube URL: ${url}`);
      return;
    }

    // Check pricing
    await checkPricing(videoId);

  } catch (error) {
    console.error(`Error processing URL ${url}:`, error.message);
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
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const urls = fileContent.split('\n').filter(url => url.trim() !== '');

    console.log(`Found ${urls.length} YouTube URLs to process`);

    // Process each URL
    for (const url of urls) {
      console.log(`\nProcessing URL: ${url}`);
      await processYouTubeUrl(url);
    }

  } catch (error) {
    console.error('Error processing URLs from file:', error.message);
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments, process URLs from file
    const urlsFilePath = path.join(__dirname, '..', 'youtube-urls.txt');
    processUrlsFromFile(urlsFilePath);
  } else if (args[0].startsWith('http')) {
    // URL provided as argument
    processYouTubeUrl(args[0]);
  } else {
    // Assume it's a video ID
    checkPricing(args[0]);
  }
}
