const fs = require('fs');
const path = require('path');
const { YoutubeTranscript } = require('youtube-transcript');

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
    console.log('Loaded configuration for JSON transcript extraction');
  } else {
    console.log('No config.json found. Using default configuration for JSON transcript extraction');
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
 * Gets the transcript for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<Array>} - The transcript data
 */
async function getTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript;
  } catch (error) {
    throw error
    // console.error(`Error fetching transcript for video ${videoId}:`, error.message);
    return null;
  }
}

/**
 * Saves transcript data to a JSON file
 * @param {string} videoId - The YouTube video ID
 * @param {Array} transcriptData - The transcript data
 */
function saveTranscriptToJson(videoId, transcriptData) {
  // Create json directory if it doesn't exist
  const jsonDir = path.join(__dirname, '..', config.directories.debug.json);
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  const filePath = path.join(jsonDir, `${videoId}-transcript.json`);

  // Format the JSON with indentation for readability
  const jsonContent = JSON.stringify(transcriptData, null, 2);

  fs.writeFileSync(filePath, jsonContent);
  console.log(`Transcript JSON saved to ${filePath}`);
}

/**
 * Processes a YouTube URL to extract and save the transcript as JSON
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

    // Get transcript
    const transcriptData = await getTranscript(videoId);
    if (!transcriptData) {
      console.error(`Failed to get transcript for video: ${url}`);
      return;
    }

    // Save transcript as JSON
    saveTranscriptToJson(videoId, transcriptData);

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
  getTranscript,
  saveTranscriptToJson,
  processYouTubeUrl,
  processUrlsFromFile
};

// If this script is run directly (not imported)
if (require.main === module) {
  const urlsFilePath = path.join(__dirname, '..', 'youtube-urls.txt');
  processUrlsFromFile(urlsFilePath);
}
