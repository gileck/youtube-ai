/**
 * Tests for the summarize-transcript.js pure function
 */
const { summarizeTranscript } = require('../../../../src/core/pure-functions/summarization');

// Create a mock for the TranscriptSummarizer
const mockSummarize = jest.fn();
const mockTranscriptSummarizer = {
  config: {
    model: 'test-model',
    includeChapterBreakdown: true,
    chunkingStrategy: 'token',
    parallelProcessing: true,
    maxConcurrentRequests: 5,
    currency: 'ILS'
  },
  summarize: mockSummarize
};

// Mock the TranscriptSummarizer constructor
jest.mock('../../../../src/core/services/transcript-summarizer', () => {
  return jest.fn().mockImplementation(() => mockTranscriptSummarizer);
});

describe('summarizeTranscript', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockSummarize.mockReset();
    
    // Set up default mock implementation
    mockSummarize.mockImplementation(() => {
      return Promise.resolve({
        text: 'Full transcript summary',
        usage: {
          promptTokens: 200,
          completionTokens: 100,
          totalTokens: 300
        },
        cost: {
          inputCost: 0.0004,
          outputCost: 0.0006,
          totalCost: 0.001,
          inputCostFormatted: '$0.0004',
          outputCostFormatted: '$0.0006',
          totalCostFormatted: '$0.001',
          currency: 'ILS',
          exchangeRate: 3.5
        },
        processingTime: 2.5
      });
    });
  });
  
  test('summarizes full transcript correctly', async () => {
    const videoId = 'testVideoId';
    const transcriptText = 'This is a test transcript with multiple paragraphs of content.';
    const options = { model: 'test-model', currency: 'ILS' };
    
    const result = await summarizeTranscript(videoId, transcriptText, options);
    
    expect(result.videoId).toBe(videoId);
    expect(result.text).toBe('Full transcript summary');
    expect(result.usage.totalTokens).toBe(300);
    expect(result.cost.totalCost).toBe(0.001);
    expect(result.cost.currency).toBe('ILS');
    expect(result.processingTime).toBe(2.5);
    
    // Check that summarize was called with the right parameters
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(mockSummarize.mock.calls[0][0]).toEqual(transcriptText);
    
    // Verify that token-based chunking strategy is used
    const TranscriptSummarizer = require('../../../../src/core/services/transcript-summarizer');
    expect(TranscriptSummarizer).toHaveBeenCalledWith(expect.objectContaining({
      chunkingStrategy: 'token'
    }));
  });
  
  test('validates input and rejects invalid transcript text', async () => {
    const videoId = 'testVideoId';
    const invalidInputs = [
      null,
      undefined,
      '',
      123,
      [],
      {}
    ];
    
    for (const input of invalidInputs) {
      const result = await summarizeTranscript(videoId, input);
      expect(result.text).toBe('');
      expect(result.metadata.error).toBeDefined();
    }
  });
  
  test('handles errors gracefully', async () => {
    // Mock an error for this test
    mockSummarize.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    const videoId = 'testVideoId';
    const transcriptText = 'This is a test transcript.';
    
    const result = await summarizeTranscript(videoId, transcriptText);
    
    expect(result.videoId).toBe(videoId);
    expect(result.text).toBe('');
    expect(result.usage.promptTokens).toBe(0);
    expect(result.usage.completionTokens).toBe(0);
    expect(result.usage.totalTokens).toBe(0);
    expect(result.cost.totalCost).toBe(0);
    expect(result.processingTime).toBe(0);
    expect(result.metadata.error).toBeDefined();
  });
});
