/**
 * Tests for the summarize-transcript.js pure functions
 */
const { summarizeTranscript } = require('../../../src/core/pure-functions/summarize-transcript');

describe('summarizeTranscript', () => {
  test('handles errors gracefully', async () => {
    // Force an error by passing invalid parameters
    const result = await summarizeTranscript(null, null);
    
    // Check that the function returns a properly structured error response
    expect(result.videoId).toBe(null);
    expect(result.text).toBe('');
    expect(result.usage.promptTokens).toBe(0);
    expect(result.usage.completionTokens).toBe(0);
    expect(result.usage.totalTokens).toBe(0);
    expect(result.cost.totalCost).toBe(0);
    expect(result.processingTime).toBe(0);
    expect(result.metadata.error).toBeDefined();
  });
});
