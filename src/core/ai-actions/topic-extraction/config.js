/**
 * Topic Extraction processor configuration
 */

// Input type enum
export const INPUT_TYPE = {
  FULL_TRANSCRIPT: 'FULL_TRANSCRIPT',
  CHAPTERS: 'CHAPTERS'
};

// Configuration for the topic extraction processor
const config = {
  inputType: INPUT_TYPE.CHAPTERS,
  maxTokens: 1500,
  temperature: 0.3
};

export default config;
