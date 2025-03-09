const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaseAIAdapter = require('./base-adapter');

/**
 * Gemini adapter for AI operations
 * @extends BaseAIAdapter
 */
class GeminiAdapter extends BaseAIAdapter {
  /**
   * Constructor for the Gemini adapter
   * @param {Object} config - Configuration for the Gemini adapter
   */
  constructor(config) {
    super(config);
    this.client = null;
    
    // Extract the model name without the provider prefix
    if (config.model && config.model.includes('/')) {
      const parts = config.model.split('/');
      this.model = parts[parts.length - 1]; // Get the last part after the slash
    } else {
      this.model = config.model || 'gemini-1.5-flash';
    }
    
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature || 0.7;
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  /**
   * Initialize the Gemini client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    try {
      this.client = new GoogleGenerativeAI(this.apiKey);
      console.log(`Initializing Gemini with model: ${this.model}`);
    } catch (error) {
      console.error('Error initializing Gemini client:', error.message);
      throw error;
    }
  }

  /**
   * Generate a completion using the Gemini model
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
      // Gemini doesn't have a separate system prompt, so we combine them
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const genAI = this.client;
      const model = genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature
        }
      });
      
      // Generate content
      const result = await model.generateContent(combinedPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Gemini doesn't provide token usage information in the same way as OpenAI
      // We'll estimate it based on the input and output text length
      const estimatedInputTokens = Math.ceil(combinedPrompt.length / 4);
      const estimatedOutputTokens = Math.ceil(text.length / 4);
      
      return {
        text: text,
        usage: {
          promptTokens: estimatedInputTokens,
          completionTokens: estimatedOutputTokens,
          totalTokens: estimatedInputTokens + estimatedOutputTokens,
          isEstimated: true
        }
      };
    } catch (error) {
      console.error(`Error generating completion with Gemini ${this.model}:`, error.message);
      throw error;
    }
  }

  /**
   * Get information about the Gemini model
   * @returns {Object} - Information about the Gemini model
   */
  getModelInfo() {
    return {
      provider: 'google',
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

module.exports = GeminiAdapter;
