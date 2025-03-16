import fs from 'fs';
import path from 'path';
import { AIAdapterFactory } from '../ai/index.js';
import TextChunker from '../utils/text-chunker.js';
import * as Pricing from '../utils/pricing.js';
import { convertFromUsd, formatAmount, getExchangeRate } from '../utils/currency.js';
import * as Models from '../utils/models.js';

/**
 * Service for summarizing transcripts using AI
 */
class TranscriptSummarizer {
  /**
   * Constructor for the TranscriptSummarizer
   * @param {Object} config - Configuration for the summarizer
   */
  constructor(config = {}) {
    this.config = {
      model: Models.DEFAULT_MODEL,
      maxTokensPerChunk: 6000,
      overlapTokens: 500,
      includeChapterBreakdown: true,
      chunkingStrategy: 'chapter', // 'token' or 'chapter'
      currency: 'ILS', // Default currency is ILS
      parallelProcessing: true, // Enable parallel processing
      maxConcurrentRequests: 5, // Maximum number of concurrent API requests
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
          console.log(`Loading prompt from: ${filePath}`);
          const promptText = fs.readFileSync(filePath, 'utf-8');
          return promptText.trim();
        }
      }

      console.warn('Prompt file not found, using default prompt');
    } catch (error) {
      console.error('Error loading prompt file:', error);
    }

    // Default prompt if file not found or error
    return "You are a helpful assistant that summarizes YouTube video transcripts. Create a comprehensive summary that captures the key points, main arguments, and important details from the transcript. Organize the summary with clear sections and bullet points where appropriate.";
  }

  /**
   * Get the system prompt for summarization
   * @returns {string} - The system prompt
   */
  getPrompt() {
    return this.loadPrompt();
  }

  /**
   * Create an AI adapter for the specified model
   * @param {string} modelId - The model identifier
   * @returns {Promise<Object>} - The initialized AI adapter
   */
  async createAdapter(modelId) {
    try {
      // Split the model identifier into provider and model name
      const [provider, modelName] = modelId.split('/');

      // Create the adapter using the factory
      const adapter = AIAdapterFactory.createAdapter(provider, {
        model: modelName,
        maxTokens: 4096,
        temperature: 0.7
      });

      // Initialize the adapter
      await adapter.initialize();

      return adapter;
    } catch (error) {
      console.error(`Error creating AI adapter for ${modelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate a summary for a single chunk of text
   * @param {Object} adapter - The AI adapter
   * @param {string} chunk - The chunk of text to summarize
   * @param {boolean} isPartialSummary - Whether this is a partial summary
   * @returns {Promise<string>} - The generated summary
   */
  async generateChunkSummary(adapter, chunk, isPartialSummary = false) {
    const systemPrompt = this.getPrompt();

    // Construct user prompt
    let userPrompt = `Here is a portion of a transcript to summarize:\n\n${chunk}`;
    if (isPartialSummary) {
      userPrompt += "\n\nThis is part of a longer transcript. Please provide a summary of just this section.";
    }

    // Generate summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);
    return result.text;
  }

  /**
   * Combine multiple partial summaries into a final summary
   * @param {Object} adapter - The AI adapter
   * @param {string[]} partialSummaries - Array of partial summaries
   * @returns {Promise<string>} - The final combined summary
   */
  async combinePartialSummaries(adapter, partialSummaries) {
    const systemPrompt = this.getPrompt();

    // Construct user prompt
    const userPrompt = `I have multiple partial summaries of a transcript that need to be combined into a cohesive final summary. Please create a well-structured summary that captures all the key points without redundancy.\n\nHere are the partial summaries:\n\n${partialSummaries.join('\n\n')}`;

    // Generate combined summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);
    return result.text;
  }

  /**
   * Generate a summary for a chapter
   * @param {Object} adapter - The AI adapter
   * @param {Object} chapter - The chapter object with title and content
   * @returns {Promise<Object>} - The generated summary with chapter title
   */
  async generateChapterSummary(adapter, chapter) {
    const systemPrompt = this.getPrompt();

    // Construct user prompt
    const userPrompt = `Here is a chapter from a transcript to summarize:\n\nChapter: ${chapter.title}\n\nContent:\n${chapter.content}\n\nPlease provide a concise summary of this chapter.`;

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
   * @returns {Promise<string>} - The final combined summary
   */
  async combineChapterSummaries(adapter, chapterSummaries) {
    const systemPrompt = this.getPrompt();

    // Format chapter summaries
    const formattedChapters = chapterSummaries.map(chapter =>
      `Chapter: ${chapter.title}\nSummary: ${chapter.summary}`
    ).join('\n\n');

    // Construct user prompt
    const userPrompt = `I have summaries of individual chapters from a transcript that need to be combined into a cohesive final summary. Please create a well-structured summary that captures all the key points without redundancy.\n\nHere are the chapter summaries:\n\n${formattedChapters}`;

    // Generate combined summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);
    return result.text;
  }

  /**
   * Process chapters in parallel batches
   * @param {Object} adapter - The AI adapter
   * @param {Array} chapters - Array of chapters to process
   * @returns {Promise<Array>} - Array of chapter summaries
   */
  async processChaptersInParallel(adapter, chapters) {
    const maxConcurrent = this.config.maxConcurrentRequests;
    const chapterSummaries = [];
    const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    // Process chapters in batches
    for (let i = 0; i < chapters.length; i += maxConcurrent) {
      const batch = chapters.slice(i, i + maxConcurrent);
      console.log(`Processing batch of ${batch.length} chapters (${i + 1}-${Math.min(i + maxConcurrent, chapters.length)} of ${chapters.length})...`);

      // Process batch in parallel
      const batchPromises = batch.map((chapter, index) => {
        console.log(`Starting chapter ${i + index + 1}/${chapters.length}: ${chapter.title}`);
        return this.generateChapterSummary(adapter, chapter);
      });

      // Wait for all chapters in the batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Add results to the summaries array and accumulate usage
      batchResults.forEach((result, index) => {
        console.log(`Completed chapter ${i + index + 1}/${chapters.length}: ${batch[index].title}`);
        chapterSummaries.push(result);

        // Accumulate token usage
        usage.promptTokens += result.usage.promptTokens || TextChunker.estimateTokenCount(batch[index].content);
        usage.completionTokens += result.usage.completionTokens || TextChunker.estimateTokenCount(result.summary);
      });
    }

    usage.totalTokens = usage.promptTokens + usage.completionTokens;
    return { chapterSummaries, usage };
  }

  /**
   * Format cost with currency conversion if needed
   * @param {Object} cost - Cost object from Pricing.calculateCost
   * @returns {Object} - Formatted cost with currency conversion
   */
  formatCost(cost) {
    const formattedCost = { ...cost };

    // Apply currency conversion if needed
    if (this.config.currency !== 'USD') {
      const converted = convertFromUsd(cost.inputCost, this.config.currency);
      const outputCostConverted = convertFromUsd(cost.outputCost, this.config.currency);
      const totalCostConverted = convertFromUsd(cost.totalCost, this.config.currency);

      formattedCost.inputCostFormatted = converted.formatted;
      formattedCost.outputCostFormatted = outputCostConverted.formatted;
      formattedCost.totalCostFormatted = totalCostConverted.formatted;
      formattedCost.currency = this.config.currency;
      formattedCost.exchangeRate = converted.exchangeRate;
    } else {
      // Default to USD
      formattedCost.inputCostFormatted = `$${cost.inputCost.toFixed(4)}`;
      formattedCost.outputCostFormatted = `$${cost.outputCost.toFixed(4)}`;
      formattedCost.totalCostFormatted = `$${cost.totalCost.toFixed(4)}`;
      formattedCost.currency = 'USD';
      formattedCost.exchangeRate = 1;
    }

    return formattedCost;
  }

  /**
   * Estimate the cost of summarizing a transcript
   * @param {string} transcript - The transcript text to summarize
   * @param {Object} options - Options for the summary generation
   * @returns {Promise<Object>} - The estimated cost information
   */
  async estimateCost(transcript, options = {}) {
    // Merge options with defaults
    const config = { ...this.config, ...options };

    // Estimate token count
    const inputTokenCount = TextChunker.estimateTokenCount(transcript);

    // Determine if we need to use chunking
    let totalInputTokens = inputTokenCount;
    let totalOutputTokens = 0;
    let numberOfChunks = 1;
    let numberOfAPICalls = 1; // Start with 1 for the main call

    // Estimate based on chunking strategy
    if (config.chunkingStrategy === 'chapter') {
      // If we have chapter content directly
      if (options.chapterContent && Object.keys(options.chapterContent).length > 0) {
        numberOfChunks = Object.keys(options.chapterContent).length;
      } else {
        // Fallback to token-based estimation
        numberOfChunks = Math.ceil(inputTokenCount / (config.maxTokensPerChunk - config.overlapTokens));
      }

      // If we have chapters, we'll make one API call per chapter plus one for combining
      if (numberOfChunks > 0) {
        numberOfAPICalls = numberOfChunks + 1; // One per chapter + one to combine

        // Estimate tokens for each chapter
        let chapterInputTokens = 0;

        if (options.chapterContent) {
          Object.values(options.chapterContent).forEach(content => {
            const chapterTokens = TextChunker.estimateTokenCount(content);
            chapterInputTokens += chapterTokens;
            // Estimate output tokens as 20% of input, max 2000 per chapter
            totalOutputTokens += Math.min(2000, Math.ceil(chapterTokens * 0.2));
          });
        } else {
          // Rough estimation without actual chapter content
          chapterInputTokens = inputTokenCount;
          totalOutputTokens = Math.min(2000 * numberOfChunks, Math.ceil(inputTokenCount * 0.2));
        }

        // Add tokens for the combining step
        // Assuming each chapter summary is about 20% of the original chapter
        const combiningInputTokens = Math.ceil(chapterInputTokens * 0.2);
        totalInputTokens = chapterInputTokens + combiningInputTokens;
        // Add output tokens for the final summary
        totalOutputTokens += Math.min(4000, Math.ceil(combiningInputTokens * 0.5));
      } else {
        // Fallback to token-based estimation
        totalOutputTokens = Math.min(4000, Math.ceil(inputTokenCount * 0.2));
      }
    } else if (inputTokenCount > config.maxTokensPerChunk) {
      // Token-based chunking
      numberOfChunks = Math.ceil(inputTokenCount / (config.maxTokensPerChunk - config.overlapTokens));
      numberOfAPICalls = numberOfChunks + 1; // One per chunk + one to combine

      // Estimate tokens for chunked processing
      let chunkInputTokens = inputTokenCount;
      // Account for overlap between chunks
      chunkInputTokens += (numberOfChunks - 1) * config.overlapTokens;

      // Estimate output tokens for each chunk (20% of input, max 2000 per chunk)
      const perChunkOutputTokens = Math.min(2000, Math.ceil(config.maxTokensPerChunk * 0.2));
      totalOutputTokens = perChunkOutputTokens * numberOfChunks;

      // Add tokens for the combining step
      const combiningInputTokens = perChunkOutputTokens * numberOfChunks;
      totalInputTokens = chunkInputTokens + combiningInputTokens;
      // Add output tokens for the final summary
      totalOutputTokens += Math.min(4000, Math.ceil(combiningInputTokens * 0.5));
    } else {
      // No chunking needed
      totalOutputTokens = Math.min(4000, Math.ceil(inputTokenCount * 0.2));
    }

    // Calculate estimated cost
    const costEstimate = Pricing.calculateCost(config.model, totalInputTokens, totalOutputTokens);

    // Find the cheapest model
    const cheapestModel = Pricing.getCheapestModel(totalInputTokens, totalOutputTokens);

    // Format cost with currency conversion
    const formattedCost = this.formatCost(costEstimate);
    const formattedCheapestCost = cheapestModel.model !== costEstimate.model ?
      this.formatCost(cheapestModel) : null;

    return {
      model: costEstimate.model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      inputCost: costEstimate.inputCost,
      outputCost: costEstimate.outputCost,
      totalCost: costEstimate.totalCost,
      inputCostFormatted: formattedCost.inputCostFormatted,
      outputCostFormatted: formattedCost.outputCostFormatted,
      totalCostFormatted: formattedCost.totalCostFormatted,
      currency: formattedCost.currency,
      exchangeRate: formattedCost.exchangeRate,
      numberOfChunks,
      numberOfAPICalls,
      cheapestModel: cheapestModel.model !== costEstimate.model ? {
        ...cheapestModel,
        totalCostFormatted: formattedCheapestCost.totalCostFormatted
      } : null
    };
  }

  /**
   * Summarize a transcript
   * @param {string|Object} transcript - The transcript text to summarize or object with chapterContent
   * @param {Object} options - Options for the summary generation
   * @returns {Promise<Object>} - The summary result with text and usage information
   */
  async summarize(transcript, options = {}) {
    // Merge options with defaults
    const config = { ...this.config, ...options };

    // Create adapter for the specified model
    const adapter = await this.createAdapter(config.model);

    // Determine if we have structured chapter content
    const hasChapterContent = options.chapterContent &&
      typeof options.chapterContent === 'object' &&
      Object.keys(options.chapterContent).length > 0;

    // Estimate token count
    let inputTokenCount;
    if (hasChapterContent) {
      // Sum up tokens from all chapters
      inputTokenCount = Object.values(options.chapterContent)
        .reduce((total, content) => total + TextChunker.estimateTokenCount(content), 0);
    } else {
      // Treat transcript as a string
      inputTokenCount = TextChunker.estimateTokenCount(
        typeof transcript === 'string' ? transcript : JSON.stringify(transcript)
      );
    }

    const estimatedOutputTokens = Math.min(4000, Math.ceil(inputTokenCount * 0.2));

    // Calculate estimated cost
    const costEstimate = Pricing.calculateCost(config.model, inputTokenCount, estimatedOutputTokens);
    console.log(`\nEstimated API Cost:`);
    console.log(`Model: ${costEstimate.model}`);
    console.log(`Input: ${inputTokenCount.toLocaleString()} tokens ($${costEstimate.inputCost.toFixed(4)})`);
    console.log(`Output: ~${estimatedOutputTokens.toLocaleString()} tokens ($${costEstimate.outputCost.toFixed(4)})`);
    console.log(`Total: $${costEstimate.totalCost.toFixed(4)}`);

    // Find the cheapest model
    const cheapestModel = Pricing.getCheapestModel(inputTokenCount, estimatedOutputTokens);
    if (cheapestModel.model !== costEstimate.model) {
      console.log(`\nTip: Using ${cheapestModel.model} would cost $${cheapestModel.totalCost.toFixed(4)} (${((1 - cheapestModel.totalCost / costEstimate.totalCost) * 100).toFixed(1)}% cheaper)`);
    }

    // Track start time for actual token usage calculation
    const startTime = Date.now();

    let summary;
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    // Choose chunking strategy based on configuration
    if (config.chunkingStrategy === 'chapter') {
      console.log('Using chapter-based chunking strategy');

      // Process chapters based on whether we have structured chapter content
      let chapters = [];

      if (hasChapterContent) {
        // Use the provided chapter content directly
        chapters = Object.entries(options.chapterContent).map(([title, content]) => ({
          title,
          content
        }));
        console.log(`Using provided chapter content with ${chapters.length} chapters`);
      } else if (typeof transcript === 'string') {
        // Fallback to token-based chunking if no chapters are available
        console.log('No structured chapter content provided. Falling back to token-based chunking.');

        if (inputTokenCount < config.maxTokensPerChunk) {
          // If transcript is small enough, process it directly
          const result = await this.processSmallTranscript(adapter, transcript, config);
          return result;
        } else {
          // For large transcripts without chapters, use token-based chunking
          return this.processLargeTranscriptWithTokenChunking(adapter, transcript, config, startTime);
        }
      }

      // Process chapters
      let chapterSummaries = [];

      if (config.parallelProcessing && chapters.length > 0) {
        console.log(`Processing chapters in parallel (max ${config.maxConcurrentRequests} concurrent requests)`);
        const result = await this.processChaptersInParallel(adapter, chapters);
        chapterSummaries = result.chapterSummaries;
        usage = result.usage;
      } else if (chapters.length > 0) {
        // Process each chapter sequentially
        console.log('Processing chapters sequentially');
        for (let i = 0; i < chapters.length; i++) {
          console.log(`Processing chapter ${i + 1}/${chapters.length}: ${chapters[i].title}`);
          const chapterSummary = await this.generateChapterSummary(adapter, chapters[i]);
          chapterSummaries.push(chapterSummary);

          // Accumulate token usage
          usage.promptTokens += chapterSummary.usage.promptTokens || TextChunker.estimateTokenCount(chapters[i].content);
          usage.completionTokens += chapterSummary.usage.completionTokens || TextChunker.estimateTokenCount(chapterSummary.summary);
        }
      } else {
        // No chapters available, fallback to processing the whole transcript
        console.log('No chapters available. Processing entire transcript.');
        const result = await this.processSmallTranscript(adapter, transcript, config);
        return result;
      }

      // Combine chapter summaries
      console.log('Combining chapter summaries...');
      summary = await this.combineChapterSummaries(adapter, chapterSummaries);

      // Add token usage for combining step (estimated)
      const combinePrompt = chapterSummaries.map(c => c.summary).join('\n\n');
      usage.promptTokens += TextChunker.estimateTokenCount(combinePrompt);
      usage.completionTokens += TextChunker.estimateTokenCount(summary);
      usage.totalTokens = usage.promptTokens + usage.completionTokens;
      usage.isEstimated = true;
    } else {
      // Use token-based chunking
      if (inputTokenCount < config.maxTokensPerChunk) {
        // If transcript is small enough, process it directly
        const result = await this.processSmallTranscript(adapter, transcript, config);
        return result;
      } else {
        // For large transcripts, use token-based chunking
        return this.processLargeTranscriptWithTokenChunking(adapter, transcript, config, startTime);
      }
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
      processingTime: parseFloat(processingTime)
    };
  }

  /**
   * Process a small transcript directly without chunking
   * @param {Object} adapter - The AI adapter
   * @param {string} transcript - The transcript text
   * @param {Object} config - Configuration options
   * @returns {Promise<Object>} - The summary result
   */
  async processSmallTranscript(adapter, transcript, config) {
    const startTime = Date.now();

    // Get the prompt
    const systemPrompt = this.getPrompt();

    // Prepare the user prompt
    const userPrompt = `Please summarize the following YouTube video transcript. ${config.includeChapterBreakdown ? 'Include a breakdown by chapters if available.' : ''
      }\n\nTRANSCRIPT:\n${transcript}`;

    // Generate the summary
    const result = await adapter.generateCompletion(systemPrompt, userPrompt);
    const summary = result.text;
    const usage = result.usage || {
      promptTokens: TextChunker.estimateTokenCount(userPrompt),
      completionTokens: TextChunker.estimateTokenCount(summary),
      totalTokens: 0
    };
    usage.totalTokens = usage.promptTokens + usage.completionTokens;

    // Calculate processing time
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate cost
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
      processingTime: parseFloat(processingTime)
    };
  }

  /**
   * Process a large transcript using token-based chunking
   * @param {Object} adapter - The AI adapter
   * @param {string} transcript - The transcript text
   * @param {Object} config - Configuration options
   * @param {number} startTime - Start time for processing
   * @returns {Promise<Object>} - The summary result
   */
  async processLargeTranscriptWithTokenChunking(adapter, transcript, config, startTime) {
    // For large transcripts, split into chunks and process each chunk
    console.log(`Transcript is too large. Splitting into chunks...`);

    // Split transcript into chunks
    const chunks = TextChunker.splitByTokens(transcript, config.maxTokensPerChunk, config.overlapTokens);
    console.log(`Split transcript into ${chunks.length} chunks`);

    // Process each chunk
    const partialSummaries = [];
    let usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      const partialSummary = await this.generateChunkSummary(adapter, chunks[i], true);
      partialSummaries.push(partialSummary);

      // Accumulate token usage (estimated for chunk processing)
      usage.promptTokens += TextChunker.estimateTokenCount(chunks[i]);
      usage.completionTokens += TextChunker.estimateTokenCount(partialSummary);
    }

    // Combine partial summaries
    console.log('Combining partial summaries...');
    const summary = await this.combinePartialSummaries(adapter, partialSummaries);

    // Add token usage for combining step (estimated)
    const combinePrompt = partialSummaries.join('\n\n');
    usage.promptTokens += TextChunker.estimateTokenCount(combinePrompt);
    usage.completionTokens += TextChunker.estimateTokenCount(summary);
    usage.totalTokens = usage.promptTokens + usage.completionTokens;
    usage.isEstimated = true;

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
      processingTime: parseFloat(processingTime)
    };
  }
}

export default TranscriptSummarizer;
