/**
 * Pricing utility for AI models
 * Prices are in USD per 1000 tokens
 */
import ModelManager from './model-manager.js';

// Pricing information for AI models (as of March 2025)
const MODEL_PRICING = {
  // OpenAI models
  'openai/gpt-3.5-turbo': {
    input: 0.0005,   // $0.0005 per 1K input tokens
    output: 0.0015,  // $0.0015 per 1K output tokens
    name: 'GPT-3.5 Turbo'
  },
  'openai/gpt-4o': {
    input: 0.005,    // $0.005 per 1K input tokens
    output: 0.015,   // $0.015 per 1K output tokens
    name: 'GPT-4o'
  },
  'openai/gpt-4': {
    input: 0.03,     // $0.03 per 1K input tokens
    output: 0.06,    // $0.06 per 1K output tokens
    name: 'GPT-4'
  },

  // Anthropic models
  'anthropic/claude-3-haiku': {
    input: 0.00025,  // $0.00025 per 1K input tokens
    output: 0.00125, // $0.00125 per 1K output tokens
    name: 'Claude 3 Haiku'
  },
  'anthropic/claude-3-sonnet': {
    input: 0.003,    // $0.003 per 1K input tokens
    output: 0.015,   // $0.015 per 1K output tokens
    name: 'Claude 3 Sonnet'
  },
  'anthropic/claude-3-opus': {
    input: 0.015,    // $0.015 per 1K input tokens
    output: 0.075,   // $0.075 per 1K output tokens
    name: 'Claude 3 Opus'
  },

  // Google models
  'google/gemini-pro': {
    input: 0.00025,  // $0.00025 per 1K input tokens
    output: 0.0005,  // $0.0005 per 1K output tokens
    name: 'Gemini Pro'
  },
  'google/gemini-pro-vision': {
    input: 0.00025,  // $0.00025 per 1K input tokens
    output: 0.0005,  // $0.0005 per 1K output tokens
    name: 'Gemini Pro Vision'
  },
  'google/gemini-1.5-pro': {
    input: 0.0005,   // $0.0005 per 1K input tokens
    output: 0.0015,  // $0.0015 per 1K output tokens
    name: 'Gemini 1.5 Pro'
  },
  'google/gemini-1.5-flash': {
    input: 0.00025,  // $0.00025 per 1K input tokens
    output: 0.0005,  // $0.0005 per 1K output tokens
    name: 'Gemini 1.5 Flash'
  },

  // Cohere models
  'cohere/command-light': {
    input: 0.0003,   // $0.0003 per 1K input tokens
    output: 0.0006,  // $0.0006 per 1K output tokens
    name: 'Command Light'
  },
  'cohere/command': {
    input: 0.0015,   // $0.0015 per 1K input tokens
    output: 0.0015,  // $0.0015 per 1K output tokens
    name: 'Command'
  },

  // DeepSeek models
  'deepseek/deepseek-chat': {
    input: 0.0005,   // $0.0005 per 1K input tokens
    output: 0.0025,  // $0.0025 per 1K output tokens
    name: 'DeepSeek Chat'
  }
};

/**
 * Get pricing information for a model
 * @param {string} modelName - The model name or full model ID
 * @returns {Object|null} - The pricing information or null if not found
 */
function getModelPricing(modelName) {
  // Handle null, undefined, or non-string model names
  if (!modelName || typeof modelName !== 'string') {
    console.warn(`Invalid model name: ${modelName}, using default model`);
    return MODEL_PRICING[ModelManager.getDefaultFullModelId()] || null;
  }
  
  // If modelName is already a full model ID (provider/model), use it directly
  if (modelName.includes('/')) {
    return MODEL_PRICING[modelName] || null;
  }
  
  // Otherwise, convert the model name to a full model ID
  const fullModelId = ModelManager.getFullModelId(modelName);
  return MODEL_PRICING[fullModelId] || null;
}

/**
 * Calculate the cost of an API call
 * @param {string} modelName - The model name or full model ID
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {Object} - The calculated cost information
 */
function calculateCost(modelName, inputTokens, outputTokens) {
  // Get pricing information for the model
  const pricing = getModelPricing(modelName);
  
  if (!pricing) {
    console.warn(`Pricing information not available for model: ${modelName}`);
    // Return default pricing if model not found
    return {
      model: modelName,
      modelName: modelName,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      error: 'Pricing information not available for this model'
    };
  }
  
  // Calculate costs
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  return {
    model: modelName,
    modelName: pricing.name,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost
  };
}

/**
 * Get the cheapest model based on estimated token counts
 * @param {number} inputTokens - Estimated number of input tokens
 * @param {number} outputTokens - Estimated number of output tokens
 * @param {Array} modelFilter - Optional array of model IDs to consider
 * @returns {Object} - Information about the cheapest model
 */
function getCheapestModel(inputTokens, outputTokens, modelFilter = null) {
  let models = Object.keys(MODEL_PRICING);
  
  // Apply filter if provided
  if (modelFilter && Array.isArray(modelFilter) && modelFilter.length > 0) {
    models = models.filter(modelId => modelFilter.includes(modelId));
  }
  
  if (models.length === 0) {
    return {
      model: 'google/gemini-1.5-flash', // Default to Gemini 1.5 Flash if no models available
      modelName: 'Gemini 1.5 Flash',
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    };
  }
  
  // Calculate cost for each model
  const costs = models.map(modelId => {
    const pricing = MODEL_PRICING[modelId];
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;
    
    return {
      model: modelId,
      modelName: pricing.name,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost,
      outputCost,
      totalCost
    };
  });
  
  // Sort by total cost (ascending)
  costs.sort((a, b) => a.totalCost - b.totalCost);
  
  // Return the cheapest model
  return costs[0];
}

/**
 * Estimate costs for all available models
 * @param {number} inputTokens - Estimated number of input tokens
 * @param {number} outputTokens - Estimated number of output tokens
 * @returns {Array} - Array of cost estimates for all models
 */
function estimateAllModelCosts(inputTokens, outputTokens) {
  return Object.keys(MODEL_PRICING).map(modelId => {
    return calculateCost(modelId, inputTokens, outputTokens);
  }).sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Fetch the latest pricing information from API providers
 * @returns {Promise<Object>} - The updated pricing information
 */
async function fetchLatestPricing() {
  // This is a placeholder for future implementation
  // In a real-world scenario, this would make API calls to fetch the latest pricing
  console.log('Fetching latest pricing information...');
  
  // For now, just return the current pricing
  return MODEL_PRICING;
}

export {
  MODEL_PRICING,
  getModelPricing,
  calculateCost,
  getCheapestModel,
  estimateAllModelCosts,
  fetchLatestPricing
};
