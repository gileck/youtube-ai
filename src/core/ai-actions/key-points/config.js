/**
 * Key Points processor configuration
 */

// Input type enum
export const INPUT_TYPE = {
  FULL_TRANSCRIPT: 'FULL_TRANSCRIPT',
  CHAPTERS: 'CHAPTERS'
};

// Configuration for the key points processor
const config = {
  inputType: INPUT_TYPE.CHAPTERS,
  maxTokens: 1000,
  temperature: 0.3
};

export default config;
