/**
 * Utility for chunking text to fit within token limits
 */
class TextChunker {
  /**
   * Split text into chunks of approximately equal size
   * @param {string} text - The text to split
   * @param {number} maxChunkSize - Maximum size of each chunk in characters
   * @param {number} overlap - Number of characters to overlap between chunks
   * @returns {string[]} - Array of text chunks
   */
  static splitIntoChunks(text, maxChunkSize = 4000, overlap = 200) {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      // Calculate end index for this chunk
      let endIndex = startIndex + maxChunkSize;

      // If this isn't the last chunk, try to find a good breaking point
      if (endIndex < text.length) {
        // Look for paragraph breaks, line breaks, or sentences to break at
        const breakPoints = [
          text.lastIndexOf('\n\n', endIndex), // Paragraph break
          text.lastIndexOf('\n', endIndex),   // Line break
          text.lastIndexOf('. ', endIndex),   // Sentence end
          text.lastIndexOf('? ', endIndex),   // Question end
          text.lastIndexOf('! ', endIndex),   // Exclamation end
          text.lastIndexOf(';', endIndex),    // Semicolon
          text.lastIndexOf(',', endIndex)     // Comma
        ];

        // Find the closest valid break point
        const validBreakPoints = breakPoints.filter(bp => bp > startIndex && bp < endIndex);

        if (validBreakPoints.length > 0) {
          // Use the furthest valid break point
          endIndex = Math.max(...validBreakPoints) + 1;
        } else {
          // If no good break point, just use a space if possible
          const lastSpace = text.lastIndexOf(' ', endIndex);
          if (lastSpace > startIndex) {
            endIndex = lastSpace + 1;
          }
          // Otherwise, just break at maxChunkSize
        }
      } else {
        endIndex = text.length;
      }

      // Extract the chunk
      chunks.push(text.substring(startIndex, endIndex));

      // Move start index for next chunk, accounting for overlap
      startIndex = Math.max(0, endIndex - overlap);
    }

    return chunks;
  }

  /**
   * Estimate the number of tokens in a text
   * This is a rough estimate based on the average of 4 characters per token
   * @param {string} text - The text to estimate tokens for
   * @returns {number} - Estimated number of tokens
   */
  static estimateTokenCount(text) {
    if (!text) return 0;
    // A rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Split text into chunks based on estimated token count
   * @param {string} text - The text to split
   * @param {number} maxTokensPerChunk - Maximum tokens per chunk
   * @param {number} overlapTokens - Number of tokens to overlap between chunks
   * @returns {string[]} - Array of text chunks
   */
  static splitByTokens(text, maxTokensPerChunk = 4000, overlapTokens = 200) {
    // Convert token counts to character counts (rough estimate)
    const charsPerToken = 4;
    const maxChunkSize = maxTokensPerChunk * charsPerToken;
    const overlap = overlapTokens * charsPerToken;

    return this.splitIntoChunks(text, maxChunkSize, overlap);
  }

  /**
   * Split text by chapter markers
   * @param {string} text - The text to split
   * @param {RegExp} chapterPattern - Regex pattern for identifying chapter markers
   * @param {number} maxTokensPerChunk - Maximum tokens per chunk (for fallback)
   * @returns {Array<{title: string, content: string}>} - Array of chapter chunks with titles
   */
  static splitByChapters(text, chapterPattern = /^# \[\d{2}:\d{2}:\d{2}\].*$/gm, maxTokensPerChunk = 8000) {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided to splitByChapters, falling back to empty array');
        return [];
      }

      // Find all chapter markers
      const chapterMarkers = [];
      
      try {
        const regex = new RegExp(chapterPattern);
        
        // Use String.matchAll instead of regex.exec in a loop to reduce memory usage
        const matches = [...text.matchAll(regex)];
        
        for (const match of matches) {
          if (match && match.index !== undefined) {
            chapterMarkers.push({
              title: match[0],
              index: match.index
            });
          }
        }
      } catch (regexError) {
        console.error('Error in regex matching:', regexError);
        // Fall back to token-based chunking
        const chunks = this.splitByTokens(text, maxTokensPerChunk);
        return chunks.map((chunk, index) => ({
          title: `Part ${index + 1}`,
          content: chunk
        }));
      }

      // If no chapters found, fall back to token-based chunking
      if (chapterMarkers.length === 0) {
        console.log('No chapters found, falling back to token-based chunking');
        const chunks = this.splitByTokens(text, maxTokensPerChunk);
        return chunks.map((chunk, index) => ({
          title: `Part ${index + 1}`,
          content: chunk
        }));
      }

      console.log(`Found ${chapterMarkers.length} chapters in text`);

      // Process chapters
      const chapters = [];

      for (let i = 0; i < chapterMarkers.length; i++) {
        const startIndex = chapterMarkers[i].index;
        const endIndex = (i < chapterMarkers.length - 1) ? chapterMarkers[i + 1].index : text.length;
        
        // Validate indices
        if (startIndex === undefined || endIndex === undefined || 
            startIndex < 0 || endIndex > text.length || 
            startIndex >= endIndex) {
          console.warn(`Invalid chapter boundaries: start=${startIndex}, end=${endIndex}, skipping chapter`);
          continue;
        }
        
        const chapterContent = text.substring(startIndex, endIndex);

        // Check if this chapter is too large
        const tokenCount = this.estimateTokenCount(chapterContent);

        if (tokenCount > maxTokensPerChunk) {
          // Split this chapter further
          try {
            const subChunks = this.splitByTokens(chapterContent, maxTokensPerChunk);
            subChunks.forEach((chunk, j) => {
              chapters.push({
                title: `${chapterMarkers[i].title} (Part ${j + 1})`,
                content: chunk
              });
            });
          } catch (chunkError) {
            console.error(`Error splitting large chapter: ${chunkError.message}`);
            // Add the chapter as is, even if it's too large
            chapters.push({
              title: `${chapterMarkers[i].title} (Oversized)`,
              content: chapterContent
            });
          }
        } else {
          chapters.push({
            title: chapterMarkers[i].title,
            content: chapterContent
          });
        }
      }

      // Ensure we have at least one chapter
      if (chapters.length === 0) {
        console.warn('No valid chapters found after processing, falling back to token-based chunking');
        const chunks = this.splitByTokens(text, maxTokensPerChunk);
        return chunks.map((chunk, index) => ({
          title: `Part ${index + 1}`,
          content: chunk
        }));
      }

      return chapters;
    } catch (error) {
      console.error('Error in splitByChapters:', error);
      // Fall back to token-based chunking as a last resort
      try {
        const chunks = this.splitByTokens(text, maxTokensPerChunk);
        return chunks.map((chunk, index) => ({
          title: `Part ${index + 1}`,
          content: chunk
        }));
      } catch (fallbackError) {
        console.error('Error in fallback chunking:', fallbackError);
        // Return a single chunk with the entire text as a last resort
        return [{
          title: 'Full Content',
          content: text.substring(0, Math.min(text.length, maxTokensPerChunk * 4)) // Limit size as a safety measure
        }];
      }
    }
  }
}

module.exports = TextChunker;
