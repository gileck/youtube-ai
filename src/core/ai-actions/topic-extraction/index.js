/**
 * Topic Extraction processor module
 * Exports all functionality for the topic extraction processor
 */

import definition from './definition';
import config, { INPUT_TYPE } from './config';
import ProcessorRenderer from './ProcessorRenderer';
import { processWithTemplate, processTranscript } from '../shared/processor-utils';

// Default prompt template for client-side use
const DEFAULT_PROMPT_TEMPLATE = `You are an AI assistant that extracts and organizes the main topics from video transcripts.

Analyze the following transcript of a YouTube video titled "{title}" and identify the main topics discussed.
For each topic, provide a title and a brief description of what was covered.

TRANSCRIPT:
{transcript}

OUTPUT FORMAT:
Provide the topics as an array of objects, each with a "name" and "description" field. 
The name should be a short title for the topic, and the description should be a concise summary in markdown format.`;

/**
 * Parse topics from AI response
 * @param {string} text - The AI response text
 * @returns {Array} - Array of topic objects
 */
const parseTopics = (text) => {
  let topics = [];
  try {
    // Try to parse as JSON if the response is in JSON format
    const responseText = text.trim();
    if (responseText.startsWith('[') && responseText.endsWith(']')) {
      topics = JSON.parse(responseText);
    } else {
      // Simple fallback parsing for non-JSON responses
      const topicSections = responseText.split(/Topic\s*\d+:/i).filter(Boolean);
      topics = topicSections.map((section, index) => {
        const lines = section.trim().split('\n').filter(Boolean);
        const name = lines[0]?.trim() || `Topic ${index + 1}`;
        const description = lines.slice(1).join('\n').trim();
        return { name, description };
      });
    }
  } catch (error) {
    console.error('Error parsing topics:', error);
    // Fallback to a single topic with the raw text
    topics = [{ name: 'Content Overview', description: text }];
  }
  return topics;
};

/**
 * Process a chapter to extract topics
 * @param {Object} params - Processing parameters
 * @param {string} params.text - The chapter text
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {string} params.promptTemplate - The prompt template to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The topics result for this chapter
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
      systemPrompt: "You are an AI assistant that extracts and organizes the main topics from video transcripts."
    },
    parseResult: parseTopics
  });
};

/**
 * Consolidate topics from multiple chapters
 * @param {Object} params - Consolidation parameters
 * @param {Array} params.chapterResults - Results from individual chapters
 * @param {Object} params.adapter - AI adapter to use
 * @param {Object} params.config - Processor configuration
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - Consolidated topics
 */
const consolidateChapterResults = async ({ 
  chapterResults, 
  adapter, 
  config, 
  options = {} 
}) => {
  // Extract all topics from chapter results
  const allChapterTopics = chapterResults.flatMap(result => result.text);
  
  // If there aren't too many topics, return them directly
  if (allChapterTopics.length <= 10) {
    return {
      text: allChapterTopics,
      usage: { promptTokens: 0, completionTokens: 0 }
    };
  }
  
  // Create a consolidated prompt with all the topics
  const consolidationPrompt = `
I have extracted topics from different sections of a video. Please review these topics and provide a consolidated list of the 5-7 most important and non-redundant topics.

EXTRACTED TOPICS:
${allChapterTopics.map(topic => `- ${topic.name}: ${topic.description}`).join('\n\n')}

OUTPUT FORMAT:
Provide the consolidated topics as an array of objects, each with a "name" and "description" field. 
The name should be a short title for the topic, and the description should be a concise summary in markdown format.
  `;
  
  const systemPrompt = "You are an AI assistant that consolidates topics from video transcripts.";
  
  // Generate the completion using the AI adapter
  const result = await adapter.generateCompletion(systemPrompt, consolidationPrompt, {
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    ...options
  });
  
  // Parse the consolidated response
  return {
    text: parseTopics(result.text),
    usage: result.usage || { promptTokens: 0, completionTokens: 0 }
  };
};

/**
 * Process a transcript to extract topics
 * @param {Object} params - Processing parameters
 * @param {string} params.transcript - The full transcript
 * @param {Array} params.chapters - The chapters (if available)
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {Object} params.options - Additional options
 * @returns {Promise<Object>} - The topics result
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
