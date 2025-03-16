/**
 * Pure functions for fetching and processing YouTube video chapters
 */
import parseYouTubeChapters from 'get-youtube-chapters';
import https from 'https';
import { getVideoInfo } from './get-video-info.js';

/**
 * Formats timestamp in HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedHours = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

  return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
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
    // Set default options
    const chapterOffset = options.chapterOffset || 0;
    const skipFirstChapterOffset = options.skipFirstChapterOffset !== false;

    // Fetch video description
    const videoInfo = await getVideoInfo(videoId);
    const description = videoInfo.description;

    // Parse chapters from description
    const parsedChapters = parseYouTubeChapters(description);

    // console.log('Parsed chapters:', parsedChapters.length);
    console.log(`found ${parsedChapters.length} chapters`)
    

    // Process chapters
    const chapters = [];
    let totalDuration = 0;

    if (parsedChapters && parsedChapters.length > 0) {
      // Add offset to chapter start times if specified
      parsedChapters.forEach((chapter, index) => {
        // Apply offset to all chapters except the first one if skipFirstChapterOffset is true
        const shouldApplyOffset = !(index === 0 && skipFirstChapterOffset);
        const offset = shouldApplyOffset ? chapterOffset : 0;

        const startTime = Math.max(0, chapter.start + offset);
        const formattedStartTime = formatTimestamp(startTime);

        chapters.push({
          title: chapter.title,
          start: startTime,
          formattedStart: formattedStartTime
        });

        // Update total duration
        if (startTime > totalDuration) {
          totalDuration = startTime;
        }
      });

      // Sort chapters by start time (in case they're not already sorted)
      chapters.sort((a, b) => a.start - b.start);

      // Calculate durations for each chapter
      for (let i = 0; i < chapters.length; i++) {
        const nextChapterStart = i < chapters.length - 1 ? chapters[i + 1].start : null;
        
        if (nextChapterStart !== null) {
          chapters[i].duration = nextChapterStart - chapters[i].start;
          chapters[i].formattedDuration = formatTimestamp(chapters[i].duration);
        } else {
          // For the last chapter, we don't know the duration
          chapters[i].duration = null;
          chapters[i].formattedDuration = null;
        }
      }
    }

    // console.log(`Chapters for video ${videoId}:`, chapters);

    return {
      videoId,
      chapters,
      metadata: {
        totalChapters: chapters.length,
        totalDuration,
        formattedTotalDuration: formatTimestamp(totalDuration),
        hasChapters: chapters.length > 0
      }
    };
  } catch (error) {
    console.error(`Error getting chapters for video ${videoId}:`, error);
    
    // Return empty chapters on error
    return {
      videoId,
      chapters: [],
      metadata: {
        totalChapters: 0,
        totalDuration: 0,
        formattedTotalDuration: '00:00',
        hasChapters: false,
        error: error.message
      }
    };
  }
}

export {
  formatTimestamp,
  getChapters
};
