/**
 * Test script for the summarizeTranscript function
 * This script tests the summarization functionality with the prompt.txt file
 */

const path = require('path');
const fs = require('fs');
const { summarizeTranscript } = require('./src/core/summarize-transcript');
const config = require('./src/config');

// Use a video ID that's known to have a transcript available
// This is a TED talk which should have good transcript availability
const videoId = 'UF8uR6Z6KLc'; // Steve Jobs' Stanford Commencement Address

// Verify that the prompt file exists
const promptFilePath = path.join(__dirname, config.ai.promptFile);
console.log(`Checking for prompt file at: ${promptFilePath}`);
if (fs.existsSync(promptFilePath)) {
  console.log(`Prompt file found: ${promptFilePath}`);
  console.log('Prompt content:');
  console.log('----------------------------------------');
  console.log(fs.readFileSync(promptFilePath, 'utf-8'));
  console.log('----------------------------------------\n');
} else {
  console.warn(`Warning: Prompt file not found at ${promptFilePath}`);
}

// Configuration for summarization
const options = {
  model: config.ai.model,
  currency: config.currency.default,
  promptFile: config.ai.promptFile,
  // Use token-based chunking instead of chapter-based to avoid the "Invalid array length" error
  chunkingStrategy: 'token',
  // Set to true to see more detailed logs
  verbose: true
};

console.log('Starting summarization test...');
console.log(`Video ID: ${videoId}`);
console.log(`Model: ${options.model}`);
console.log(`Currency: ${options.currency}`);
console.log(`Prompt file: ${options.promptFile}`);
console.log(`Chunking strategy: ${options.chunkingStrategy}`);

// Run the summarization
summarizeTranscript(videoId, options)
  .then(result => {
    if (!result) {
      console.error('No result returned from summarizeTranscript');
      return;
    }
    
    console.log('\n=== SUMMARY GENERATED SUCCESSFULLY ===');
    
    if (result.text) {
      console.log('\nSummary Text:');
      console.log('----------------------------------------');
      console.log(result.text);
      console.log('----------------------------------------');
    } else {
      console.warn('Warning: No summary text in result');
    }
    
    if (result.usage) {
      console.log('\nToken Usage:');
      console.log(`- Input tokens: ${result.usage.promptTokens?.toLocaleString() || 'N/A'}`);
      console.log(`- Output tokens: ${result.usage.completionTokens?.toLocaleString() || 'N/A'}`);
      console.log(`- Total tokens: ${result.usage.totalTokens?.toLocaleString() || 'N/A'}`);
    } else {
      console.warn('Warning: No usage information in result');
    }
    
    if (result.cost) {
      console.log('\nCost Information:');
      console.log(`- Input cost: ${result.cost.inputCostFormatted || 'N/A'}`);
      console.log(`- Output cost: ${result.cost.outputCostFormatted || 'N/A'}`);
      console.log(`- Total cost: ${result.cost.totalCostFormatted || 'N/A'}`);
      console.log(`- Currency: ${result.cost.currency || 'N/A'}`);
    } else {
      console.warn('Warning: No cost information in result');
    }
    
    console.log(`\nProcessing time: ${result.processingTime || 'N/A'} seconds`);
  })
  .catch(error => {
    console.error('\n=== ERROR DURING SUMMARIZATION ===');
    console.error(error);
  });
