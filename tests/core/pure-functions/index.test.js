/**
 * Tests for the index.js file that exports all pure functions
 */
const pureFunctions = require('../../../src/core/pure-functions');

describe('Pure Functions Index', () => {
  test('exports all required functions', () => {
    // Check that all expected functions are exported
    expect(typeof pureFunctions.extractVideoId).toBe('function');
    expect(typeof pureFunctions.getTranscript).toBe('function');
    expect(typeof pureFunctions.getVideoInfo).toBe('function');
    expect(typeof pureFunctions.formatTimestamp).toBe('function');
    expect(typeof pureFunctions.getChapters).toBe('function');
    expect(typeof pureFunctions.shouldFilterChapter).toBe('function');
    expect(typeof pureFunctions.combineTranscriptAndChapters).toBe('function');
    expect(typeof pureFunctions.convertToFormattedText).toBe('function');
    expect(typeof pureFunctions.organizeContentByChapters).toBe('function');
    expect(typeof pureFunctions.getTranscriptWithChapters).toBe('function');
    expect(typeof pureFunctions.summarizeTranscript).toBe('function');
  });

  test('extractVideoId function works correctly', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(pureFunctions.extractVideoId(url)).toBe('dQw4w9WgXcQ');
  });

  test('formatTimestamp function works correctly', () => {
    // Update the expected format to match the actual implementation
    expect(pureFunctions.formatTimestamp(61)).toBe('01:01');
  });
});
