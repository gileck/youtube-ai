/**
 * AI Actions module
 * Exports all AI action processors
 */

import * as summary from './summary';
import * as keyPoints from './key-points';
import * as topicExtraction from './topic-extraction';
import { calculateCost } from './utils';

// Map of processor IDs to their modules
const processors = {
  summary,
  keyPoints,
  topicExtraction
};

/**
 * Get a processor by its ID
 * @param {string} processorId - The ID of the processor to retrieve
 * @returns {Object|null} The processor module or null if not found
 */
export const getProcessorById = (processorId) => {
  return processors[processorId] || null;
};

/**
 * Get all available processors
 * @returns {Array} Array of processor definitions
 */
export const getAllProcessors = () => {
  return Object.values(processors).map(processor => processor.definition);
};

/**
 * Get the component for a processor
 * @param {string} processorId - The ID of the processor
 * @returns {React.Component|null} The processor component or null if not found
 */
export const getProcessorComponent = (processorId) => {
  const processor = getProcessorById(processorId);
  return processor ? processor.ProcessorRenderer : null;
};

export {
  summary,
  keyPoints,
  topicExtraction,
  calculateCost
};
