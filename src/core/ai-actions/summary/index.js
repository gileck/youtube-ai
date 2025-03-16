/**
 * Summary processor module
 * Exports all functionality for the summary processor
 */

import definition from './definition';
import config, { INPUT_TYPE } from './config';
import ProcessorRenderer from './ProcessorRenderer';
import { processWithTemplate, processTranscript } from '../shared/processor-utils';

// Default prompt template for client-side use
const DEFAULT_PROMPT_TEMPLATE = `You are an AI assistant that summarizes video transcripts.

Provide a concise and comprehensive summary of the following transcript of a YouTube video titled "{title}".
Focus on the main ideas, key arguments, and important details.
Make the summary clear, well-structured, and informative.

TRANSCRIPT:
{transcript}

OUTPUT FORMAT:
Provide the summary as a well-formatted markdown text with proper paragraphs, bullet points where appropriate, and clear organization.`;

/**
 * Process a chapter to generate a summary
 * @param {Object} params - Processing parameters
 * @param {string} params.text - The chapter text
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {string} params.promptTemplate - The prompt template to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The summary result for this chapter
 */
const processChapter = async ({ 
  text, 
  videoMetadata, 
  adapter, 
  promptTemplate = DEFAULT_PROMPT_TEMPLATE,
  options = {} 
}) => {
  return processWithTemplate({
    text,
    videoMetadata,
    adapter,
    promptTemplate,
    config,
    options: {
      ...options,
      systemPrompt: "You are an AI assistant that summarizes video transcripts."
    },
    parseResult: (text) => text // No special parsing needed for summary
  });
};

/**
 * Process a transcript to generate a summary
 * @param {Object} params - Processing parameters
 * @param {string} params.transcript - The full transcript
 * @param {Array} params.chapters - The chapters (if available)
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The summary result
 */
const process = async ({ 
  transcript, 
  chapters, 
  videoMetadata, 
  adapter, 
  options = {} 
}) => {
  // Use the provided prompt template or the default one
  const promptTemplate = options.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  
  return processTranscript({
    transcript,
    chapters,
    videoMetadata,
    adapter,
    promptTemplate,
    config,
    options,
    processChapter
    // No consolidation needed for summary as it uses full transcript
  });
};

export {
  definition,
  config,
  INPUT_TYPE,
  ProcessorRenderer,
  process,
  DEFAULT_PROMPT_TEMPLATE as promptTemplate
};
