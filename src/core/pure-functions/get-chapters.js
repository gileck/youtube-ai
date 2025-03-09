/**
 * Pure functions for fetching and processing YouTube video chapters
 */
const parseYouTubeChapters = require('get-youtube-chapters');
const https = require('https');

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
 * Fetches the video description from YouTube
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<string>} - The video description
 */
function getVideoDescription(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Try to extract the description from the HTML
          const descriptionMatch = data.match(/"description":{"simpleText":"(.*?)"}/);
          if (descriptionMatch && descriptionMatch[1]) {
            // Decode HTML entities
            const description = descriptionMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');

            resolve(description);
          } else {
            // Alternative method to extract description
            const altDescMatch = data.match(/<meta name="description" content="(.*?)">/);
            if (altDescMatch && altDescMatch[1]) {
              resolve(altDescMatch[1]);
            } else {
              resolve(''); // No description found
            }
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Formats timestamp in HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Gets chapters for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @param {Object} options - Options for chapter processing
 * @param {number} options.chapterOffset - Seconds to offset chapter start times (default: 0)
 * @param {boolean} options.skipFirstChapterOffset - Whether to skip offsetting the first chapter (default: true)
 * @returns {Promise<Object>} - The chapters data and metadata
 */
async function getChapters(videoId, options = {}) {
  try {
    // Default options
    const opts = {
      chapterOffset: options.chapterOffset || 0,
      skipFirstChapterOffset: options.skipFirstChapterOffset !== undefined ? options.skipFirstChapterOffset : true
    };

    // First get the video description
    const description = await getVideoDescription(videoId);

    // Parse chapters from the description
    const chapters = parseYouTubeChapters(description);

    // If no chapters found, create a default chapter
    if (!chapters || chapters.length === 0) {
      return {
        videoId,
        chapters: [{
          title: 'Full Video',
          start: 0,
          end: Infinity
        }],
        metadata: {
          totalChapters: 1,
          hasDefaultChapter: true,
          source: 'default'
        }
      };
    }

    // Apply chapter offset if specified
    if (opts.chapterOffset !== 0) {
      for (let i = 0; i < chapters.length; i++) {
        // Skip first chapter if skipFirstChapterOffset is true
        if (i === 0 && opts.skipFirstChapterOffset) {
          continue;
        }
        chapters[i].start += opts.chapterOffset;
      }
    }

    // Add end times to chapters
    for (let i = 0; i < chapters.length; i++) {
      if (i < chapters.length - 1) {
        chapters[i].end = chapters[i + 1].start;
      } else {
        chapters[i].end = Infinity; // Last chapter ends at the end of the video
      }
    }

    return {
      videoId,
      chapters,
      metadata: {
        totalChapters: chapters.length,
        hasDefaultChapter: false,
        source: 'youtube'
      }
    };
  } catch (error) {
    console.error(`Error fetching chapters for video ${videoId}:`, error.message);
    // Return a default chapter covering the whole video
    return {
      videoId,
      chapters: [{
        title: 'Full Video',
        start: 0,
        end: Infinity
      }],
      metadata: {
        totalChapters: 1,
        hasDefaultChapter: true,
        source: 'error',
        error: error.message
      }
    };
  }
}

module.exports = {
  extractVideoId,
  getVideoDescription,
  formatTimestamp,
  getChapters
};
