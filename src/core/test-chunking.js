const fs = require('fs');
const path = require('path');
const readline = require('readline');
const TextChunker = require('./utils/text-chunker');

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
 * Read a file line by line to avoid loading the entire file into memory
 * @param {string} filePath - Path to the file
 * @returns {Promise<string[]>} - Array of lines
 */
async function readFileLines(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  return lines;
}

/**
 * Find chapter markers in the transcript
 * @param {string[]} lines - Array of transcript lines
 * @param {RegExp} chapterPattern - Regex pattern for identifying chapter markers
 * @returns {Array<{title: string, lineIndex: number}>} - Array of chapter markers
 */
function findChapterMarkers(lines, chapterPattern) {
  const chapterMarkers = [];

  lines.forEach((line, index) => {
    if (chapterPattern.test(line)) {
      chapterMarkers.push({
        title: line,
        lineIndex: index
      });
    }
  });

  return chapterMarkers;
}

/**
 * Test the chunking strategies on a transcript file
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<void>}
 */
async function testChunking(videoId) {
  try {
    // Load configuration
    const config = {
      directories: {
        output: 'output'
      },
      chapterPattern: /^# \[\d{2}:\d{2}:\d{2}\].*$/,
      maxTokensPerChunk: 8000
    };

    // Check if the transcript file exists
    const transcriptPath = path.join(__dirname, '..', config.directories.output, `${videoId}-transcript-with-chapters.txt`);
    if (!fs.existsSync(transcriptPath)) {
      console.error(`Transcript file not found: ${transcriptPath}`);
      return;
    }

    // Read the transcript file line by line
    const lines = await readFileLines(transcriptPath);

    console.log(`\nTesting chunking strategies for video ${videoId}`);
    console.log(`Transcript length: ${lines.length} lines`);

    // Find chapter markers
    const chapterMarkers = findChapterMarkers(lines, config.chapterPattern);
    console.log(`Found ${chapterMarkers.length} chapter markers`);

    // Create debug directory
    const debugDir = path.join(__dirname, '..', 'debug', 'chunks');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }

    // Process each chapter
    console.log('\n--- Chapter-based Chunking ---');

    // If no chapters found, just show a message
    if (chapterMarkers.length === 0) {
      console.log('No chapters found in the transcript. Using fallback chunking.');

      // Create chunks of approximately 200 lines each
      const chunkSize = 200;
      const numChunks = Math.ceil(lines.length / chunkSize);

      console.log(`Creating ${numChunks} chunks of approximately ${chunkSize} lines each`);

      for (let i = 0; i < numChunks; i++) {
        const startLine = i * chunkSize;
        const endLine = Math.min((i + 1) * chunkSize, lines.length);
        const chunkLines = lines.slice(startLine, endLine);
        const chunkText = chunkLines.join('\n');

        console.log(`Chunk ${i + 1}: ${chunkLines.length} lines, approximately ${Math.ceil(chunkText.length / 4)} tokens`);
        console.log(`Preview: ${chunkText.substring(0, 100)}...`);

        // Save the chunk
        const chunkPath = path.join(debugDir, `${videoId}-fallback-chunk-${i + 1}.txt`);
        fs.writeFileSync(chunkPath, chunkText);
      }

      return;
    }

    // Process each chapter
    for (let i = 0; i < chapterMarkers.length; i++) {
      const startLine = chapterMarkers[i].lineIndex;
      const endLine = (i < chapterMarkers.length - 1) ? chapterMarkers[i + 1].lineIndex : lines.length;

      // Get chapter content
      const chapterLines = lines.slice(startLine, endLine);
      const chapterText = chapterLines.join('\n');

      // Estimate token count
      const estimatedTokens = Math.ceil(chapterText.length / 4);

      console.log(`Chapter ${i + 1}: "${chapterMarkers[i].title}"`);
      console.log(`  ${chapterLines.length} lines, approximately ${estimatedTokens} tokens`);
      console.log(`  Preview: ${chapterText.substring(0, 100)}...`);

      // Save the chapter
      const chapterPath = path.join(debugDir, `${videoId}-chapter-${i + 1}.txt`);
      fs.writeFileSync(chapterPath, chapterText);

      // If chapter is too large, split it further
      if (estimatedTokens > config.maxTokensPerChunk) {
        console.log(`  Chapter is too large (${estimatedTokens} tokens). Splitting into sub-chunks...`);

        // Split into sub-chunks of approximately 200 lines each
        const subChunkSize = 200;
        const numSubChunks = Math.ceil(chapterLines.length / subChunkSize);

        for (let j = 0; j < numSubChunks; j++) {
          const subStartLine = j * subChunkSize;
          const subEndLine = Math.min((j + 1) * subChunkSize, chapterLines.length);
          const subChunkLines = chapterLines.slice(subStartLine, subEndLine);
          const subChunkText = subChunkLines.join('\n');

          // Save the sub-chunk
          const subChunkPath = path.join(debugDir, `${videoId}-chapter-${i + 1}-subchunk-${j + 1}.txt`);
          fs.writeFileSync(subChunkPath, subChunkText);

          console.log(`    Sub-chunk ${j + 1}: ${subChunkLines.length} lines, approximately ${Math.ceil(subChunkText.length / 4)} tokens`);
        }
      }
    }

    console.log(`\nChunks saved to ${debugDir}`);

  } catch (error) {
    console.error(`Error testing chunking for video ${videoId}:`, error.message);
    console.error(error.stack);
  }
}

/**
 * Process a YouTube URL to test chunking
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

    // Test chunking
    await testChunking(videoId);

  } catch (error) {
    console.error(`Error processing URL ${url}:`, error.message);
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Check if a URL is provided as an argument
  const args = process.argv.slice(2);

  if (args.length > 0) {
    // Process the provided URL
    processYouTubeUrl(args[0]);
  } else {
    // Read the first URL from the youtube-urls.txt file
    try {
      const urlsFilePath = path.join(__dirname, '..', 'youtube-urls.txt');
      const fileContent = fs.readFileSync(urlsFilePath, 'utf-8');
      const urls = fileContent.split('\n').filter(url => url.trim() !== '');

      if (urls.length > 0) {
        processYouTubeUrl(urls[0]);
      } else {
        console.error('No URLs found in youtube-urls.txt');
      }
    } catch (error) {
      console.error('Error reading youtube-urls.txt:', error.message);
    }
  }
}
