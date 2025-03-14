/**
 * Shared utilities for transcript summarization
 */
const TranscriptSummarizer = require('../../services/transcript-summarizer');

/**
 * Create a summarizer instance with the provided options
 * @param {Object} options - Options for the summarizer
 * @returns {TranscriptSummarizer} - The summarizer instance
 */
function createSummarizer(options = {}) {
  return new TranscriptSummarizer({
    model: options.model,
    includeChapterBreakdown: options.includeChapterBreakdown,
    chunkingStrategy: options.chunkingStrategy || 'chapter',
    parallelProcessing: options.parallelProcessing,
    maxConcurrentRequests: options.maxConcurrentRequests,
    currency: options.currency
  });
}

/**
 * Format the summary result into a standardized response
 * @param {string} videoId - The YouTube video ID
 * @param {Object} summaryResult - The result from the summarizer
 * @param {Object} options - The options used for summarization
 * @returns {Object} - Standardized summary response
 */
function formatSummaryResult(videoId, summaryResult, options = {}) {
  return {
    videoId,
    text: summaryResult.text,
    usage: summaryResult.usage,
    cost: summaryResult.cost,
    processingTime: summaryResult.processingTime,
    metadata: {
      options: {
        model: options.model || summaryResult.metadata?.options?.model,
        includeChapterBreakdown: options.includeChapterBreakdown || summaryResult.metadata?.options?.includeChapterBreakdown,
        chunkingStrategy: options.chunkingStrategy || summaryResult.metadata?.options?.chunkingStrategy,
        parallelProcessing: options.parallelProcessing || summaryResult.metadata?.options?.parallelProcessing,
        maxConcurrentRequests: options.maxConcurrentRequests || summaryResult.metadata?.options?.maxConcurrentRequests,
        currency: options.currency || summaryResult.metadata?.options?.currency
      }
    }
  };
}

/**
 * Create an error response for failed summarization
 * @param {string} videoId - The YouTube video ID
 * @param {Error} error - The error that occurred
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(videoId, error) {
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

module.exports = {
  createSummarizer,
  formatSummaryResult,
  createErrorResponse
};
