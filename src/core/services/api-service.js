import axios from 'axios';
import config from '../../config';

// Create an axios instance
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Event for API cost notifications
export const triggerApiCostEvent = (operation, cost, fromCache) => {
  // Use a custom event to communicate with the ApiCostContext
  const event = new CustomEvent('api-cost', {
    detail: { operation, cost, fromCache }
  });
  
  // Dispatch the event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
};

// Helper functions for common API operations
export const apiService = {
  // Video info
  getVideoInfo: async (videoId) => {
    try {
      const response = await apiClient.get(`/videos/info?videoId=${videoId}`);
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      const cost = fromCache ? 0 : config.youtube.api.costPerRequest.videoInfo;
      
      // Trigger cost event
      triggerApiCostEvent('Video Info', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching video info:', error);
      throw error;
    }
  },
  
  // Search videos
  searchVideos: async (query) => {
    try {
      const response = await apiClient.get(`/videos/search?q=${encodeURIComponent(query)}`);
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      const cost = fromCache ? 0 : config.youtube.api.costPerRequest.videoSearch;
      
      // Trigger cost event
      triggerApiCostEvent('Video Search', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  },
  
  // Channel info
  getChannelInfo: async (channelId) => {
    try {
      const response = await apiClient.get(`/channel/info?channelId=${channelId}`);
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      const cost = fromCache ? 0 : config.youtube.api.costPerRequest.channelInfo;
      
      // Trigger cost event
      triggerApiCostEvent('Channel Info', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching channel info:', error);
      throw error;
    }
  },
  
  // Channel search
  searchChannels: async (query) => {
    try {
      const response = await apiClient.get(`/channel/search?q=${encodeURIComponent(query)}`);
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      const cost = fromCache ? 0 : config.youtube.api.costPerRequest.search;
      
      // Trigger cost event
      triggerApiCostEvent('Channel Search', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error searching channels:', error);
      throw error;
    }
  },

  // Channel videos
  getChannelVideos: async (params) => {
    try {
      // Convert params object to query string
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });

      const response = await apiClient.get(`/channel/videos?${queryParams.toString()}`);
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      const cost = fromCache ? 0 : config.youtube.api.costPerRequest.search;
      
      // Trigger cost event
      triggerApiCostEvent('Channel Videos', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  },

  // Summarize video
  summarizeVideo: async (youtubeUrl) => {
    try {
      const response = await apiClient.post('/summarize', {
        youtubeUrl
      });
      
      // Check if response contains cache info
      const fromCache = response.data?.fromCache || false;
      // Summarization might use multiple API calls, so we use a higher cost estimate
      const cost = fromCache ? 0 : 100; // Assuming summarization costs 100 units
      
      // Trigger cost event
      triggerApiCostEvent('Video Summarization', cost, fromCache);
      
      return response.data;
    } catch (error) {
      console.error('Error summarizing video:', error);
      throw error;
    }
  },

  // Check if summary exists in cache
  checkSummaryCache: async (videoId) => {
    try {
      const response = await apiClient.post('/check-cache', {
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
      });
      
      // No cost for checking cache
      return response.data;
    } catch (error) {
      console.error('Error checking summary cache:', error);
      throw error;
    }
  }
};

export default apiClient;
