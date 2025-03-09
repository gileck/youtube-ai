/**
 * Test for the estimate API endpoint with cost approval threshold
 */
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const config = require('../../../src/config');

// Import the handler directly (for direct testing)
const estimateHandler = require('../../../src/pages/api/estimate').default;

// Mock the HTTP request/response objects
const createMockReq = (body = {}) => ({
  method: 'POST',
  body
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    _status: 200,
    _json: null
  };
  res.status.mockImplementation((code) => {
    res._status = code;
    return res;
  });
  res.json.mockImplementation((data) => {
    res._json = data;
    return res;
  });
  return res;
};

// Mock dependencies
jest.mock('../../../src/core/pure-functions', () => ({
  extractVideoId: jest.fn((url) => 'mock-video-id'),
  getTranscript: jest.fn(() => Promise.resolve({ transcript: 'Mock transcript' })),
  getChapters: jest.fn(() => Promise.resolve({ chapters: [] })),
  getTranscriptWithChapters: jest.fn(() => ({ formattedText: 'Mock formatted text' }))
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => 'Mock transcript content'),
  mkdirSync: jest.fn()
}));

jest.mock('../../../src/core/services/transcript-summarizer', () => {
  return function() {
    return {
      estimateCost: jest.fn(async () => ({
        model: 'mock-model',
        totalCost: 0.03, // Default below threshold
        inputTokens: 1000,
        outputTokens: 200
      }))
    };
  };
});

jest.mock('../../../src/pages/api/cache/cache', () => ({
  generateKey: jest.fn(() => 'mock-cache-key'),
  get: jest.fn(() => null),
  set: jest.fn()
}));

describe('Estimate API with Cost Approval Threshold', () => {
  let originalThreshold;
  
  beforeAll(() => {
    // Save original threshold
    originalThreshold = config.ai.costApprovalThreshold;
  });
  
  afterAll(() => {
    // Restore original threshold
    config.ai.costApprovalThreshold = originalThreshold;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should not require approval when cost is below threshold', async () => {
    // Set threshold to 0.05
    config.ai.costApprovalThreshold = 0.05;
    
    // Mock the TranscriptSummarizer to return a cost below threshold
    require('../../../src/core/services/transcript-summarizer').mockImplementation(() => ({
      estimateCost: jest.fn(async () => ({
        model: 'mock-model',
        totalCost: 0.03, // Below threshold
        inputTokens: 1000,
        outputTokens: 200
      }))
    }));
    
    const req = createMockReq({
      youtubeUrl: 'https://www.youtube.com/watch?v=mock-id',
      model: 'mock-model',
      currency: 'USD'
    });
    
    const res = createMockRes();
    
    await estimateHandler(req, res);
    
    expect(res._status).toBe(200);
    expect(res._json).toHaveProperty('requiresApproval', false);
  });

  test('should require approval when cost is above threshold', async () => {
    // Set threshold to 0.05
    config.ai.costApprovalThreshold = 0.05;
    
    // Mock the TranscriptSummarizer to return a cost above threshold
    require('../../../src/core/services/transcript-summarizer').mockImplementation(() => ({
      estimateCost: jest.fn(async () => ({
        model: 'mock-model',
        totalCost: 0.07, // Above threshold
        inputTokens: 1000,
        outputTokens: 200
      }))
    }));
    
    const req = createMockReq({
      youtubeUrl: 'https://www.youtube.com/watch?v=mock-id',
      model: 'mock-model',
      currency: 'USD'
    });
    
    const res = createMockRes();
    
    await estimateHandler(req, res);
    
    expect(res._status).toBe(200);
    expect(res._json).toHaveProperty('requiresApproval', true);
  });

  test('should use default threshold if not specified in config', async () => {
    // Remove threshold from config
    delete config.ai.costApprovalThreshold;
    
    // Mock the TranscriptSummarizer to return a cost above default threshold (0.05)
    require('../../../src/core/services/transcript-summarizer').mockImplementation(() => ({
      estimateCost: jest.fn(async () => ({
        model: 'mock-model',
        totalCost: 0.06, // Above default threshold
        inputTokens: 1000,
        outputTokens: 200
      }))
    }));
    
    const req = createMockReq({
      youtubeUrl: 'https://www.youtube.com/watch?v=mock-id',
      model: 'mock-model',
      currency: 'USD'
    });
    
    const res = createMockRes();
    
    await estimateHandler(req, res);
    
    expect(res._status).toBe(200);
    expect(res._json).toHaveProperty('requiresApproval', true);
  });
});
