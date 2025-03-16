/**
 * Summary processor configuration
 */

// Input type enum
export const INPUT_TYPE = {
  FULL_TRANSCRIPT: 'FULL_TRANSCRIPT',
  CHAPTERS: 'CHAPTERS'
};

// Configuration for the summary processor
const config = {
  inputType: INPUT_TYPE.FULL_TRANSCRIPT,
  maxTokens: 1000,
  temperature: 0.3
};

export default config;
