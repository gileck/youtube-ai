/**
 * Index file for pure functions
 * Exports all pure functions from the modules
 */

const { extractVideoId: extractVideoIdTranscript, getTranscript } = require('./get-transcript');
const { 
  formatTimestamp, 
  getChapters
} = require('./get-chapters');
const { 
  shouldFilterChapter, 
  combineTranscriptAndChapters, 
  convertToFormattedText,
  organizeContentByChapters,
  getTranscriptWithChapters 
} = require('./transcript-with-chapters');
const { summarizeTranscript } = require('./summarize-transcript');
const {
  getVideoInfo,
  extractVideoId: extractVideoIdInfo
} = require('./get-video-info');
const {
  summarizeChapters
} = require('./summarization');

// Export a unified extractVideoId function
function extractVideoId(url) {
  return extractVideoIdTranscript(url);
}

module.exports = {
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
