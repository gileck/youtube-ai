const fs = require('fs');
const path = require('path');
const parseYouTubeChapters = require('get-youtube-chapters');
const https = require('https');

// Load configuration
let config = {
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
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(configData);
    config = { ...config, ...parsedConfig };
    console.log('Loaded configuration for chapter extraction');
  } else {
    console.log('No config.json found. Using default configuration for chapter extraction');
  }
} catch (error) {
  throw error
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
 * @returns {Promise<Array>} - The chapters data
 */
async function getVideoChapters(videoId) {
  try {
    // First get the video description
    const description = await getVideoDescription(videoId);

    // Parse chapters from the description
    const chapters = parseYouTubeChapters(description);

    // If no chapters found, create a default chapter
    if (!chapters || chapters.length === 0) {
      return [{
        title: 'Full Video',
        start: 0,
        end: Infinity
      }];
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
  } catch (error) {
    throw error
    console.error(`Error fetching chapters for video ${videoId}:`, error.message);
    // Return a default chapter covering the whole video
    return [{
      title: 'Full Video',
      start: 0,
      end: Infinity
    }];
  }
}

/**
 * Saves chapters to a file
 * @param {string} videoId - The YouTube video ID
 * @param {Array} chaptersData - The chapters data
 */
function saveChapters(videoId, chaptersData) {
  // Create chapters directory if it doesn't exist
  const chaptersDir = path.join(__dirname, '..', config.directories.debug.chapters);
  if (!fs.existsSync(chaptersDir)) {
    fs.mkdirSync(chaptersDir, { recursive: true });
  }

  const filePath = path.join(chaptersDir, `${videoId}-chapters.txt`);

  // Format chapters for readability
  let chaptersText = '';
  chaptersData.forEach(chapter => {
    const timestamp = formatTimestamp(chapter.start);
    chaptersText += `[${timestamp}] ${chapter.title}\n`;
  });

  fs.writeFileSync(filePath, chaptersText);
  console.log(`Chapters saved to ${filePath}`);
}

/**
 * Processes a YouTube URL to extract and save the chapters
 * @param {string} url - The YouTube URL
 * @returns {Promise<void>}
 */
async function processYouTubeUrl(url) {
  try {
    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error(`Invalid YouTube URL: ${url}`);
      return;
    }

    // Get chapters
    const chaptersData = await getVideoChapters(videoId);
    if (!chaptersData) {
      console.error(`Failed to get chapters for video: ${url}`);
      return;
    }

    // Save chapters
    saveChapters(videoId, chaptersData);

    console.log(`Successfully processed video: ${url}`);
  } catch (error) {
    console.error(`Error processing URL ${url}:`, error.message);
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
      await processYouTubeUrl(url);
    }

    console.log('All URLs processed');
  } catch (error) {
    console.error('Error processing URLs from file:', error.message);
  }
}

// Export functions for potential reuse
module.exports = {
  extractVideoId,
  getVideoDescription,
  getVideoChapters,
  saveChapters,
  processYouTubeUrl,
  processUrlsFromFile
};

// If this script is run directly (not imported)
if (require.main === module) {
  const urlsFilePath = path.join(__dirname, '..', 'youtube-urls.txt');
  processUrlsFromFile(urlsFilePath);
}
