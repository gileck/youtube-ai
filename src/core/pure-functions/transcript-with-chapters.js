/**
 * Pure functions for combining transcripts with chapters
 */
import { extractVideoId, getTranscript } from './get-transcript.js';
import { formatTimestamp, getChapters } from './get-chapters.js';

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
 * Organizes transcript content by chapters
 * @param {Array} combinedData - Combined transcript and chapters data
 * @returns {Object} - Object with chapter titles as keys and content as values
 */
function organizeContentByChapters(combinedData) {
  const chapterContent = {};
  let currentChapter = null;
  
  // First, identify all chapters and initialize with empty content
  for (const item of combinedData) {
    if (item.type === 'chapter') {
      const timestamp = formatTimestamp(item.start);
      const chapterTitle = `[${timestamp}] ${item.title}`;
      chapterContent[chapterTitle] = '';
    }
  }
  
  // Then populate content for each chapter
  for (const item of combinedData) {
    if (item.type === 'chapter') {
      const timestamp = formatTimestamp(item.start);
      currentChapter = `[${timestamp}] ${item.title}`;
    } else if (item.type === 'transcript' && currentChapter) {
      chapterContent[currentChapter] += `${item.text}\n`;
    }
  }
  
  // Trim whitespace from each chapter's content
  Object.keys(chapterContent).forEach(key => {
    chapterContent[key] = chapterContent[key].trim();
  });
  
  return chapterContent;
}

/**
 * Gets the transcript with chapters for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @param {Object} [transcriptData] - Optional: The transcript data from getTranscript
 * @param {Object} [chaptersData] - Optional: The chapters data from getChapters
 * @param {Object} [options] - Options for processing
 * @returns {Promise<Object>} - The transcript with chapters data and metadata
 */
async function getTranscriptWithChapters(videoId, transcriptData, chaptersData, options = {}) {
  try {
    // If transcriptData or chaptersData are not provided, fetch them
    if (!transcriptData) {
      transcriptData = await getTranscript(videoId);
    }
    
    if (!chaptersData) {
      chaptersData = await getChapters(videoId);
    }
    
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
    
    // Convert to formatted text (keeping for backward compatibility)
    const formattedText = convertToFormattedText(combinedData);
    
    // Organize content by chapters (new approach)
    const chapterContent = organizeContentByChapters(combinedData);
    
    // Create structured chapters array for processors
    const structuredChapters = Object.entries(chapterContent).map(([title, text]) => ({
      title: title.replace(/^\[\d+:\d+\] /, ''), // Remove timestamp prefix
      text
    }));

    return {
      videoId,
      transcript: formattedText,
      chapters: structuredChapters,
      combinedData,
      formattedText,
      chapterContent,
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
      transcript: '',
      chapters: [],
      combinedData: [],
      formattedText: '',
      chapterContent: {},
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

// Export all functions
export {
  shouldFilterChapter,
  combineTranscriptAndChapters,
  convertToFormattedText,
  organizeContentByChapters,
  getTranscriptWithChapters
};
