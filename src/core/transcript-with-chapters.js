const fs = require('fs');
const path = require('path');
const {
  extractVideoId,
  getTranscript,
  getVideoChapters,
  combineTranscriptAndChapters
} = require('./combine-transcript-chapters');
const appConfig = require('../config');

// Default configuration with settings from centralized config
const config = {
  chapterOffset: appConfig.youtube.chapterOffset || 0,
  skipFirstChapterOffset: appConfig.youtube.skipFirstChapterOffset || true,
  chapterFilters: appConfig.youtube.chapterFilters || {
    enabled: false,
    patterns: []
  },
  paths: {
    output: appConfig.paths.output || 'output'
  }
};

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
 * Checks if a chapter should be filtered out based on regex patterns
 * @param {Object} chapter - Chapter object with title
 * @returns {boolean} - True if chapter should be filtered out, false otherwise
 */
function shouldFilterChapter(chapter) {
  if (!config.chapterFilters.enabled || !config.chapterFilters.patterns.length) {
    return false;
  }

  for (const pattern of config.chapterFilters.patterns) {
    const regex = new RegExp(pattern);
    if (regex.test(chapter.title)) {
      return true;
    }
  }

  return false;
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
 * Processes a YouTube URL to create a formatted transcript text file with chapter headers
 * @param {string} url - The YouTube URL
 * @param {object} [customConfig] - Optional custom configuration
 * @returns {Promise<string|null>} - Path to the generated file or null if failed
 */
async function createTranscriptWithChapters(url, customConfig = {}) {
  try {
    // Merge custom config with default config
    const mergedConfig = {
      ...config,
      ...customConfig,
      chapterFilters: {
        ...config.chapterFilters,
        ...(customConfig.chapterFilters || {})
      },
      paths: {
        ...config.paths,
        ...(customConfig.paths || {})
      }
    };

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error(`Invalid YouTube URL: ${url}`);
      return null;
    }

    console.log(`Processing video ${videoId}...`);

    // Get transcript
    console.log('Fetching transcript...');
    const transcript = await getTranscript(url);
    if (!transcript) {
      console.error('Failed to get transcript');
      return null;
    }

    // Get chapters
    console.log('Fetching chapters...');
    const chapters = await getVideoChapters(url, {
      chapterOffset: mergedConfig.chapterOffset,
      skipFirstChapterOffset: mergedConfig.skipFirstChapterOffset
    });

    // Filter chapters if enabled
    let filteredChapters = chapters;
    if (mergedConfig.chapterFilters.enabled && mergedConfig.chapterFilters.patterns.length > 0) {
      filteredChapters = chapters.filter(chapter => !shouldFilterChapter(chapter));
      console.log(`Filtered ${chapters.length - filteredChapters.length} chapters`);
    }

    // Combine transcript and chapters
    console.log('Combining transcript and chapters...');
    const combinedData = combineTranscriptAndChapters(transcript, filteredChapters);

    // Convert to formatted text
    const formattedText = convertToFormattedText(combinedData);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), mergedConfig.paths.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save formatted text to file
    const outputPath = path.join(outputDir, `${videoId}-transcript-with-chapters.txt`);
    fs.writeFileSync(outputPath, formattedText);

    console.log(`Saved formatted transcript to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error creating transcript with chapters:', error.message);
    return null;
  }
}

/**
 * Gets the transcript with chapters as a string
 * @param {string} url - The YouTube URL
 * @param {object} [customConfig] - Optional custom configuration
 * @returns {Promise<string|null>} - The transcript text with chapters or null if failed
 */
async function getTranscriptWithChapters(url, customConfig = {}) {
  try {
    // Merge custom config with default config
    const mergedConfig = {
      ...config,
      ...customConfig,
      chapterFilters: {
        ...config.chapterFilters,
        ...(customConfig.chapterFilters || {})
      },
      paths: {
        ...config.paths,
        ...(customConfig.paths || {})
      }
    };

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error(`Invalid YouTube URL: ${url}`);
      return null;
    }

    // Get transcript
    const transcript = await getTranscript(url);
    if (!transcript) {
      console.error('Failed to get transcript');
      return null;
    }

    // Get chapters
    const chapters = await getVideoChapters(url, {
      chapterOffset: mergedConfig.chapterOffset,
      skipFirstChapterOffset: mergedConfig.skipFirstChapterOffset
    });

    // Filter chapters if enabled
    let filteredChapters = chapters;
    if (mergedConfig.chapterFilters.enabled && mergedConfig.chapterFilters.patterns.length > 0) {
      filteredChapters = chapters.filter(chapter => !shouldFilterChapter(chapter));
    }

    // Combine transcript and chapters
    const combinedData = combineTranscriptAndChapters(transcript, filteredChapters);

    // Convert to formatted text
    return convertToFormattedText(combinedData);
  } catch (error) {
    console.error('Error getting transcript with chapters:', error.message);
    return null;
  }
}

/**
 * Processes YouTube URLs from a file
 * @param {string} filePath - Path to the file containing YouTube URLs
 * @returns {Promise<void>}
 */
async function processUrlsFromFile(filePath) {
  try {
    // Read URLs from file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const urls = fileContent.split('\n').filter(url => url.trim() !== '');

    console.log(`Found ${urls.length} YouTube URLs to process`);

    // Process each URL
    for (const url of urls) {
      console.log(`Processing URL: ${url}`);
      await createTranscriptWithChapters(url);
    }

    console.log('All URLs processed');
  } catch (error) {
    console.error('Error processing URLs from file:', error.message);
  }
}

// Export functions for potential reuse
module.exports = {
  createTranscriptWithChapters,
  processUrlsFromFile,
  getTranscriptWithChapters,
  shouldFilterChapter,
  convertToFormattedText,
  formatTimestamp
};

// If this script is run directly (not imported)
if (require.main === module) {
  const urlsFilePath = path.join(__dirname, '..', '..', 'youtube-urls.txt');
  processUrlsFromFile(urlsFilePath);
}
