const OpenAIAdapter = require('./openai-adapter');
const DeepSeekAdapter = require('./deepseek-adapter');
const GeminiAdapter = require('./gemini-adapter');

/**
 * Factory for creating AI adapters
 */
class AIAdapterFactory {
  /**
   * Create an AI adapter based on the provider
   * @param {string} provider - The AI provider (e.g., 'openai', 'anthropic', 'google', 'cohere', 'deepseek')
   * @param {Object} config - Configuration for the AI adapter
   * @returns {BaseAIAdapter} - The created AI adapter
   */
  static createAdapter(provider, config) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'deepseek':
        return new DeepSeekAdapter(config);
      case 'google':
        return new GeminiAdapter(config);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Get the list of supported AI providers
   * @returns {string[]} - The list of supported AI providers
   */
  static getSupportedProviders() {
    return ['openai', 'deepseek', 'google'];
  }
}

module.exports = AIAdapterFactory;
