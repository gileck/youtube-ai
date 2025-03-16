import BaseAIAdapter from './base-adapter.js';

/**
 * DeepSeek adapter for AI operations
 * @extends BaseAIAdapter
 */
class DeepSeekAdapter extends BaseAIAdapter {
  /**
   * Constructor for the DeepSeek adapter
   * @param {Object} config - Configuration for the DeepSeek adapter
   */
  constructor(config) {
    super(config);
    this.model = config.model || 'deepseek-chat';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
    this.apiKey = process.env.DEEPSEEK_API_KEY;
  }

  /**
   * Initialize the DeepSeek client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    
    // Test the API connection
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DeepSeek API error: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error initializing DeepSeek client:', error.message);
      throw error;
    }
  }

  /**
   * Generate a completion using the DeepSeek model
   * @param {string} systemPrompt - The system prompt
   * @param {string} userPrompt - The user prompt
   * @param {Object} options - Additional options for the completion
   * @returns {Promise<Object>} - The completion result with text and usage information
   */
  async generateCompletion(systemPrompt, userPrompt, options = {}) {
    if (!this.apiKey) {
      await this.initialize();
    }
    
    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature || this.temperature;
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: maxTokens,
          temperature: temperature
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DeepSeek API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const result = await response.json();
      
      // Extract usage information
      const usage = result.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
      
      return {
        text: result.choices[0].message.content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        }
      };
    } catch (error) {
      console.error(`Error generating completion with DeepSeek ${this.model}:`, error.message);
      throw error;
    }
  }

  /**
   * Get information about the DeepSeek model
   * @returns {Object} - Information about the DeepSeek model
   */
  getModelInfo() {
    return {
      provider: 'deepseek',
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

export default DeepSeekAdapter;
