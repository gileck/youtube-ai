/**
 * Shared processor utilities
 * These utilities are used by both client and server code
 * and do not import any server-only modules
 */

/**
 * Process a chapter to extract content using a prompt template
 * @param {Object} params - Processing parameters
 * @param {string} params.text - The chapter text
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {string} params.promptTemplate - The prompt template to use
 * @param {Object} params.config - Processor configuration
 * @param {Object} params.options - Additional options
 * @param {Function} params.parseResult - Function to parse the result
 * @returns {Promise<Object>} - The processed result
 */
export const processWithTemplate = async ({ 
  text, 
  videoMetadata, 
  adapter, 
  promptTemplate,
  config,
  options = {},
  parseResult
}) => {
  // Prepare the prompt by replacing placeholders
  const userPrompt = promptTemplate
    .replace('{title}', videoMetadata.title || 'Unknown')
    .replace('{transcript}', text);
  
  const systemPrompt = options.systemPrompt || "You are an AI assistant that processes video transcripts.";
  
  // Generate the completion using the AI adapter
  const result = await adapter.generateCompletion(systemPrompt, userPrompt, {
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    ...options
  });
  
  // Parse the response using the provided parser function
  const parsedText = parseResult ? parseResult(result.text) : result.text;
  
  return {
    text: parsedText,
    usage: result.usage
  };
};

/**
 * Process a transcript with optional chapter-based processing
 * @param {Object} params - Processing parameters
 * @param {string} params.transcript - The full transcript
 * @param {Array} params.chapters - The chapters (if available)
 * @param {Object} params.videoMetadata - Video metadata
 * @param {Object} params.adapter - AI adapter to use
 * @param {string} params.promptTemplate - The prompt template to use
 * @param {Object} params.config - Processor configuration
 * @param {Object} params.options - Additional options
 * @param {Function} params.processChapter - Function to process a single chapter
 * @param {Function} params.consolidateResults - Function to consolidate results from multiple chapters
 * @returns {Promise<Object>} - The processed result
 */
export const processTranscript = async ({
  transcript,
  chapters,
  videoMetadata,
  adapter,
  promptTemplate,
  config,
  options = {},
  processChapter,
  consolidateResults
}) => {
  const startTime = Date.now();
  
  let result = { text: null };
  let totalUsage = { promptTokens: 0, completionTokens: 0 };
  
  const useChapters = config.inputType === 'CHAPTERS' && chapters && chapters.length > 0;
  
  if (useChapters) {
    // Process each chapter individually
    const chapterResults = await Promise.all(
      chapters.map(chapter => 
        processChapter({
          text: chapter.text,
          videoMetadata: {
            ...videoMetadata,
            title: `${videoMetadata.title} - ${chapter.title}`
          },
          adapter,
          promptTemplate,
          config,
          options
        })
      )
    );
    
    // Sum up token usage
    chapterResults.forEach(chapterResult => {
      if (chapterResult.usage) {
        totalUsage.promptTokens += chapterResult.usage.promptTokens || 0;
        totalUsage.completionTokens += chapterResult.usage.completionTokens || 0;
      }
    });
    
    // Consolidate results if needed
    if (consolidateResults) {
      const consolidationResult = await consolidateResults({
        chapterResults,
        adapter,
        config,
        options,
        videoMetadata
      });
      
      result.text = consolidationResult.text;
      
      // Add consolidation usage to total
      if (consolidationResult.usage) {
        totalUsage.promptTokens += consolidationResult.usage.promptTokens || 0;
        totalUsage.completionTokens += consolidationResult.usage.completionTokens || 0;
      }
    } else {
      // Use a simple combination of all chapter results
      result.text = chapterResults.flatMap(r => r.text);
    }
  } else {
    // Process the full transcript
    result = await processChapter({
      text: transcript,
      videoMetadata,
      adapter,
      promptTemplate,
      config,
      options
    });
    
    totalUsage = result.usage || totalUsage;
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    text: result.text,
    usage: totalUsage,
    processingTime
  };
};
