/**
 * Axios Interceptors for API Call Tracking
 * 
 * This file sets up Axios interceptors to track API call durations
 * and other metadata needed for accurate API usage tracking.
 */

import axios from 'axios';

// Create a cache for request URLs to detect duplicate requests
const requestCache = new Map();

// Set up request interceptor to track request start time
axios.interceptors.request.use(
  config => {
    // Add metadata to track request timing
    config.metadata = {
      startTime: Date.now()
    };
    
    // Check if this is a GET request that might be cached
    if (config.method === 'get') {
      // Create a cache key from the URL and params
      const params = config.params ? JSON.stringify(config.params) : '';
      const cacheKey = `${config.url}:${params}`;
      
      // Check if we've seen this request before (might be cached)
      if (requestCache.has(cacheKey)) {
        config.fromCache = true;
        config.metadata.fromCache = true;
        console.log(`[Axios Interceptor] Detected potential cached request: ${cacheKey}`);
      } else {
        // Add to request cache with a TTL of 1 hour
        requestCache.set(cacheKey, Date.now());
        
        // Clean up old cache entries
        setTimeout(() => {
          requestCache.delete(cacheKey);
        }, 3600000); // 1 hour
      }
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Set up response interceptor to calculate request duration
axios.interceptors.response.use(
  response => {
    // Calculate request duration
    const endTime = Date.now();
    const startTime = response.config.metadata.startTime;
    response.config.metadata.duration = endTime - startTime;
    
    // Mark response as cached if it came back very quickly (< 50ms)
    // This is a heuristic to detect cached responses
    if (response.config.metadata.duration < 50 && !response.config.fromCache) {
      console.log(`[Axios Interceptor] Fast response detected (${response.config.metadata.duration}ms), might be cached`);
      response.config.metadata.potentiallyFromCache = true;
      
      // Add a header to indicate this might be from cache
      if (!response.headers) response.headers = {};
      response.headers['x-potentially-from-cache'] = 'true';
    }
    
    // If the response was marked as fromCache in the request interceptor
    if (response.config.fromCache) {
      if (!response.headers) response.headers = {};
      response.headers['x-from-cache'] = 'true';
    }
    
    return response;
  },
  error => {
    // If there's a response, calculate duration for error responses too
    if (error.response && error.response.config && error.response.config.metadata) {
      const endTime = Date.now();
      const startTime = error.response.config.metadata.startTime;
      error.response.config.metadata.duration = endTime - startTime;
    }
    
    return Promise.reject(error);
  }
);

export default axios;
