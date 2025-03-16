/**
 * Server-only prompt loader
 * This module is responsible for loading prompt templates from files
 * and should only be imported in server-side code
 */

import fs from 'fs';
import path from 'path';

/**
 * Load a prompt template from a file
 * @param {string} processorId - The ID of the processor
 * @returns {string|null} - The prompt template or null if not found
 */
export const loadPromptTemplate = (processorId) => {
  try {
    const promptPath = path.join(process.cwd(), `src/core/ai-actions/${processorId}/prompt.txt`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    console.warn(`Prompt template file not found for ${processorId}`);
    return null;
  } catch (error) {
    console.error(`Error loading prompt template for ${processorId}:`, error);
    return null;
  }
};

/**
 * Load all prompt templates for all processors
 * @param {Array} processorIds - Array of processor IDs
 * @returns {Object} - Map of processor IDs to prompt templates
 */
export const loadAllPromptTemplates = (processorIds) => {
  const templates = {};
  
  processorIds.forEach(id => {
    const template = loadPromptTemplate(id);
    if (template) {
      templates[id] = template;
    }
  });
  
  return templates;
};
