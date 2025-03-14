/**
 * Utility for managing AI model names and adapters
 */
const Models = require('./models');

class ModelManager {
  // Map of model names to their adapter and model ID
  static modelMap = {
    // OpenAI models
    'gpt-3.5-turbo': { adapter: 'openai', modelId: 'gpt-3.5-turbo' },
    'gpt-4': { adapter: 'openai', modelId: 'gpt-4' },
    'gpt-4o': { adapter: 'openai', modelId: 'gpt-4o' },
    
    // Google models
    'gemini-pro': { adapter: 'google', modelId: 'gemini-pro' },
    'gemini-pro-vision': { adapter: 'google', modelId: 'gemini-pro-vision' },
    'gemini-1.5-pro': { adapter: 'google', modelId: 'gemini-1.5-pro' },
    'gemini-1.5-flash': { adapter: 'google', modelId: 'gemini-1.5-flash' },
    
    // Anthropic models
    'claude-3-haiku': { adapter: 'anthropic', modelId: 'claude-3-haiku' },
    'claude-3-sonnet': { adapter: 'anthropic', modelId: 'claude-3-sonnet' },
    'claude-3-opus': { adapter: 'anthropic', modelId: 'claude-3-opus' },
    
    // Cohere models
    'command-light': { adapter: 'cohere', modelId: 'command-light' },
    'command': { adapter: 'cohere', modelId: 'command' },
    'command-r': { adapter: 'cohere', modelId: 'command-r' },
    
    // DeepSeek models
    'deepseek-chat': { adapter: 'deepseek', modelId: 'deepseek-chat' },
    'deepseek-coder': { adapter: 'deepseek', modelId: 'deepseek-coder' }
  };

  /**
   * Get the adapter name for a model
   * @param {string} modelName - The model name or full model ID
   * @returns {string} - The adapter name
   */
  static getAdapterName(modelName) {
    // If modelName is in the format "adapter/model", extract the adapter
    if (modelName.includes('/')) {
      const [adapter] = modelName.split('/');
      return adapter;
    }
    
    // If modelName is in our map, return the adapter
    if (this.modelMap[modelName]) {
      return this.modelMap[modelName].adapter;
    }
    
    // Default to the model name as the adapter
    return modelName;
  }

  /**
   * Get the model ID for a model
   * @param {string} modelName - The model name or full model ID
   * @returns {string} - The model ID
   */
  static getModelId(modelName) {
    // If modelName is in the format "adapter/model", extract the model ID
    if (modelName.includes('/')) {
      const [, modelId] = modelName.split('/');
      return modelId;
    }
    
    // If modelName is in our map, return the model ID
    if (this.modelMap[modelName]) {
      return this.modelMap[modelName].modelId;
    }
    
    // Default to the model name itself
    return modelName;
  }

  /**
   * Convert a model name or ID to a standardized model name
   * @param {string} modelInput - The model name or ID in any format
   * @returns {string} - The standardized model name
   */
  static standardizeModelName(modelInput) {
    // If modelInput is in the format "adapter/model", extract the model
    if (modelInput.includes('/')) {
      const [, modelName] = modelInput.split('/');
      return modelName;
    }
    
    // Otherwise, return the input as is
    return modelInput;
  }

  /**
   * Get the full model ID (adapter/model) for a model name
   * @param {string} modelName - The model name
   * @returns {string} - The full model ID
   */
  static getFullModelId(modelName) {
    // If modelName is already in the format "adapter/model", return it
    if (modelName.includes('/')) {
      return modelName;
    }
    
    // If modelName is in our map, construct the full ID
    if (this.modelMap[modelName]) {
      return `${this.modelMap[modelName].adapter}/${this.modelMap[modelName].modelId}`;
    }
    
    // Default to the model name itself
    return modelName;
  }

  /**
   * Get all available model names
   * @returns {string[]} - Array of model names
   */
  static getAllModelNames() {
    return Object.keys(this.modelMap);
  }

  /**
   * Get all available adapters
   * @returns {string[]} - Array of adapter names
   */
  static getAllAdapters() {
    return [...new Set(Object.values(this.modelMap).map(model => model.adapter))];
  }

  /**
   * Get models for a specific adapter
   * @param {string} adapter - The adapter name
   * @returns {string[]} - Array of model names for the adapter
   */
  static getModelsForAdapter(adapter) {
    return Object.entries(this.modelMap)
      .filter(([, value]) => value.adapter === adapter)
      .map(([key]) => key);
  }

  /**
   * Check if a model is supported
   * @param {string} modelName - The model name
   * @returns {boolean} - Whether the model is supported
   */
  static isModelSupported(modelName) {
    // Standardize the model name first
    const standardizedName = this.standardizeModelName(modelName);
    return !!this.modelMap[standardizedName];
  }

  /**
   * Get the default model name
   * @returns {string} - The default model name
   */
  static getDefaultModelName() {
    // DEFAULT_MODEL is in format 'provider/model', so extract just the model part
    return Models.DEFAULT_MODEL.split('/')[1] || 'gemini-1.5-flash';
  }
}

module.exports = ModelManager;
