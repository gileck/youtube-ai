/**
 * Pure function for summarizing full transcript text
 */
const { createSummarizer, formatSummaryResult, createErrorResponse } = require('./utils');

/**
 * Summarize a full transcript text using AI
 * @param {string} videoId - The YouTube video ID
 * @param {string} transcriptText - The transcript text to summarize
 * @param {Object} options - Options for summarization
 * @param {string} options.model - The AI model to use
 * @param {boolean} options.includeChapterBreakdown - Whether to include chapter breakdowns
 * @param {string} options.chunkingStrategy - Strategy for chunking the transcript (defaults to 'token')
 * @param {boolean} options.parallelProcessing - Whether to process chunks in parallel
 * @param {number} options.maxConcurrentRequests - Maximum concurrent requests for parallel processing
 * @param {string} options.currency - Currency for cost calculation
 * @returns {Promise<Object>} - The generated summary result
 */
async function summarizeTranscript(videoId, transcriptText, options = {}) {
  try {
    // Validate input
    if (!transcriptText || typeof transcriptText !== 'string') {
      throw new Error('Invalid transcript text. Must be a non-empty string.');
    }

    // Create a summarizer instance with token-based chunking strategy
    const summarizer = createSummarizer({
      ...options,
      chunkingStrategy: 'token' // Override to ensure token-based chunking for full transcripts
    });

    // Call the summarize method with the transcript text
    const summaryResult = await summarizer.summarize(transcriptText, options);

    // Format and return the result
    return formatSummaryResult(videoId, summaryResult, options);
  } catch (error) {
    console.error(`Error summarizing transcript for video ${videoId}:`, error.message);
    return createErrorResponse(videoId, error);
  }
}

module.exports = {
  summarizeTranscript
};
