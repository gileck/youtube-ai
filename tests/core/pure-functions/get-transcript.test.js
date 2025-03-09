/**
 * Tests for the get-transcript.js pure functions
 */
const { extractVideoId, getTranscript } = require('../../../src/core/pure-functions/get-transcript');
const { YoutubeTranscript } = require('youtube-transcript');

// Mock dependencies
jest.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: jest.fn()
  }
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

describe('getTranscript', () => {
  beforeEach(() => {
    // Reset mocks
    YoutubeTranscript.fetchTranscript.mockReset();
  });

  test('returns transcript data when successful', async () => {
    const mockTranscript = [
      { text: 'Hello', offset: 0, duration: 1000 },
      { text: 'World', offset: 1000, duration: 1000 }
    ];
    
    YoutubeTranscript.fetchTranscript.mockResolvedValue(mockTranscript);
    
    const result = await getTranscript('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.transcript).toEqual(mockTranscript);
    expect(result.metadata.totalSegments).toBe(2);
    expect(result.metadata.totalDuration).toBe(2000);
    expect(result.metadata.source).toBe('youtube-transcript');
  });

  test('handles empty transcript', async () => {
    YoutubeTranscript.fetchTranscript.mockResolvedValue([]);
    
    const result = await getTranscript('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.transcript).toEqual([]);
    expect(result.metadata.totalSegments).toBe(0);
    expect(result.metadata.totalDuration).toBe(0);
  });

  test('handles API errors gracefully', async () => {
    YoutubeTranscript.fetchTranscript.mockRejectedValue(new Error('API error'));
    
    const result = await getTranscript('testVideoId');
    
    expect(result.videoId).toBe('testVideoId');
    expect(result.transcript).toEqual([]);
    expect(result.metadata.error).toBe('API error');
  });

  test('calculates total duration correctly', async () => {
    const mockTranscript = [
      { text: 'First', offset: 0, duration: 1000 },
      { text: 'Second', offset: 1000, duration: 2000 },
      { text: 'Third', offset: 3000, duration: 3000 }
    ];
    
    YoutubeTranscript.fetchTranscript.mockResolvedValue(mockTranscript);
    
    const result = await getTranscript('testVideoId');
    
    expect(result.metadata.totalDuration).toBe(6000); // Last offset (3000) + last duration (3000)
  });
});
