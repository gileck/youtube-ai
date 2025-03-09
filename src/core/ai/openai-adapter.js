const { OpenAI } = require('openai');
const BaseAIAdapter = require('./base-adapter');

/**
 * OpenAI adapter for AI operations
 * @extends BaseAIAdapter
 */
class OpenAIAdapter extends BaseAIAdapter {
  /**
   * Constructor for the OpenAI adapter
   * @param {Object} config - Configuration for the OpenAI adapter
   */
  constructor(config) {
    super(config);
    this.client = null;
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Initialize the OpenAI client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate a completion using the OpenAI model
   * @param {string} systemPrompt - The system prompt
   * @param {string} userPrompt - The user prompt
   * @param {Object} options - Additional options for the completion
   * @returns {Promise<Object>} - The completion result with text and usage information
   */
  async generateCompletion(systemPrompt, userPrompt, options = {}) {
    if (!this.client) {
      await this.initialize();
    }
    
    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature || this.temperature;
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      });
      
      // Extract usage information
      const usage = response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
      
      return {
        text: response.choices[0].message.content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        }
      };
    } catch (error) {
      console.error(`Error generating completion with OpenAI ${this.model}:`, error.message);
      throw error;
    }
  }

  /**
   * Get information about the OpenAI model
   * @returns {Object} - Information about the OpenAI model
   */
  getModelInfo() {
    return {
      provider: 'openai',
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

module.exports = OpenAIAdapter;
