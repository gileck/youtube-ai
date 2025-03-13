/**
 * YouTube API Batch Request Utility
 * 
 * This utility helps optimize YouTube API usage by batching multiple requests
 * into a single API call where possible.
 */

import axios from 'axios';
import config from '../../config';
import apiCache from './api-cache';

// Queue for batching video detail requests
let videoDetailsQueue = [];
let videoDetailsCallbacks = {};
let videoDetailsBatchTimeout = null;

// Queue for batching channel info requests
let channelInfoQueue = [];
let channelInfoCallbacks = {};
let channelInfoBatchTimeout = null;

// Default batch delay (milliseconds)
const BATCH_DELAY = 50;

// Maximum items per batch
const MAX_BATCH_SIZE = 50;

/**
 * Process the video details queue as a batch request
 */
const processVideoDetailsQueue = async () => {
  // Clear the timeout
  videoDetailsBatchTimeout = null;
  
  // If queue is empty, do nothing
  if (videoDetailsQueue.length === 0) return;
  
  // Get the current queue and callbacks
  const currentQueue = [...videoDetailsQueue];
  const currentCallbacks = {...videoDetailsCallbacks};
  
  // Clear the queue and callbacks
  videoDetailsQueue = [];
  videoDetailsCallbacks = {};
  
  // Create a comma-separated list of video IDs
  const videoIds = currentQueue.join(',');
  
  try {
    // Generate cache key
    const cacheKey = `batch_video_details:${videoIds}`;
    
    // Check if we have cached results
    const cachedResponse = apiCache.getCachedResponse(cacheKey);
    if (cachedResponse) {
      // Process cached response for each video
      currentQueue.forEach(videoId => {
        const videoData = cachedResponse.data.items.find(item => item.id === videoId);
        if (videoData && currentCallbacks[videoId]) {
          currentCallbacks[videoId].resolve(videoData);
        } else if (currentCallbacks[videoId]) {
          currentCallbacks[videoId].reject(new Error(`Video ${videoId} not found in batch response`));
        }
      });
      return;
    }
    
    // Calculate quota cost based on YouTube Data API v3 guidelines
    // Video details endpoint costs 1 unit per request, regardless of how many video IDs
    const quotaCost = 1;
    
    // Make the batch request
    const response = await apiCache.cachedRequest(
      // Request function
      () => axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          key: config.youtube?.apiKey || process.env.YOUTUBE_API_KEY,
          id: videoIds,
          part: 'snippet,contentDetails,statistics'
        }
      }),
      // Endpoint for cache key
      'youtube/videos/batch',
      // Parameters for cache key
      { videoIds },
      // Cache options
      { 
        ttl: config.youtube.api.cacheTTL.videoDetails, 
        quotaCost: quotaCost, // Costs 1 unit regardless of how many videos we request
        forceNetwork: false,
        apiType: 'videos' // Track as videos operation
      }
    );
    
    // Process response for each video
    currentQueue.forEach(videoId => {
      const videoData = response.data.items.find(item => item.id === videoId);
      if (videoData && currentCallbacks[videoId]) {
        currentCallbacks[videoId].resolve(videoData);
      } else if (currentCallbacks[videoId]) {
        currentCallbacks[videoId].reject(new Error(`Video ${videoId} not found in batch response`));
      }
    });
  } catch (error) {
    // If there's an error, reject all callbacks
    currentQueue.forEach(videoId => {
      if (currentCallbacks[videoId]) {
        currentCallbacks[videoId].reject(error);
      }
    });
  }
};

/**
 * Process the channel info queue as a batch request
 */
const processChannelInfoQueue = async () => {
  // Clear the timeout
  channelInfoBatchTimeout = null;
  
  // If queue is empty, do nothing
  if (channelInfoQueue.length === 0) return;
  
  // Get the current queue and callbacks
  const currentQueue = [...channelInfoQueue];
  const currentCallbacks = {...channelInfoCallbacks};
  
  // Clear the queue and callbacks
  channelInfoQueue = [];
  channelInfoCallbacks = {};
  
  // Create a comma-separated list of channel IDs
  const channelIds = currentQueue.join(',');
  
  try {
    // Generate cache key
    const cacheKey = `batch_channel_info:${channelIds}`;
    
    // Check if we have cached results
    const cachedResponse = apiCache.getCachedResponse(cacheKey);
    if (cachedResponse) {
      // Process cached response for each channel
      currentQueue.forEach(channelId => {
        const channelData = cachedResponse.data.items.find(item => item.id === channelId);
        if (channelData && currentCallbacks[channelId]) {
          currentCallbacks[channelId].resolve(channelData);
        } else if (currentCallbacks[channelId]) {
          currentCallbacks[channelId].reject(new Error(`Channel ${channelId} not found in batch response`));
        }
      });
      return;
    }
    
    // Calculate quota cost based on YouTube Data API v3 guidelines
    // Channel info endpoint costs 1 unit per request, regardless of how many channel IDs
    const quotaCost = 1;
    
    // Make the batch request
    const response = await apiCache.cachedRequest(
      // Request function
      () => axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          key: config.youtube?.apiKey || process.env.YOUTUBE_API_KEY,
          id: channelIds,
          part: 'snippet,statistics,brandingSettings'
        }
      }),
      // Endpoint for cache key
      'youtube/channels/batch',
      // Parameters for cache key
      { channelIds },
      // Cache options
      { 
        ttl: config.youtube.api.cacheTTL.channelInfo, 
        quotaCost: quotaCost, // Costs 1 unit regardless of how many channels we request
        forceNetwork: false,
        apiType: 'channelInfo' // Track as channelInfo operation
      }
    );
    
    // Process response for each channel
    currentQueue.forEach(channelId => {
      const channelData = response.data.items.find(item => item.id === channelId);
      if (channelData && currentCallbacks[channelId]) {
        currentCallbacks[channelId].resolve(channelData);
      } else if (currentCallbacks[channelId]) {
        currentCallbacks[channelId].reject(new Error(`Channel ${channelId} not found in batch response`));
      }
    });
  } catch (error) {
    // If there's an error, reject all callbacks
    currentQueue.forEach(channelId => {
      if (currentCallbacks[channelId]) {
        currentCallbacks[channelId].reject(error);
      }
    });
  }
};

/**
 * Get video details using batch request
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<Object>} - Promise that resolves with video details
 */
const getVideoDetails = (videoId) => {
  return new Promise((resolve, reject) => {
    // Add to queue
    videoDetailsQueue.push(videoId);
    videoDetailsCallbacks[videoId] = { resolve, reject };
    
    // If queue is getting too large, process immediately
    if (videoDetailsQueue.length >= MAX_BATCH_SIZE) {
      if (videoDetailsBatchTimeout) {
        clearTimeout(videoDetailsBatchTimeout);
      }
      processVideoDetailsQueue();
      return;
    }
    
    // Set timeout to process queue if not already set
    if (!videoDetailsBatchTimeout) {
      videoDetailsBatchTimeout = setTimeout(processVideoDetailsQueue, BATCH_DELAY);
    }
  });
};

/**
 * Get channel info using batch request
 * @param {string} channelId - The YouTube channel ID
 * @returns {Promise<Object>} - Promise that resolves with channel info
 */
const getChannelInfo = (channelId) => {
  return new Promise((resolve, reject) => {
    // Add to queue
    channelInfoQueue.push(channelId);
    channelInfoCallbacks[channelId] = { resolve, reject };
    
    // If queue is getting too large, process immediately
    if (channelInfoQueue.length >= MAX_BATCH_SIZE) {
      if (channelInfoBatchTimeout) {
        clearTimeout(channelInfoBatchTimeout);
      }
      processChannelInfoQueue();
      return;
    }
    
    // Set timeout to process queue if not already set
    if (!channelInfoBatchTimeout) {
      channelInfoBatchTimeout = setTimeout(processChannelInfoQueue, BATCH_DELAY);
    }
  });
};

/**
 * Check if batching is enabled in config
 * @returns {boolean} - True if batching is enabled
 */
const isBatchingEnabled = () => {
  return config.youtube.api.enableBatchRequests !== false;
};

// Export the utilities
export default {
  getVideoDetails,
  getChannelInfo,
  isBatchingEnabled
};
