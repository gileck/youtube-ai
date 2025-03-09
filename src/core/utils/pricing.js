/**
 * Pricing utility for AI models
 * Prices are in USD per 1000 tokens
 */

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
 * @param {string} modelId - The model identifier
 * @returns {Object|null} - The pricing information or null if not found
 */
function getModelPricing(modelId) {
  return MODEL_PRICING[modelId] || null;
}

/**
 * Calculate the cost of an API call
 * @param {string} modelId - The model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {Object} - The calculated cost information
 */
function calculateCost(modelId, inputTokens, outputTokens) {
  const pricing = getModelPricing(modelId);
  
  if (!pricing) {
    return {
      model: modelId,
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
    model: pricing.name || modelId,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost,
    inputRate: `$${pricing.input.toFixed(6)} per 1K tokens`,
    outputRate: `$${pricing.output.toFixed(6)} per 1K tokens`
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
  let cheapestModel = null;
  let lowestCost = Infinity;
  
  // Filter models if needed
  const modelsToConsider = modelFilter 
    ? Object.keys(MODEL_PRICING).filter(id => modelFilter.includes(id))
    : Object.keys(MODEL_PRICING);
  
  // Find the cheapest model
  for (const modelId of modelsToConsider) {
    const pricing = MODEL_PRICING[modelId];
    const cost = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
    
    if (cost < lowestCost) {
      lowestCost = cost;
      cheapestModel = modelId;
    }
  }
  
  if (!cheapestModel) {
    return {
      error: 'No suitable model found'
    };
  }
  
  // Calculate detailed cost information
  return {
    ...calculateCost(cheapestModel, inputTokens, outputTokens),
    isRecommended: true
  };
}

/**
 * Estimate costs for all available models
 * @param {number} inputTokens - Estimated number of input tokens
 * @param {number} outputTokens - Estimated number of output tokens
 * @returns {Array} - Array of cost estimates for all models
 */
function estimateAllModelCosts(inputTokens, outputTokens) {
  return Object.keys(MODEL_PRICING).map(modelId => 
    calculateCost(modelId, inputTokens, outputTokens)
  ).sort((a, b) => a.totalCost - b.totalCost);
}

/**
 * Fetch the latest pricing information from API providers
 * @returns {Promise<Object>} - The updated pricing information
 */
async function fetchLatestPricing() {
  // In a real implementation, this would make API calls to fetch the latest pricing
  // For now, we'll just return the static pricing information
  console.log('Fetching latest pricing information...');
  console.log('Note: This is using cached pricing information as of March 2025');
  
  return MODEL_PRICING;
}

module.exports = {
  MODEL_PRICING,
  getModelPricing,
  calculateCost,
  getCheapestModel,
  estimateAllModelCosts,
  fetchLatestPricing
};
