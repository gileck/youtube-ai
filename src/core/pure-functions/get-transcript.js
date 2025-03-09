/**
 * Pure functions for fetching and processing YouTube video transcripts
 */
const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Extracts the video ID from a YouTube URL
 * @param {string} url - The YouTube URL
 * @returns {string|null} - The video ID or null if not found
 */
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Gets the transcript for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @param {object} [options] - Optional configuration
 * @returns {Promise<Object>} - The transcript data and metadata
 */
async function getTranscript(videoId, options = {}) {
  try {
    console.log(`Fetching transcript for video ID: ${videoId}`);

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Calculate total duration from the transcript
      let totalDuration = 0;
      if (transcript && transcript.length > 0) {
        const lastSegment = transcript[transcript.length - 1];
        totalDuration = lastSegment.offset + lastSegment.duration;
      }
      
      return {
        videoId,
        transcript,
        metadata: {
          totalSegments: transcript.length,
          totalDuration,
          source: 'youtube-transcript'
        }
      };
    } catch (transcriptError) {
      console.error(`Error fetching transcript from YouTube API: ${transcriptError.message}`);
      return {
        videoId,
        transcript: [],
        metadata: {
          totalSegments: 0,
          totalDuration: 0,
          source: 'error',
          error: transcriptError.message
        }
      };
    }
  } catch (error) {
    console.error(`Error in getTranscript: ${error.message}`);
    return {
      videoId,
      transcript: [],
      metadata: {
        totalSegments: 0,
        totalDuration: 0,
        source: 'error',
        error: error.message
      }
    };
  }
}

module.exports = {
  extractVideoId,
  getTranscript
};
