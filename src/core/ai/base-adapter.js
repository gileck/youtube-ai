/**
 * Base class for AI adapters
 * All AI provider adapters should extend this class
 */
class BaseAIAdapter {
  /**
   * Constructor for the base AI adapter
   * @param {Object} config - Configuration for the AI adapter
   */
  constructor(config) {
    if (this.constructor === BaseAIAdapter) {
      throw new Error('BaseAIAdapter is an abstract class and cannot be instantiated directly');
    }
    this.config = config || {};
  }

  /**
   * Initialize the AI client
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method "initialize" must be implemented by subclasses');
  }

  /**
   * Generate a completion using the AI model
   * @param {string} systemPrompt - The system prompt
   * @param {string} userPrompt - The user prompt
   * @param {Object} options - Additional options for the completion
   * @returns {Promise<Object>} - The completion result with text and usage information
   */
  async generateCompletion(systemPrompt, userPrompt, options = {}) {
    throw new Error('Method "generateCompletion" must be implemented by subclasses');
  }

  /**
   * Get information about the AI model
   * @returns {Object} - Information about the AI model
   */
  getModelInfo() {
    throw new Error('Method "getModelInfo" must be implemented by subclasses');
  }
}

export default BaseAIAdapter;
