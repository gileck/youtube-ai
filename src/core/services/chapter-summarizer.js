const fs = require('fs');
const path = require('path');
const { AIAdapterFactory } = require('../ai');
const TextChunker = require('../utils/text-chunker');
const Pricing = require('../utils/pricing');
const Currency = require('../utils/currency');
const Models = require('../utils/models');
const ModelManager = require('../utils/model-manager');

/**
 * Service for summarizing transcript chapters using AI
 */
class ChapterSummarizer {
  /**
   * Constructor for the ChapterSummarizer
   * @param {Object} config - Configuration for the summarizer
   */
  constructor(config = {}) {
    this.config = {
      model: ModelManager.getDefaultModelName(),
      includeChapterBreakdown: true,
      currency: 'ILS', // Default currency is ILS
      parallelProcessing: true, // Enable parallel processing
      maxConcurrentRequests: 5, // Maximum number of concurrent API requests
      includeVideoMetadata: true, // Whether to include video title and description in prompts
      ...config
    };
  }

  /**
   * Load prompt from the prompt text file
   * @returns {string} - The loaded prompt
   */
  loadPrompt() {
    try {
      // Try to load prompt from the path specified in config
      const promptFile = this.config.promptFile || 'prompt.txt';
      
      // Try multiple possible locations for the prompt file
      const possiblePaths = [
        // Relative to the current working directory
        path.join(process.cwd(), promptFile),
        // Relative to the client-app directory
        path.join(process.cwd(), '..', promptFile),
        // Absolute path if provided
        promptFile
      ];
      
      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath, 'utf8');
        }
      }
      
      // If no prompt file is found, return a default prompt
      return `You are an AI assistant that summarizes YouTube video transcripts. 
Please provide a concise summary of the following transcript.
Focus on the main points, key insights, and important details.
Organize your summary in a clear, readable format.`;
    } catch (error) {
      console.error('Error loading prompt:', error);
      // Return a default prompt if there's an error
      return `You are an AI assistant that summarizes YouTube video transcripts. 
Please provide a concise summary of the following transcript.
Focus on the main points, key insights, and important details.
Organize your summary in a clear, readable format.`;
    }
  }

  /**
   * Get the system prompt for summarization
   * @returns {string} - The system prompt
   */
  getPrompt() {
    return this.config.prompt || this.loadPrompt();
  }

  /**
   * Create an AI adapter for the specified model
   * @param {string} modelName - The model name
   * @returns {Promise<Object>} - The initialized AI adapter
   */
  async createAdapter(modelName) {
    return await AIAdapterFactory.createAdapter(modelName);
  }

  /**
   * Generate a summary for a chapter
   * @param {Object} adapter - The AI adapter
   * @param {Object} chapter - The chapter object with title and content
   * @param {Object} videoMetadata - Optional video metadata (title, description)
   * @returns {Promise<Object>} - The generated summary with chapter title and usage info
   */
  async generateChapterSummary(adapter, chapter, videoMetadata = null) {
    const systemPrompt = this.getPrompt();

    // Construct user prompt with only data, no instructions
    let userPrompt = 'YOUTUBE VIDEO CHAPTER TRANSCRIPT\n\n';
    
    if (this.config.includeVideoMetadata && videoMetadata && videoMetadata.title) {
      userPrompt += `VIDEO TITLE: ${videoMetadata.title}\n\n`;
    }
    
    userPrompt += `CHAPTER: ${chapter.title}\n\nCONTENT:\n${chapter.content}`;

    // Generate summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);

    return {
      title: chapter.title,
      summary: result.text,
      usage: result.usage
    };
  }

  /**
   * Combine chapter summaries into a final summary
   * @param {Object} adapter - The AI adapter
   * @param {Array} chapterSummaries - Array of chapter summaries
   * @param {Object} videoMetadata - Optional video metadata (title, description)
   * @returns {Promise<Object>} - The final combined summary with usage info
   */
  async combineChapterSummaries(adapter, chapterSummaries, videoMetadata = null) {
    const systemPrompt = this.getPrompt();

    // Format chapter summaries
    const formattedChapters = chapterSummaries.map(chapter =>
      `CHAPTER: ${chapter.title}\nSUMMARY: ${chapter.summary}`
    ).join('\n\n');

    // Construct user prompt with only data, no instructions
    let userPrompt = 'YOUTUBE VIDEO CHAPTER SUMMARIES\n\n';
    
    if (this.config.includeVideoMetadata && videoMetadata) {
      if (videoMetadata.title) {
        userPrompt += `VIDEO TITLE: ${videoMetadata.title}\n\n`;
      }
      
      if (videoMetadata.description) {
        const shortDescription = videoMetadata.description.length > 500 
          ? videoMetadata.description.substring(0, 500) + '...' 
          : videoMetadata.description;
        userPrompt += `VIDEO DESCRIPTION: ${shortDescription}\n\n`;
      }
    }
    
    userPrompt += `CHAPTER SUMMARIES:\n\n${formattedChapters}`;

    // Generate combined summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);
    
    return {
      text: result.text,
      usage: result.usage
    };
  }

  /**
   * Process chapters in parallel batches
   * @param {Object} adapter - The AI adapter
   * @param {Array} chapters - Array of chapters to process
   * @param {Object} videoMetadata - Optional video metadata (title, description)
   * @returns {Promise<Object>} - Object with chapter summaries and usage info
   */
  async processChaptersInParallel(adapter, chapters, videoMetadata = null) {
    const maxConcurrent = this.config.maxConcurrentRequests;
    const chapterSummaries = [];
    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    // Process chapters in batches
    for (let i = 0; i < chapters.length; i += maxConcurrent) {
      const batch = chapters.slice(i, i + maxConcurrent);
      console.log(`Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(chapters.length / maxConcurrent)} (${batch.length} chapters)`);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(chapter => this.generateChapterSummary(adapter, chapter, videoMetadata))
      );
      
      // Add results to chapter summaries
      chapterSummaries.push(...batchResults);
      
      // Accumulate token usage
      for (const result of batchResults) {
        usage.promptTokens += result.usage.promptTokens;
        usage.completionTokens += result.usage.completionTokens;
        usage.totalTokens += result.usage.totalTokens;
      }
    }

    return {
      chapterSummaries,
      usage
    };
  }

  /**
   * Format cost with currency conversion if needed
   * @param {Object} cost - Cost object from Pricing.calculateCost
   * @returns {Object} - Formatted cost with currency conversion
   */
  formatCost(cost) {
    const currency = this.config.currency || 'USD';
    
    if (currency === 'USD') {
      return {
        ...cost,
        inputCostFormatted: `$${cost.inputCost.toFixed(4)}`,
        outputCostFormatted: `$${cost.outputCost.toFixed(4)}`,
        totalCostFormatted: `$${cost.totalCost.toFixed(4)}`,
        currency: 'USD',
        exchangeRate: 1
      };
    } else {
      // Convert USD to the specified currency
      const exchangeRate = Currency.getExchangeRate('USD', currency);
      const inputCostConverted = cost.inputCost * exchangeRate;
      const outputCostConverted = cost.outputCost * exchangeRate;
      const totalCostConverted = cost.totalCost * exchangeRate;
      
      return {
        ...cost,
        inputCostFormatted: `${Currency.formatAmount(inputCostConverted, currency)}`,
        outputCostFormatted: `${Currency.formatAmount(outputCostConverted, currency)}`,
        totalCostFormatted: `${Currency.formatAmount(totalCostConverted, currency)}`,
        currency,
        exchangeRate
      };
    }
  }

  /**
   * Estimate the cost of summarizing chapters
   * @param {Object} chapterContent - Object with chapter titles as keys and content as values
   * @param {Object} options - Options for the summary generation
   * @param {Object} videoMetadata - Optional video metadata (title, description)
   * @returns {Promise<Object>} - The estimated cost information
   */
  async estimateCost(chapterContent, options = {}, videoMetadata = null) {
    // Merge options with defaults
    const config = { ...this.config, ...options };
    
    // Convert chapters to array format
    const chapters = Object.entries(chapterContent).map(([title, content]) => ({
      title,
      content
    }));
    
    // Calculate total input tokens
    const totalInputTokens = chapters.reduce((total, chapter) => {
      // Tokens for chapter content
      const contentTokens = TextChunker.estimateTokenCount(chapter.content);
      
      // Tokens for prompt template
      const promptTemplateTokens = TextChunker.estimateTokenCount(
        `Here is a chapter from a transcript to summarize:\n\nChapter: ${chapter.title}\n\nContent:\n\nPlease provide a concise summary of this chapter.`
      );
      
      return total + contentTokens + promptTemplateTokens;
    }, 0);
    
    // Add tokens for video metadata if included
    let metadataTokens = 0;
    if (config.includeVideoMetadata && videoMetadata) {
      if (videoMetadata.title) {
        metadataTokens += TextChunker.estimateTokenCount(videoMetadata.title);
      }
      if (videoMetadata.description) {
        const shortDescription = videoMetadata.description.length > 500 
          ? videoMetadata.description.substring(0, 500) + '...' 
          : videoMetadata.description;
        metadataTokens += TextChunker.estimateTokenCount(shortDescription);
      }
    }
    
    // Estimate output tokens for chapter summaries
    const estimatedChapterOutputTokens = Math.min(
      2000 * chapters.length,
      Math.ceil((totalInputTokens + metadataTokens) * 0.15)
    );
    
    // Estimate tokens for combining summaries
    const combinePromptTokens = TextChunker.estimateTokenCount(
      `I have summaries of individual chapters from a transcript that need to be combined into a cohesive final summary. Please create a well-structured summary that captures all the key points without redundancy.\n\nHere are the chapter summaries:`
    );
    
    // Estimate tokens for the final combined summary
    const estimatedFinalOutputTokens = Math.min(2000, Math.ceil(estimatedChapterOutputTokens * 0.5));
    
    // Total estimated tokens
    const totalEstimatedInputTokens = totalInputTokens + metadataTokens + combinePromptTokens + estimatedChapterOutputTokens;
    const totalEstimatedOutputTokens = estimatedChapterOutputTokens + estimatedFinalOutputTokens;
    
    // Calculate cost
    const costEstimate = Pricing.calculateCost(
      config.model,
      totalEstimatedInputTokens,
      totalEstimatedOutputTokens
    );
    
    // Format cost
    const formattedCost = this.formatCost(costEstimate);
    
    // Find the cheapest model
    const cheapestModel = Pricing.getCheapestModel(
      totalEstimatedInputTokens,
      totalEstimatedOutputTokens
    );
    
    // Format cost for cheapest model
    const formattedCheapestCost = this.formatCost(cheapestModel);
    
    // Calculate number of API calls
    const numberOfAPICalls = chapters.length + 1; // One call per chapter + one for combining
    
    // Calculate number of batches for parallel processing
    const numberOfBatches = Math.ceil(chapters.length / config.maxConcurrentRequests);
    
    return {
      model: costEstimate.model,
      inputTokens: totalEstimatedInputTokens,
      outputTokens: totalEstimatedOutputTokens,
      inputCost: costEstimate.inputCost,
      outputCost: costEstimate.outputCost,
      totalCost: costEstimate.totalCost,
      inputCostFormatted: formattedCost.inputCostFormatted,
      outputCostFormatted: formattedCost.outputCostFormatted,
      totalCostFormatted: formattedCost.totalCostFormatted,
      currency: formattedCost.currency,
      exchangeRate: formattedCost.exchangeRate,
      numberOfChapters: chapters.length,
      numberOfAPICalls,
      numberOfBatches,
      cheapestModel: cheapestModel.model !== costEstimate.model ? {
        ...cheapestModel,
        totalCostFormatted: formattedCheapestCost.totalCostFormatted
      } : null
    };
  }

  /**
   * Summarize transcript chapters
   * @param {Object} chapterContent - Object with chapter titles as keys and chapter content as values
   * @param {Object} options - Options for the summary generation
   * @param {Object} videoMetadata - Optional video metadata (title, description)
   * @returns {Promise<Object>} - The summary result with text and usage information
   */
  async summarizeChapters(chapterContent, options = {}, videoMetadata = null) {
    // Validate input
    if (!chapterContent || typeof chapterContent !== 'object' || Object.keys(chapterContent).length === 0) {
      throw new Error('Invalid chapter content. Must be an object with chapter titles as keys and content as values.');
    }

    // Merge options with defaults
    const config = { ...this.config, ...options };

    // Create adapter for the specified model
    const adapter = await this.createAdapter(config.model);

    // Convert chapters to array format
    const chapters = Object.entries(chapterContent).map(([title, content]) => ({
      title,
      content
    }));

    // Calculate total input tokens for estimation
    const totalInputTokens = chapters.reduce((total, chapter) => {
      return total + TextChunker.estimateTokenCount(chapter.content);
    }, 0);

    // Add tokens for video metadata if included
    let metadataTokens = 0;
    if (config.includeVideoMetadata && videoMetadata) {
      if (videoMetadata.title) {
        metadataTokens += TextChunker.estimateTokenCount(videoMetadata.title);
      }
      if (videoMetadata.description) {
        const shortDescription = videoMetadata.description.length > 500 
          ? videoMetadata.description.substring(0, 500) + '...' 
          : videoMetadata.description;
        metadataTokens += TextChunker.estimateTokenCount(shortDescription);
      }
    }

    // Estimate output tokens
    const estimatedOutputTokens = Math.min(4000, Math.ceil((totalInputTokens + metadataTokens) * 0.2));

    // Calculate estimated cost
    const costEstimate = Pricing.calculateCost(config.model, totalInputTokens + metadataTokens, estimatedOutputTokens);
    console.log(`\nEstimated API Cost for Chapter Summarization:`);
    console.log(`Model: ${costEstimate.model}`);
    console.log(`Input: ${(totalInputTokens + metadataTokens).toLocaleString()} tokens ($${costEstimate.inputCost.toFixed(4)})`);
    console.log(`Output: ~${estimatedOutputTokens.toLocaleString()} tokens ($${costEstimate.outputCost.toFixed(4)})`);
    console.log(`Total: $${costEstimate.totalCost.toFixed(4)}`);

    // Find the cheapest model
    const cheapestModel = Pricing.getCheapestModel(totalInputTokens + metadataTokens, estimatedOutputTokens);
    if (cheapestModel.model !== costEstimate.model) {
      console.log(`\nTip: Using ${cheapestModel.model} would cost $${cheapestModel.totalCost.toFixed(4)} (${((1 - cheapestModel.totalCost / costEstimate.totalCost) * 100).toFixed(1)}% cheaper)`);
    }

    // Track start time for actual token usage calculation
    const startTime = Date.now();

    // Process chapters
    let chapterSummaries = [];
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    if (config.parallelProcessing && chapters.length > 0) {
      console.log(`Processing ${chapters.length} chapters in parallel (max ${config.maxConcurrentRequests} concurrent requests)`);
      
      // Process chapters in batches
      const maxConcurrent = config.maxConcurrentRequests;
      
      for (let i = 0; i < chapters.length; i += maxConcurrent) {
        const batch = chapters.slice(i, i + maxConcurrent);
        console.log(`Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(chapters.length / maxConcurrent)} (${batch.length} chapters)`);
        
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(chapter => this.generateChapterSummary(adapter, chapter, videoMetadata))
        );
        
        // Add results to chapter summaries
        chapterSummaries.push(...batchResults);
        
        // Accumulate token usage
        for (const result of batchResults) {
          usage.promptTokens += result.usage.promptTokens;
          usage.completionTokens += result.usage.completionTokens;
          usage.totalTokens += result.usage.totalTokens;
        }
      }
    } else if (chapters.length > 0) {
      // Process each chapter sequentially
      console.log(`Processing ${chapters.length} chapters sequentially`);
      for (const chapter of chapters) {
        const chapterResult = await this.generateChapterSummary(adapter, chapter, videoMetadata);
        chapterSummaries.push(chapterResult);
        
        // Accumulate token usage
        usage.promptTokens += chapterResult.usage.promptTokens;
        usage.completionTokens += chapterResult.usage.completionTokens;
        usage.totalTokens += chapterResult.usage.totalTokens;
      }
    }

    // Combine chapter summaries into a final summary
    let summary = "No chapters found to summarize.";
    if (chapterSummaries.length > 0) {
      console.log('Combining chapter summaries into final summary');
      const combinedSummary = await this.combineChapterSummaries(adapter, chapterSummaries, videoMetadata);
      summary = combinedSummary.text;
      
      // Add token usage for the final combination step
      usage.promptTokens += combinedSummary.usage.promptTokens;
      usage.completionTokens += combinedSummary.usage.completionTokens;
      usage.totalTokens += combinedSummary.usage.totalTokens;
    }

    // Calculate processing time
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate actual cost based on usage
    const actualCost = Pricing.calculateCost(config.model, usage.promptTokens, usage.completionTokens);
    const formattedCost = this.formatCost(actualCost);

    console.log(`\nActual API Cost:`);
    console.log(`Model: ${actualCost.model}`);
    console.log(`Input: ${usage.promptTokens.toLocaleString()} tokens (${formattedCost.inputCostFormatted})`);
    console.log(`Output: ${usage.completionTokens.toLocaleString()} tokens (${formattedCost.outputCostFormatted})`);
    console.log(`Total: ${formattedCost.totalCostFormatted}`);
    if (formattedCost.currency !== 'USD') {
      console.log(`Exchange rate: 1 USD = ${formattedCost.exchangeRate} ${formattedCost.currency}`);
    }
    console.log(`Processing time: ${processingTime} seconds`);

    return {
      text: summary,
      usage,
      cost: {
        ...actualCost,
        ...formattedCost
      },
      processingTime: parseFloat(processingTime),
      chapterSummaries: chapterSummaries.map(chapter => ({
        title: chapter.title,
        summary: chapter.summary
      }))
    };
  }
}

module.exports = ChapterSummarizer;
