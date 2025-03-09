/**
 * Constants for AI model identifiers
 * Format: PROVIDER_MODEL
 */

// OpenAI Models
const OPENAI_GPT35_TURBO = 'openai/gpt-3.5-turbo';
const OPENAI_GPT4O = 'openai/gpt-4o';
const OPENAI_GPT4 = 'openai/gpt-4';

// Anthropic Models
const ANTHROPIC_CLAUDE3_HAIKU = 'anthropic/claude-3-haiku';
const ANTHROPIC_CLAUDE3_SONNET = 'anthropic/claude-3-sonnet';
const ANTHROPIC_CLAUDE3_OPUS = 'anthropic/claude-3-opus';

// Google Models  
const GOOGLE_GEMINI_PRO = 'google/gemini-pro';
const GOOGLE_GEMINI_PRO_VISION = 'google/gemini-pro-vision';
const GOOGLE_GEMINI_15_PRO = 'google/gemini-1.5-pro';
const GOOGLE_GEMINI_15_FLASH = 'google/gemini-1.5-flash';

// Cohere Models
const COHERE_COMMAND_LIGHT = 'cohere/command-light';
const COHERE_COMMAND = 'cohere/command';
const COHERE_COMMAND_R = 'cohere/command-r';

// DeepSeek Models
const DEEPSEEK_CHAT = 'deepseek/deepseek-chat';
const DEEPSEEK_CODER = 'deepseek/deepseek-coder';

// Model categories by cost (from cheapest to most expensive)
const ECONOMY_MODELS = [
  OPENAI_GPT35_TURBO,
  GOOGLE_GEMINI_15_FLASH,
  GOOGLE_GEMINI_PRO,
  COHERE_COMMAND_LIGHT,
  ANTHROPIC_CLAUDE3_HAIKU
];

const STANDARD_MODELS = [
  COHERE_COMMAND,
  GOOGLE_GEMINI_15_PRO,
  ANTHROPIC_CLAUDE3_SONNET
];

const PREMIUM_MODELS = [
  OPENAI_GPT4O,
  OPENAI_GPT4,
  ANTHROPIC_CLAUDE3_OPUS
];

// Default model for each provider
const DEFAULT_MODELS = {
  openai: OPENAI_GPT35_TURBO,
  anthropic: ANTHROPIC_CLAUDE3_HAIKU,
  google: GOOGLE_GEMINI_15_FLASH,
  cohere: COHERE_COMMAND_LIGHT,
  deepseek: DEEPSEEK_CHAT
};

// Default model to use if not specified
const DEFAULT_MODEL = GOOGLE_GEMINI_15_FLASH;

module.exports = {
  // OpenAI
  OPENAI_GPT35_TURBO,
  OPENAI_GPT4O,
  OPENAI_GPT4,

  // Anthropic
  ANTHROPIC_CLAUDE3_HAIKU,
  ANTHROPIC_CLAUDE3_SONNET,
  ANTHROPIC_CLAUDE3_OPUS,

  // Google
  GOOGLE_GEMINI_PRO,
  GOOGLE_GEMINI_PRO_VISION,
  GOOGLE_GEMINI_15_PRO,
  GOOGLE_GEMINI_15_FLASH,

  // Cohere
  COHERE_COMMAND_LIGHT,
  COHERE_COMMAND,
  COHERE_COMMAND_R,

  // DeepSeek
  DEEPSEEK_CHAT,
  DEEPSEEK_CODER,

  // Categories
  ECONOMY_MODELS,
  STANDARD_MODELS,
  PREMIUM_MODELS,

  // Defaults
  DEFAULT_MODELS,
  DEFAULT_MODEL
};
