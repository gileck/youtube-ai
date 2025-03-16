/**
 * Index file for pure functions
 * Exports all pure functions from the modules
 */

import { extractVideoId as extractVideoIdTranscript, getTranscript } from './get-transcript.js';
import {
  formatTimestamp,
  getChapters
} from './get-chapters.js';
import {
  shouldFilterChapter,
  combineTranscriptAndChapters,
  convertToFormattedText,
  organizeContentByChapters,
  getTranscriptWithChapters
} from './transcript-with-chapters.js';
import { summarizeTranscript } from './summarize-transcript.js';
import {
  getVideoInfo,
  extractVideoId as extractVideoIdInfo
} from './get-video-info.js';
import {
  summarizeChapters
} from './summarization/index.js';

// Export a unified extractVideoId function
function extractVideoId(url) {
  return extractVideoIdTranscript(url);
}

// Export all functions
export {
  // Export unified extractVideoId
  extractVideoId,

  // Export functions from get-transcript.js
  getTranscript,

  // Export functions from get-chapters.js
  formatTimestamp,
  getChapters,

  // Export functions from transcript-with-chapters.js
  shouldFilterChapter,
  combineTranscriptAndChapters,
  convertToFormattedText,
  organizeContentByChapters,
  getTranscriptWithChapters,

  // Export legacy summarize-transcript.js (deprecated)
  summarizeTranscript,

  // Export new summarization functions
  summarizeChapters,

  // Export functions from get-video-info.js
  getVideoInfo
};
