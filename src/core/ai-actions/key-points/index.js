/**
 * Key Points processor module
 * Exports all functionality for the key points processor
 */

import definition from './definition';
import config, { INPUT_TYPE } from './config';
import ProcessorRenderer from './ProcessorRenderer';
import { processWithTemplate, processTranscript } from '../shared/processor-utils';

// Default prompt template for client-side use
const DEFAULT_PROMPT_TEMPLATE = `You are an AI assistant that extracts key points from video transcripts.

Extract the 5-10 most important points from the following transcript of a YouTube video titled "{title}".
For each key point, provide a clear and concise statement that captures an important insight, fact, or takeaway from the video.
Focus on the most valuable and actionable information.

TRANSCRIPT:
{transcript}

OUTPUT FORMAT:
Provide the key points as an array of markdown-formatted strings. Each point should be clear, concise, and self-contained.`;

/**
 * Parse key points from AI response
 * @param {string} text - The AI response text
 * @returns {Array} - Array of key points
 */
const parseKeyPoints = (text) => {
  let keyPoints = [];
  try {
    // Try to parse as JSON if the response is in JSON format
    const responseText = text.trim();
    if (responseText.startsWith('[') && responseText.endsWith(']')) {
      keyPoints = JSON.parse(responseText);
    } else {
      // Otherwise, split by lines and filter out empty lines or non-point lines
      keyPoints = responseText
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[-*]\s+/, ''));
    }
  } catch (error) {
    console.error('Error parsing key points:', error);
    // Fallback to the raw text
    keyPoints = [text];
  }
  return keyPoints;
};

/**
 * Process a chapter to extract key points
 * @param {Object} params - Processing parameters
 * @param {string} params.text - The chapter text
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {string} params.promptTemplate - The prompt template to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The key points result for this chapter
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
      systemPrompt: "You are an AI assistant that extracts key points from video transcripts."
    },
    parseResult: parseKeyPoints
  });
};

/**
 * Consolidate key points from multiple chapters
 * @param {Object} params - Consolidation parameters
 * @param {Array} params.chapterResults - Results from individual chapters
 * @param {Object} params.adapter - AI adapter to use
 * @param {Object} params.config - Processor configuration
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - Consolidated key points
 */
const consolidateChapterResults = async ({ 
  chapterResults, 
  adapter, 
  config, 
  options = {} 
}) => {
  // Extract all key points from chapter results
  const allChapterPoints = chapterResults.flatMap(result => result.text);
  
  // If there aren't too many points, return them directly
  if (allChapterPoints.length <= 15) {
    return {
      text: allChapterPoints,
      usage: { promptTokens: 0, completionTokens: 0 }
    };
  }
  
  // Create a consolidated prompt with all the points
  const consolidationPrompt = `
I have extracted key points from different sections of a video. Please review these points and provide a consolidated list of the 7-10 most important and non-redundant points.

EXTRACTED POINTS:
${allChapterPoints.map(point => `- ${point}`).join('\n')}

OUTPUT FORMAT:
Provide the consolidated key points as an array of markdown-formatted strings. Each point should be clear, concise, and self-contained.
  `;
  
  const systemPrompt = "You are an AI assistant that consolidates key points from video transcripts.";
  
  // Generate the completion using the AI adapter
  const result = await adapter.generateCompletion(systemPrompt, consolidationPrompt, {
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    ...options
  });
  
  // Parse the consolidated response
  return {
    text: parseKeyPoints(result.text),
    usage: result.usage || { promptTokens: 0, completionTokens: 0 }
  };
};

/**
 * Process a transcript to extract key points
 * @param {Object} params - Processing parameters
 * @param {string} params.transcript - The full transcript
 * @param {Array} params.chapters - The chapters (if available)
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The key points result
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
    processChapter,
    consolidateResults: consolidateChapterResults
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
