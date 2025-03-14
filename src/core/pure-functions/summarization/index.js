/**
 * Index file for summarization pure functions
 */
const { summarizeChapters } = require('./summarize-chapters');
const { summarizeTranscript } = require('./summarize-transcript');

module.exports = {
  summarizeChapters,
  summarizeTranscript
};
