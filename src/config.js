/**
 * Centralized configuration for the YouTube to AI application
 */

const Models = require('./core/utils/models');

// Default configuration
const config = {
  // AI model settings
  ai: {
    model: 'google/gemini-1.5-flash', // Default model
    includeChapterBreakdown: true,
    chunkingStrategy: 'chapter',
    parallelProcessing: true,
    maxConcurrentRequests: 10,
    promptFile: 'prompt.txt', // Path to the prompt file (relative to client-app directory)
    costApprovalThreshold: 0.05 // Threshold in USD for cost approval (default: $0.05)
  },
  
  // Currency settings
  currency: {
    default: 'ILS', // Default currency is Israeli Shekel
  },
  
  // YouTube settings
  youtube: {
    defaultUrl: 'https://www.youtube.com/watch?v=01op4XmNmxA',
    chapterOffset: 0,
    skipFirstChapterOffset: true,
    chapterFilters: {
      enabled: false,
      patterns: []
    },
    apiKey: process.env.YOUTUBE_API_KEY || '',
    // YouTube API settings
    api: {
      quotaLimit: 10000, // Default daily quota limit
      quotaWarningThreshold: 0.8, // Show warning at 80% usage
      cacheTTL: {
        search: 24 * 60 * 60 * 1000, // 24 hours
        channelInfo: 24 * 60 * 60 * 1000, // 24 hours
        videos: 6 * 60 * 60 * 1000, // 6 hours
        videoDetails: 24 * 60 * 60 * 1000 // 24 hours
      },
      costPerRequest: {
        search: 100, // Search costs 100 units
        channelInfo: 1, // Channel info costs 1 unit
        videoInfo: 1, // Video info costs 1 unit per video
        videoSearch: 100 // Video search costs 100 units
      },
      maxCacheSize: 100, // Maximum number of items to cache
      enableBatchRequests: true // Enable batching multiple requests
    }
  },
  
  // File paths
  paths: {
    output: 'output'
  },
  
  // Cache settings
  cache: {
    enabled: true,
    persistenceEnabled: true
  }
};

module.exports = config;
