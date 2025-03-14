/**
 * Tests for the summarize-chapters.js pure function
 */
const { summarizeChapters } = require('../../../../src/core/pure-functions/summarization');

// Create a mock for the TranscriptSummarizer
const mockSummarize = jest.fn();
const mockTranscriptSummarizer = {
  config: {
    model: 'test-model',
    includeChapterBreakdown: true,
    chunkingStrategy: 'chapter',
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

describe('summarizeChapters', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockSummarize.mockReset();
    
    // Set up default mock implementation
    mockSummarize.mockImplementation(() => {
      return Promise.resolve({
        text: 'Chapter-based summary',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        cost: {
          inputCost: 0.0002,
          outputCost: 0.0003,
          totalCost: 0.0005,
          inputCostFormatted: '$0.0002',
          outputCostFormatted: '$0.0003',
          totalCostFormatted: '$0.0005',
          currency: 'ILS',
          exchangeRate: 3.5
        },
        processingTime: 1.5
      });
    });
  });
  
  test('summarizes chapters correctly', async () => {
    const videoId = 'testVideoId';
    const chapterContent = {
      '[00:00] Intro': 'Introduction content',
      '[01:00] Main': 'Main content'
    };
    const options = { model: 'test-model', currency: 'ILS' };
    
    const result = await summarizeChapters(videoId, chapterContent, options);
    
    expect(result.videoId).toBe(videoId);
    expect(result.text).toBe('Chapter-based summary');
    expect(result.usage.totalTokens).toBe(150);
    expect(result.cost.totalCost).toBe(0.0005);
    expect(result.cost.currency).toBe('ILS');
    expect(result.processingTime).toBe(1.5);
    
    // Check that summarize was called with the right parameters
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(mockSummarize.mock.calls[0][1].chapterContent).toEqual(chapterContent);
  });
  
  test('validates input and rejects invalid chapter content', async () => {
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
      const result = await summarizeChapters(videoId, input);
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
    const chapterContent = {
      '[00:00] Intro': 'Introduction content'
    };
    
    const result = await summarizeChapters(videoId, chapterContent);
    
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
