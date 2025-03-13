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
  getTranscriptWithChapters 
} = require('./transcript-with-chapters');
const { summarizeTranscript } = require('./summarize-transcript');
const {
  getVideoInfo,
  extractVideoId: extractVideoIdInfo
} = require('./get-video-info');

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
  getTranscriptWithChapters,
  
  // Export functions from summarize-transcript.js
  summarizeTranscript,
  
  // Export functions from get-video-info.js
  getVideoInfo
};
