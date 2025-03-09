const fs = require('fs');
const path = require('path');
const { YoutubeTranscript } = require('youtube-transcript');
const parseYouTubeChapters = require('get-youtube-chapters');
const https = require('https');

// Default configuration
let config = {
  chapterOffset: 5,
  skipFirstChapterOffset: true,
  directories: {
    output: 'output',
    debug: {
      combined: 'debug/combined',
      transcripts: 'debug/transcripts',
      chapters: 'debug/chapters',
      json: 'debug/json'
    }
  }
};

try {
  // Load configuration using require
  const userConfig = require('../config.json');
  console.log('Loaded user config:', JSON.stringify(userConfig, null, 2));

  // Ensure the debug directories structure is preserved
  if (userConfig.directories && !userConfig.directories.debug) {
    userConfig.directories.debug = config.directories.debug;
  }

  // Merge configs, ensuring nested objects are properly merged
  config = {
    ...config,
    ...userConfig,
    directories: {
      ...config.directories,
      ...(userConfig.directories || {}),
      debug: {
        ...config.directories.debug,
        ...(userConfig.directories && userConfig.directories.debug ? userConfig.directories.debug : {})
      }
    }
  };

  console.log('Final merged configuration:', JSON.stringify(config, null, 2));
} catch (error) {
  console.log('No config.json found or error loading it. Using default configuration:', config);
  // Create default config file if it doesn't exist
  const configPath = path.join(__dirname, '..', 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Created default config.json file');
  }
}

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
 * @param {string} urlOrVideoId - The YouTube URL or video ID
 * @param {object} [configParam] - The configuration object (optional)
 * @returns {Promise<Array>} - The transcript data
 */
async function getTranscript(urlOrVideoId, configParam) {
  try {
    // Extract video ID if a URL was provided
    const videoId = urlOrVideoId.includes('youtube.com') || urlOrVideoId.includes('youtu.be') 
      ? extractVideoId(urlOrVideoId) 
      : urlOrVideoId;

    if (!videoId) {
      console.error(`Invalid YouTube URL or video ID: ${urlOrVideoId}`);
      return null;
    }

    console.log(`Fetching transcript for video ID: ${videoId}`);

    // Use provided config or default to the module's config
    const configToUse = configParam || config;

    // Ensure config has the required structure
    if (!configToUse.directories || !configToUse.directories.debug || !configToUse.directories.debug.transcripts) {
      console.log('Config missing required structure, using default paths');
      configToUse.directories = configToUse.directories || {};
      configToUse.directories.debug = configToUse.directories.debug || {};
      configToUse.directories.debug.transcripts = configToUse.directories.debug.transcripts || 'debug/transcripts';
    }

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`Successfully fetched transcript with ${transcript.length} segments`);
      return transcript;
    } catch (transcriptError) {
      console.error(`Error fetching transcript from YouTube API: ${transcriptError.message}`);
      return null;
    }
  } catch (error) {
    console.error(`Error in getTranscript: ${error.message}`);
    return null;
  }
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
 * Gets chapters for a YouTube video
 * @param {string} urlOrVideoId - The YouTube URL or video ID
 * @param {object} [configParam] - The configuration object (optional)
 * @returns {Promise<Array>} - The chapters data
 */
async function getVideoChapters(urlOrVideoId, configParam) {
  try {
    // Extract video ID if a URL was provided
    const videoId = urlOrVideoId.includes('youtube.com') || urlOrVideoId.includes('youtu.be') 
      ? extractVideoId(urlOrVideoId) 
      : urlOrVideoId;

    if (!videoId) {
      console.error(`Invalid YouTube URL or video ID: ${urlOrVideoId}`);
      return [{
        title: 'Full Video',
        start: 0,
        end: Infinity
      }];
    }

    console.log(`Fetching chapters for video ID: ${videoId}`);

    // Use provided config or default to the module's config
    const configToUse = configParam || config;

    // Ensure config has the required structure
    if (!configToUse.directories || !configToUse.directories.debug || !configToUse.directories.debug.chapters) {
      console.log('Config missing required structure, using default paths');
      configToUse.directories = configToUse.directories || {};
      configToUse.directories.debug = configToUse.directories.debug || {};
      configToUse.directories.debug.chapters = configToUse.directories.debug.chapters || 'debug/chapters';
    }

    try {
      // First get the video description
      const description = await getVideoDescription(videoId);

      // Parse chapters from the description
      const chapters = parseYouTubeChapters(description);

      // If no chapters found, create a default chapter
      if (!chapters || chapters.length === 0) {
        console.log('No chapters found in video description, using default chapter');
        return [{
          title: 'Full Video',
          start: 0,
          end: Infinity
        }];
      }

      console.log(`Found ${chapters.length} chapters in video description`);

      // Apply offset to chapter start times (except first chapter if configured)
      for (let i = 0; i < chapters.length; i++) {
        // Apply offset to all chapters except the first one if skipFirstChapterOffset is true
        if (i > 0 || !configToUse.skipFirstChapterOffset) {
          // Ensure start time doesn't go below 0
          chapters[i].start = Math.max(0, chapters[i].start - (configToUse.chapterOffset || 0));
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

      return chapters;
    } catch (chaptersError) {
      console.error(`Error parsing chapters: ${chaptersError.message}`);
      // Return a default chapter covering the whole video
      return [{
        title: 'Full Video',
        start: 0,
        end: Infinity
      }];
    }
  } catch (error) {
    console.error(`Error in getVideoChapters: ${error.message}`);
    // Return a default chapter covering the whole video
    return [{
      title: 'Full Video',
      start: 0,
      end: Infinity
    }];
  }
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
 * Combines transcript and chapters data
 * @param {Array} transcriptData - The transcript data
 * @param {Array} chaptersData - The chapters data
 * @returns {Array} - Combined data with transcript segments organized by chapters
 */
function combineTranscriptAndChapters(transcriptData, chaptersData) {
  // Validate input data
  if (!transcriptData || !Array.isArray(transcriptData) || transcriptData.length === 0) {
    console.error('Invalid transcript data provided to combineTranscriptAndChapters');
    return [];
  }

  if (!chaptersData || !Array.isArray(chaptersData) || chaptersData.length === 0) {
    console.error('Invalid chapters data provided to combineTranscriptAndChapters');
    // Create a default chapter
    chaptersData = [{
      title: 'Full Video',
      start: 0,
      end: Infinity
    }];
  }

  console.log(`Combining ${transcriptData.length} transcript segments with ${chaptersData.length} chapters`);

  // Create a combined data array with alternating chapter and transcript items
  const combinedData = [];

  // Add each chapter and its transcript segments
  for (const chapter of chaptersData) {
    // Add the chapter
    combinedData.push({
      type: 'chapter',
      title: chapter.title,
      start: chapter.start,
      end: chapter.end
    });

    // Find transcript segments that belong to this chapter
    const chapterSegments = transcriptData.filter(segment => {
      const segmentStart = segment.offset || 0;
      return segmentStart >= chapter.start && segmentStart < chapter.end;
    });

    // Add transcript segments
    for (const segment of chapterSegments) {
      combinedData.push({
        type: 'transcript',
        text: segment.text || '',
        start: segment.offset || 0,
        duration: segment.duration || 0
      });
    }
  }

  return combinedData;
}

/**
 * Saves combined data to a JSON file
 * @param {string} videoId - The YouTube video ID
 * @param {Array} combinedData - The combined transcript and chapters data
 * @param {object} [configParam] - The configuration object (optional)
 */
function saveCombinedData(videoId, combinedData, configParam) {
  try {
    // Use provided config or default to the module's config
    const configToUse = configParam || config;

    // Ensure config has the required structure
    if (!configToUse.directories || !configToUse.directories.debug) {
      console.log('Config missing required structure, using default paths');
      configToUse.directories = configToUse.directories || {};
      configToUse.directories.debug = configToUse.directories.debug || {};
      configToUse.directories.debug.json = configToUse.directories.debug.json || 'debug/json';
      configToUse.directories.debug.combined = configToUse.directories.debug.combined || 'debug/combined';
    }

    // Create debug/json directory if it doesn't exist
    const jsonDir = path.join(__dirname, '..', configToUse.directories.debug.json);
    console.log('Full JSON directory path:', jsonDir);

    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // Save combined data to JSON file
    const jsonPath = path.join(jsonDir, `${videoId}-combined.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(combinedData, null, 2));
    console.log(`Combined data saved to ${jsonPath}`);

    // Create debug/combined directory if it doesn't exist
    const combinedDir = path.join(__dirname, '..', configToUse.directories.debug.combined);
    console.log('Full combined directory path:', combinedDir);

    if (!fs.existsSync(combinedDir)) {
      fs.mkdirSync(combinedDir, { recursive: true });
    }

    // Save formatted combined data to text file
    const combinedPath = path.join(combinedDir, `${videoId}-combined.txt`);
    let formattedText = '';
    combinedData.forEach(item => {
      if (item.type === 'chapter') {
        const chapterStartFormatted = formatTimestamp(item.start);
        formattedText += `# [${chapterStartFormatted}] ${item.title}\n\n`;
      } else if (item.type === 'transcript') {
        formattedText += `${item.text} `;
      }
    });

    formattedText += '\n\n';

    fs.writeFileSync(combinedPath, formattedText);
    console.log(`Formatted combined data saved to ${combinedPath}`);
  } catch (error) {
    console.error(`Error saving combined data for video ${videoId}:`, error.message);
  }
}

/**
 * Main function to process YouTube URLs and combine transcript with chapters
 * @param {object} config - The configuration object
 */
async function processCombinedData(config) {
  try {
    // Read YouTube URLs from file
    const urlsFilePath = path.join(__dirname, '..', '..', 'youtube-urls.txt');
    console.log('Full URLs file path:', urlsFilePath);

    const fileContent = fs.readFileSync(urlsFilePath, 'utf-8');
    const urls = fileContent.split('\n').filter(url => url.trim() !== '');

    console.log(`Found ${urls.length} YouTube URLs to process`);

    // Process each URL
    for (const url of urls) {
      console.log(`Processing URL: ${url}`);

      // Extract video ID
      const videoId = extractVideoId(url);
      if (!videoId) {
        console.error(`Invalid YouTube URL: ${url}`);
        continue;
      }

      // Get transcript
      const transcriptData = await getTranscript(videoId, config);
      if (!transcriptData) {
        console.error(`Failed to get transcript for video: ${url}`);
        continue;
      }

      // Save transcript as JSON
      const jsonDir = path.join(__dirname, '..', config.directories.debug.json);
      if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
      }

      const jsonPath = path.join(jsonDir, `${videoId}-transcript.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(transcriptData, null, 2));

      // Get chapters
      const chaptersData = await getVideoChapters(videoId, config);

      // Combine transcript and chapters
      const combinedData = combineTranscriptAndChapters(transcriptData, chaptersData);

      // Save combined data
      saveCombinedData(videoId, combinedData, config);

      console.log(`Successfully processed video: ${url}`);
    }

    console.log('All URLs processed successfully');
  } catch (error) {
    console.error('Error processing YouTube URLs:', error);
  }
}

// Execute the main function only if this script is run directly (not imported)
if (require.main === module) {
  processCombinedData(config);
}

async function getTranscriptWithChapters(url, config) {
  // Extract video ID
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.error(`Invalid YouTube URL: ${url}`);
    return;
  }

  // Get transcript
  const transcriptData = await getTranscript(videoId, config);
  if (!transcriptData) {
    console.error(`Failed to get transcript for video: ${url}`);
    return;
  }

  // Get chapters
  const chaptersData = await getVideoChapters(videoId, config);

  // Combine transcript and chapters
  const combinedData = combineTranscriptAndChapters(transcriptData, chaptersData);
  return combinedData;
}

// Export functions for potential reuse
module.exports = {
  extractVideoId,
  getTranscript,
  getVideoChapters,
  combineTranscriptAndChapters,
  saveCombinedData,
  processCombinedData,
  config,
  getTranscriptWithChapters
};
