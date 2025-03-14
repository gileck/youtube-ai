/**
 * Pure functions for summarizing transcript chapters
 */
const ChapterSummarizer = require('../../services/chapter-summarizer');
const { formatSummaryResult, createErrorResponse } = require('./utils');
const ModelManager = require('../../utils/model-manager');

/**
 * Summarize transcript chapters using AI
 * @param {string} videoId - The YouTube video ID
 * @param {Object} chapterContent - Object with chapter titles as keys and chapter content as values
 * @param {Object} options - Options for summarization
 * @param {string} options.model - The AI model to use
 * @param {boolean} options.includeChapterBreakdown - Whether to include chapter breakdowns
 * @param {boolean} options.parallelProcessing - Whether to process chunks in parallel
 * @param {number} options.maxConcurrentRequests - Maximum concurrent requests for parallel processing
 * @param {string} options.currency - Currency for cost calculation
 * @param {Object} options.videoMetadata - Optional video metadata (title, description)
 * @returns {Promise<Object>} - The generated summary result
 */
async function summarizeChapters(videoId, chapterContent, options = {}) {
  try {
    // Validate input
    if (!chapterContent || typeof chapterContent !== 'object' || Object.keys(chapterContent).length === 0) {
      throw new Error('Invalid chapter content. Must be an object with chapter titles as keys and content as values.');
    }

    // Get the model name (standardized format)
    const modelName = options.model 
      ? ModelManager.standardizeModelName(options.model) 
      : ModelManager.getDefaultModelName();

    // Create a chapter summarizer instance
    const chapterSummarizer = new ChapterSummarizer({
      model: modelName,
      includeChapterBreakdown: options.includeChapterBreakdown,
      parallelProcessing: options.parallelProcessing,
      maxConcurrentRequests: options.maxConcurrentRequests,
      currency: options.currency || 'ILS',
      includeVideoMetadata: options.includeVideoMetadata !== false
    });

    // Extract video metadata from options if available
    const videoMetadata = options.videoMetadata || null;

    // Call the summarizeChapters method with chapter content and video metadata
    const summaryResult = await chapterSummarizer.summarizeChapters(chapterContent, options, videoMetadata);

    // Format and return the result
    return formatSummaryResult(videoId, summaryResult, options);
  } catch (error) {
    console.error(`Error summarizing chapters for video ${videoId}:`, error.message);
    return createErrorResponse(videoId, error);
  }
}

module.exports = {
  summarizeChapters
};
