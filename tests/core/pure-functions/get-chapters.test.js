/**
 * Tests for the get-chapters.js pure functions
 */
const { extractVideoId, formatTimestamp, getChapters } = require('../../../src/core/pure-functions/get-chapters');
const parseYouTubeChapters = require('get-youtube-chapters');

// Mock dependencies
jest.mock('get-youtube-chapters');
jest.mock('https', () => ({
  get: jest.fn((url, callback) => {
    const res = {
      on: jest.fn((event, handler) => {
        if (event === 'data') {
          handler('mock data');
        }
        if (event === 'end') {
          handler();
        }
        return res;
      })
    };
    callback(res);
    return {
      on: jest.fn((event, handler) => {})
    };
  })
}));

describe('extractVideoId', () => {
  test('extracts video ID from a standard YouTube URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('extracts video ID from a shortened YouTube URL', () => {
    const url = 'https://youtu.be/dQw4w9WgXcQ';
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid YouTube URL', () => {
    const url = 'https://example.com';
    expect(extractVideoId(url)).toBeNull();
  });
});

describe('formatTimestamp', () => {
  test('formats seconds to HH:MM:SS correctly', () => {
    expect(formatTimestamp(0)).toBe('00:00:00');
    expect(formatTimestamp(61)).toBe('00:01:01');
    expect(formatTimestamp(3661)).toBe('01:01:01');
  });

  test('handles large values', () => {
    expect(formatTimestamp(86400)).toBe('24:00:00');
  });
});

describe('getChapters', () => {
  beforeEach(() => {
    // Reset mocks
    parseYouTubeChapters.mockReset();
  });

  test('returns default chapter when no chapters are found', async () => {
    parseYouTubeChapters.mockReturnValue([]);
    
    const result = await getChapters('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe('Full Video');
    expect(result.chapters[0].start).toBe(0);
    expect(result.chapters[0].end).toBe(Infinity);
    expect(result.metadata.hasDefaultChapter).toBe(true);
  });

  test('processes chapters correctly', async () => {
    parseYouTubeChapters.mockReturnValue([
      { title: 'Intro', start: 0 },
      { title: 'Chapter 1', start: 60 },
      { title: 'Chapter 2', start: 120 }
    ]);
    
    const result = await getChapters('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.chapters).toHaveLength(3);
    expect(result.chapters[0].title).toBe('Intro');
    expect(result.chapters[0].start).toBe(0);
    expect(result.chapters[0].end).toBe(60);
    expect(result.chapters[1].title).toBe('Chapter 1');
    expect(result.chapters[1].start).toBe(60);
    expect(result.chapters[1].end).toBe(120);
    expect(result.chapters[2].title).toBe('Chapter 2');
    expect(result.chapters[2].start).toBe(120);
    expect(result.chapters[2].end).toBe(Infinity);
    expect(result.metadata.hasDefaultChapter).toBe(false);
  });

  test('applies chapter offset correctly', async () => {
    parseYouTubeChapters.mockReturnValue([
      { title: 'Intro', start: 0 },
      { title: 'Chapter 1', start: 60 },
      { title: 'Chapter 2', start: 120 }
    ]);
    
    const result = await getChapters('testVideoId', { chapterOffset: 5 });
    
    expect(result.chapters[0].start).toBe(0); // First chapter not offset
    expect(result.chapters[1].start).toBe(65); // 60 + 5
    expect(result.chapters[2].start).toBe(125); // 120 + 5
  });

  test('applies chapter offset to all chapters when skipFirstChapterOffset is false', async () => {
    parseYouTubeChapters.mockReturnValue([
      { title: 'Intro', start: 0 },
      { title: 'Chapter 1', start: 60 },
      { title: 'Chapter 2', start: 120 }
    ]);
    
    const result = await getChapters('testVideoId', { 
      chapterOffset: 5, 
      skipFirstChapterOffset: false 
    });
    
    expect(result.chapters[0].start).toBe(5); // First chapter offset
    expect(result.chapters[1].start).toBe(65); // 60 + 5
    expect(result.chapters[2].start).toBe(125); // 120 + 5
  });

  test('handles errors gracefully', async () => {
    parseYouTubeChapters.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    const result = await getChapters('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0].title).toBe('Full Video');
    expect(result.metadata.error).toBe('Test error');
  });
});
