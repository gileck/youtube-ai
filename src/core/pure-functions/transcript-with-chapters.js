/**
 * Pure functions for combining transcripts with chapters
 */
const { extractVideoId } = require('./get-transcript');
const { formatTimestamp } = require('./get-chapters');

/**
 * Checks if a chapter should be filtered out based on regex patterns
 * @param {Object} chapter - Chapter object with title
 * @param {Object} options - Options for filtering
 * @returns {boolean} - True if chapter should be filtered out, false otherwise
 */
function shouldFilterChapter(chapter, options = {}) {
  const filters = options.chapterFilters || { enabled: false, patterns: [] };
  
  if (!filters.enabled || !filters.patterns || !filters.patterns.length) {
    return false;
  }

  for (const pattern of filters.patterns) {
    const regex = new RegExp(pattern);
    if (regex.test(chapter.title)) {
      return true;
    }
  }

  return false;
}

/**
 * Combines transcript and chapters data
 * @param {Array} transcriptData - The transcript data
 * @param {Array} chaptersData - The chapters data
 * @returns {Array} - Combined data with transcript segments organized by chapters
 */
function combineTranscriptAndChapters(transcriptData, chaptersData) {
  if (!transcriptData || !transcriptData.length || !chaptersData || !chaptersData.length) {
    return [];
  }

  const combinedData = [];

  // Add all chapters as markers first
  for (const chapter of chaptersData) {
    combinedData.push({
      type: 'chapter',
      title: chapter.title,
      start: chapter.start,
      end: chapter.end
    });
  }

  // Add transcript segments with chapter references
  for (const segment of transcriptData) {
    const segmentStart = segment.offset / 1000; // Convert to seconds
    const segmentEnd = (segment.offset + segment.duration) / 1000; // Convert to seconds

    // Find which chapter this segment belongs to
    let chapterIndex = -1;
    for (let i = 0; i < chaptersData.length; i++) {
      if (segmentStart >= chaptersData[i].start && 
          (chaptersData[i].end === Infinity || segmentStart < chaptersData[i].end)) {
        chapterIndex = i;
        break;
      }
    }

    combinedData.push({
      type: 'transcript',
      text: segment.text,
      start: segmentStart,
      end: segmentEnd,
      duration: segment.duration / 1000, // Convert to seconds
      chapterIndex: chapterIndex !== -1 ? chapterIndex : null,
      chapterTitle: chapterIndex !== -1 ? chaptersData[chapterIndex].title : null
    });
  }

  // Sort combined data by start time
  combinedData.sort((a, b) => a.start - b.start);

  return combinedData;
}

/**
 * Converts combined JSON data to formatted text with chapter headers
 * @param {Array} combinedData - Combined transcript and chapters data
 * @returns {string} - Formatted text
 */
function convertToFormattedText(combinedData) {
  let formattedText = '';
  let currentChapter = null;

  for (const item of combinedData) {
    if (item.type === 'chapter') {
      currentChapter = item;
      const timestamp = formatTimestamp(item.start);
      formattedText += `\n# [${timestamp}] ${item.title}\n\n`;
    } else if (item.type === 'transcript') {
      formattedText += `${item.text}\n`;
    }
  }

  return formattedText.trim();
}

/**
 * Gets the transcript with chapters for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @param {Object} transcriptData - The transcript data from getTranscript
 * @param {Object} chaptersData - The chapters data from getChapters
 * @param {Object} options - Options for processing
 * @returns {Object} - The transcript with chapters data and metadata
 */
function getTranscriptWithChapters(videoId, transcriptData, chaptersData, options = {}) {
  try {
    // Extract transcript and chapters from the input objects
    const transcript = transcriptData.transcript || [];
    const chapters = chaptersData.chapters || [];
    
    // Filter chapters if enabled
    let filteredChapters = chapters;
    if (options.chapterFilters && options.chapterFilters.enabled) {
      filteredChapters = chapters.filter(chapter => !shouldFilterChapter(chapter, options));
    }

    // Combine transcript and chapters
    const combinedData = combineTranscriptAndChapters(transcript, filteredChapters);
    
    // Convert to formatted text
    const formattedText = convertToFormattedText(combinedData);

    return {
      videoId,
      combinedData,
      formattedText,
      metadata: {
        transcriptSegments: transcript.length,
        chapters: filteredChapters.length,
        filteredChapters: chapters.length - filteredChapters.length,
        combinedItems: combinedData.length
      }
    };
  } catch (error) {
    console.error(`Error combining transcript and chapters: ${error.message}`);
    return {
      videoId,
      combinedData: [],
      formattedText: '',
      metadata: {
        transcriptSegments: 0,
        chapters: 0,
        filteredChapters: 0,
        combinedItems: 0,
        error: error.message
      }
    };
  }
}

module.exports = {
  shouldFilterChapter,
  combineTranscriptAndChapters,
  convertToFormattedText,
  getTranscriptWithChapters
};
