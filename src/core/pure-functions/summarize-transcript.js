/**
 * Pure functions for summarizing transcripts
 * @deprecated Use the new summarization functions from './summarization' instead
 */
import { extractVideoId } from './get-transcript.js';
import { summarizeChapters } from './summarization/index.js';
import { summarizeTranscript as summarizeFullTranscript } from './summarization/summarize-transcript.js';

/**
 * Summarize a transcript using AI
 * @deprecated Use summarizeChapters or summarizeTranscript from './summarization' instead
 * @param {string} videoId - The YouTube video ID
 * @param {string|Object} transcriptData - The transcript text or transcript with chapters object
 * @param {Object} options - Options for summarization
 * @param {string} options.model - The AI model to use
 * @param {boolean} options.includeChapterBreakdown - Whether to include chapter breakdowns
 * @param {string} options.chunkingStrategy - Strategy for chunking the transcript
 * @param {boolean} options.parallelProcessing - Whether to process chunks in parallel
 * @param {number} options.maxConcurrentRequests - Maximum concurrent requests for parallel processing
 * @param {string} options.currency - Currency for cost calculation
 * @returns {Promise<Object>} - The generated summary result
 */
async function summarizeTranscript(videoId, transcriptData, options = {}) {
  try {
    // Determine if we have a structured transcript with chapters or just text
    const hasChapterContent = transcriptData && 
                             typeof transcriptData === 'object' && 
                             transcriptData.chapterContent && 
                             Object.keys(transcriptData.chapterContent).length > 0;
    
    if (hasChapterContent) {
      // Use chapter-based summarization if we have chapters
      console.log(`[DEPRECATED] Using chapter-based summarization with ${Object.keys(transcriptData.chapterContent).length} chapters`);
      console.log('Consider using summarizeChapters from "./summarization" directly');
      return await summarizeChapters(videoId, transcriptData.chapterContent, options);
    } else {
      // Use full transcript summarization
      const contentToSummarize = typeof transcriptData === 'string' 
        ? transcriptData 
        : (transcriptData.formattedText || JSON.stringify(transcriptData));
      
      console.log('[DEPRECATED] Using full transcript summarization');
      console.log('Consider using summarizeTranscript from "./summarization" directly');
      return await summarizeFullTranscript(videoId, contentToSummarize, options);
    }
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

export {
  summarizeTranscript
};
