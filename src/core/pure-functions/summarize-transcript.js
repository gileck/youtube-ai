/**
 * Pure functions for summarizing transcripts
 */
const { extractVideoId } = require('./get-transcript');
const TranscriptSummarizer = require('../services/transcript-summarizer');

/**
 * Summarize a transcript using AI
 * @param {string} videoId - The YouTube video ID
 * @param {string} transcriptText - The transcript text to summarize
 * @param {Object} options - Options for summarization
 * @param {string} options.model - The AI model to use
 * @param {boolean} options.includeChapterBreakdown - Whether to include chapter breakdowns
 * @param {string} options.chunkingStrategy - Strategy for chunking the transcript
 * @param {boolean} options.parallelProcessing - Whether to process chunks in parallel
 * @param {number} options.maxConcurrentRequests - Maximum concurrent requests for parallel processing
 * @param {string} options.currency - Currency for cost calculation
 * @returns {Promise<Object>} - The generated summary result
 */
async function summarizeTranscript(videoId, transcriptText, options = {}) {
  try {
    // Create a new TranscriptSummarizer instance with the provided options
    const summarizer = new TranscriptSummarizer({
      model: options.model,
      includeChapterBreakdown: options.includeChapterBreakdown,
      chunkingStrategy: options.chunkingStrategy || 'chapter',
      parallelProcessing: options.parallelProcessing,
      maxConcurrentRequests: options.maxConcurrentRequests,
      currency: options.currency
    });

    // Call the summarize method from the TranscriptSummarizer class
    const summaryResult = await summarizer.summarize(transcriptText, options);

    // Return the result in the expected format for pure functions
    return {
      videoId,
      text: summaryResult.text,
      usage: summaryResult.usage,
      cost: summaryResult.cost,
      processingTime: summaryResult.processingTime,
      metadata: {
        options: {
          model: options.model || summarizer.config.model,
          includeChapterBreakdown: options.includeChapterBreakdown || summarizer.config.includeChapterBreakdown,
          chunkingStrategy: options.chunkingStrategy || summarizer.config.chunkingStrategy,
          parallelProcessing: options.parallelProcessing || summarizer.config.parallelProcessing,
          maxConcurrentRequests: options.maxConcurrentRequests || summarizer.config.maxConcurrentRequests,
          currency: options.currency || summarizer.config.currency
        }
      }
    };
  } catch (error) {
    console.error(`Error summarizing transcript for video ${videoId}:`, error.message);
    return {
      videoId,
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cost: { 
        inputCost: 0, 
        outputCost: 0, 
        totalCost: 0,
        inputCostFormatted: '$0.00',
        outputCostFormatted: '$0.00',
        totalCostFormatted: '$0.00'
      },
      processingTime: 0,
      metadata: {
        error: error.message
      }
    };
  }
}

module.exports = {
  summarizeTranscript
};
