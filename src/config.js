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
    defaultUrl: 'https://www.youtube.com/watch?v=N5DAW8mkJ6Y',
    chapterOffset: 0,
    skipFirstChapterOffset: true,
    chapterFilters: {
      enabled: true,
      patterns: [
        "^Sponsor: .*",
        "^Sponsors: .*"
      ]
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
