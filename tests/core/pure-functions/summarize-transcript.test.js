/**
 * Tests for the summarize-transcript.js pure functions
 */
const { summarizeTranscript } = require('../../../src/core/pure-functions/summarize-transcript');

// Create a mock for the TranscriptSummarizer
const mockSummarize = jest.fn();
const mockTranscriptSummarizer = {
  config: {
    model: 'test-model',
    includeChapterBreakdown: true,
    chunkingStrategy: 'chapter',
    parallelProcessing: true,
    maxConcurrentRequests: 5,
    currency: 'USD'
  },
  summarize: mockSummarize
};

// Mock the constructor to return our mock instance
jest.mock('../../../src/core/services/transcript-summarizer', () => {
  return jest.fn().mockImplementation(() => mockTranscriptSummarizer);
});

describe('summarizeTranscript', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockSummarize.mockReset();
    
    // Set up default mock implementation
    mockSummarize.mockImplementation((content, options) => {
      const hasChapterContent = options && options.chapterContent && Object.keys(options.chapterContent).length > 0;
      
      return Promise.resolve({
        text: hasChapterContent ? 'Summary with chapter content' : 'Summary without chapter content',
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
          totalCostFormatted: '$0.0005'
        },
        processingTime: 1.5
      });
    });
  });
  
  test('handles string transcript input correctly', async () => {
    const videoId = 'testVideoId';
    const transcriptText = 'This is a test transcript';
    const options = { model: 'test-model' };
    
    const result = await summarizeTranscript(videoId, transcriptText, options);
    
    expect(result.videoId).toBe(videoId);
    expect(result.text).toBe('Summary without chapter content');
    expect(result.usage.totalTokens).toBe(150);
    expect(result.cost.totalCost).toBe(0.0005);
    expect(result.processingTime).toBe(1.5);
  });
  
  test('handles structured transcript with chapter content correctly', async () => {
    const videoId = 'testVideoId';
    const transcriptData = {
      formattedText: 'This is a formatted transcript',
      chapterContent: {
        '[00:00] Intro': 'Introduction content',
        '[01:00] Main': 'Main content'
      }
    };
    const options = { model: 'test-model' };
    
    const result = await summarizeTranscript(videoId, transcriptData, options);
    
    expect(result.videoId).toBe(videoId);
    expect(result.text).toBe('Summary with chapter content');
    expect(result.usage.totalTokens).toBe(150);
    expect(result.cost.totalCost).toBe(0.0005);
    expect(result.processingTime).toBe(1.5);
  });
  
  test('passes chapter content to summarizer when available', async () => {
    const videoId = 'testVideoId';
    const chapterContent = {
      '[00:00] Intro': 'Introduction content',
      '[01:00] Main': 'Main content'
    };
    const transcriptData = {
      formattedText: 'This is a formatted transcript',
      chapterContent
    };
    const options = { model: 'test-model' };
    
    await summarizeTranscript(videoId, transcriptData, options);
    
    // Check that summarize was called with the right parameters
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(mockSummarize.mock.calls[0][0]).toBe('This is a formatted transcript');
    expect(mockSummarize.mock.calls[0][1].chapterContent).toEqual(chapterContent);
  });

  test('handles errors gracefully', async () => {
    // Mock an error for this test
    mockSummarize.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    const result = await summarizeTranscript('testVideoId', 'test transcript');
    
    // Check that the function returns a properly structured error response
    expect(result.videoId).toBe('testVideoId');
    expect(result.text).toBe('');
    expect(result.usage.promptTokens).toBe(0);
    expect(result.usage.completionTokens).toBe(0);
    expect(result.usage.totalTokens).toBe(0);
    expect(result.cost.totalCost).toBe(0);
    expect(result.processingTime).toBe(0);
    expect(result.metadata.error).toBeDefined();
  });
});
