import OpenAIAdapter from './openai-adapter.js';
import DeepSeekAdapter from './deepseek-adapter.js';
import GeminiAdapter from './gemini-adapter.js';
import ModelManager from '../utils/model-manager.js';

/**
 * Factory for creating AI adapters
 */
class AIAdapterFactory {
  /**
   * Create an AI adapter based on the model name
   * @param {string} modelName - The model name (e.g., 'gemini-1.5-flash', 'gpt-4')
   * @param {Object} config - Additional configuration for the AI adapter
   * @returns {BaseAIAdapter} - The created AI adapter
   */
  static createAdapter(modelName, config = {}) {
    // Get the adapter name and model ID from the model name
    const adapterName = ModelManager.getAdapterName(modelName);
    const modelId = ModelManager.getModelId(modelName);
    
    // Create the adapter configuration with the model ID
    const adapterConfig = {
      ...config,
      model: modelId
    };
    
    // Create the appropriate adapter
    switch (adapterName.toLowerCase()) {
      case 'openai':
        return new OpenAIAdapter(adapterConfig);
      case 'deepseek':
        return new DeepSeekAdapter(adapterConfig);
      case 'google':
        return new GeminiAdapter(adapterConfig);
      default:
        throw new Error(`Unsupported AI adapter: ${adapterName}`);
    }
  }

  /**
   * Get the list of supported AI adapters
   * @returns {string[]} - The list of supported AI adapters
   */
  static getSupportedAdapters() {
    return ModelManager.getAllAdapters();
  }
  
  /**
   * Get the list of supported models
   * @returns {string[]} - The list of supported models
   */
  static getSupportedModels() {
    return ModelManager.getAllModelNames();
  }
  
  /**
   * Get the list of models for a specific adapter
   * @param {string} adapter - The adapter name
   * @returns {string[]} - The list of models for the adapter
   */
  static getModelsForAdapter(adapter) {
    return ModelManager.getModelsForAdapter(adapter);
  }
}

export default AIAdapterFactory;
