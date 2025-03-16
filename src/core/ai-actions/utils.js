/**
 * Utility functions for AI actions
 */

/**
 * Calculate cost based on token usage
 * @param {Object} usage - Token usage information
 * @param {string} model - The model used
 * @param {string} currency - The currency for cost calculation
 * @returns {Object} - Cost information
 */
export function calculateCost(usage, model, currency = 'USD') {
  // Default rates for different models (per 1000 tokens)
  const rates = {
    // OpenAI models
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4o': { input: 0.01, output: 0.03 },
    
    // Google models
    'gemini-pro': { input: 0.00125, output: 0.00375 },
    'gemini-1.5-pro': { input: 0.0025, output: 0.0075 },
    'gemini-1.5-flash': { input: 0.0005, output: 0.0015 },
    
    // Default fallback
    'default': { input: 0.001, output: 0.002 }
  };
  
  // Get model name without provider prefix
  const modelName = model.includes('/') ? model.split('/').pop() : model;
  
  // Use model-specific rates or default rates if model not found
  const modelRates = rates[modelName] || rates['default'];
  
  // Calculate costs
  const inputCost = (usage.promptTokens / 1000) * modelRates.input;
  const outputCost = (usage.completionTokens / 1000) * modelRates.output;
  const totalCost = inputCost + outputCost;
  
  // Format costs
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  });
  
  return {
    model: modelName,
    inputCost,
    outputCost,
    totalCost,
    formattedCost: formatter.format(totalCost)
  };
}
