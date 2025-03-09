# YouTube AI Pure Functions

This directory contains pure functions for processing YouTube video transcripts, chapters, and generating summaries. These functions are designed to be modular, testable, and free from side effects like file I/O or configuration loading.

## Available Functions

### Video ID Extraction

```javascript
const { extractVideoId } = require('./pure-functions');
const videoId = extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// Returns: 'dQw4w9WgXcQ'
```

### Transcript Processing

```javascript
const { getTranscript } = require('./pure-functions');
const transcriptData = await getTranscript('dQw4w9WgXcQ');
// Returns: { videoId, transcript, metadata }
```

### Chapter Processing

```javascript
const { getChapters } = require('./pure-functions');
const chaptersData = await getChapters('dQw4w9WgXcQ', {
  chapterOffset: 5,
  skipFirstChapterOffset: true
});
// Returns: { videoId, chapters, metadata }
```

### Combining Transcript with Chapters

```javascript
const { getTranscriptWithChapters } = require('./pure-functions');
const combined = getTranscriptWithChapters(
  videoId, 
  transcriptData, 
  chaptersData, 
  {
    chapterFilters: { enabled: true, patterns: ['Sponsor:.*'] }
  }
);
// Returns: { videoId, combinedData, formattedText, metadata }
```

### Summarizing Transcripts

```javascript
const { summarizeTranscript } = require('./pure-functions');
const summary = await summarizeTranscript(
  videoId, 
  transcriptText, 
  {
    model: 'gpt-4',
    includeChapterBreakdown: true,
    chunkingStrategy: 'semantic',
    parallelProcessing: true,
    maxConcurrentRequests: 3,
    currency: 'USD'
  }
);
// Returns: { videoId, text, usage, cost, processingTime, metadata }
```

## Function Return Values

All functions return structured objects with consistent fields:

1. Primary data (transcript, chapters, etc.)
2. Metadata about the operation
3. Error information when applicable

## Error Handling

All functions handle errors gracefully and return structured error information rather than throwing exceptions. This makes them safer to use in production environments.

## Testing

Comprehensive tests are available in the `/tests/core/pure-functions` directory. Run them with:

```bash
npm test
```

## Usage Examples

### Basic Usage

```javascript
const { 
  extractVideoId, 
  getTranscript, 
  getChapters, 
  getTranscriptWithChapters, 
  summarizeTranscript 
} = require('./pure-functions');

async function processVideo(youtubeUrl) {
  // Extract video ID
  const videoId = extractVideoId(youtubeUrl);
  
  // Get transcript and chapters
  const transcriptData = await getTranscript(videoId);
  const chaptersData = await getChapters(videoId);
  
  // Combine transcript with chapters
  const combined = getTranscriptWithChapters(videoId, transcriptData, chaptersData);
  
  // Generate summary
  const summary = await summarizeTranscript(videoId, combined.formattedText);
  
  return summary;
}
```

### Advanced Usage with Options

```javascript
async function processVideoAdvanced(youtubeUrl, options) {
  const videoId = extractVideoId(youtubeUrl);
  
  const transcriptData = await getTranscript(videoId);
  const chaptersData = await getChapters(videoId, {
    chapterOffset: options.chapterOffset || 0,
    skipFirstChapterOffset: options.skipFirstChapterOffset
  });
  
  const combined = getTranscriptWithChapters(videoId, transcriptData, chaptersData, {
    chapterFilters: options.chapterFilters
  });
  
  const summary = await summarizeTranscript(videoId, combined.formattedText, {
    model: options.model,
    includeChapterBreakdown: options.includeChapterBreakdown,
    chunkingStrategy: options.chunkingStrategy,
    parallelProcessing: options.parallelProcessing,
    maxConcurrentRequests: options.maxConcurrentRequests,
    currency: options.currency
  });
  
  return summary;
}
```
