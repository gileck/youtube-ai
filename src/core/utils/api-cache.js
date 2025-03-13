/**
 * API Caching and Rate Limiting Utility
 * 
 * This utility provides caching and rate limiting for YouTube API calls
 * to prevent exceeding the daily quota limit.
 */

// In-memory cache for API responses
const memoryCache = new Map();

// Track API usage
let apiCallCount = {
  daily: 0,
  timestamp: Date.now(),
  breakdown: {
    search: 0,
    channelInfo: 0,
    videos: 0,
    other: 0
  }
};

// Try to load previous API call count from localStorage (will work on client-side only)
try {
  if (typeof window !== 'undefined') {
    const savedCount = localStorage.getItem('youtube_api_call_count');
    if (savedCount) {
      const parsed = JSON.parse(savedCount);
      // Only use saved count if it's from today
      const isToday = new Date(parsed.timestamp).toDateString() === new Date().toDateString();
      if (isToday) {
        apiCallCount = {
          ...parsed,
          // Ensure breakdown exists even if loading from older version
          breakdown: parsed.breakdown || {
            search: 0,
            channelInfo: 0,
            videos: 0,
            other: 0
          }
        };
      } else {
        // Reset count for new day
        localStorage.setItem('youtube_api_call_count', JSON.stringify(apiCallCount));
      }
    }
    
    // Also load breakdown if available
    const savedBreakdown = localStorage.getItem('youtube_api_usage_breakdown');
    if (savedBreakdown && isToday) {
      apiCallCount.breakdown = JSON.parse(savedBreakdown);
    }
  }
} catch (e) {
  console.error('Error loading API call count from localStorage:', e);
}

/**
 * Update the API call count
 * @param {number} count - Number of quota units to add
 * @param {string} type - Type of API call (search, channelInfo, videos, other)
 */
const updateApiCallCount = (count = 1, type = 'other') => {
  // Ensure count is a number
  count = Number(count) || 1;
  
  // Update total daily count
  apiCallCount.daily += count;
  apiCallCount.timestamp = Date.now();
  
  // Update breakdown
  if (type === 'search') {
    apiCallCount.breakdown.search += count;
  } else if (type === 'channelInfo') {
    apiCallCount.breakdown.channelInfo += count;
  } else if (type === 'videos') {
    apiCallCount.breakdown.videos += count;
  } else {
    apiCallCount.breakdown.other += count;
  }
  
  // Save to localStorage if available
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('youtube_api_call_count', JSON.stringify(apiCallCount));
      localStorage.setItem('youtube_api_usage_breakdown', JSON.stringify(apiCallCount.breakdown));
      
      // Track history of API usage
      const history = JSON.parse(localStorage.getItem('youtube_api_usage_history') || '[]');
      history.push({
        date: new Date().toISOString(),
        action: 'api_call',
        count: count,
        type: type,
        details: `Added ${count} units for ${type}`
      });
      
      // Keep only the last 50 entries
      if (history.length > 50) {
        history.shift();
      }
      
      localStorage.setItem('youtube_api_usage_history', JSON.stringify(history));
      
      // Log the update for debugging
      console.log(`[API Usage] Added ${count} units for ${type}. Total: ${apiCallCount.daily}`);
    }
  } catch (e) {
    console.error('Error saving API call count to localStorage:', e);
  }
};

/**
 * Get the current API call count
 * @returns {Object} The current API call count
 */
const getApiCallCount = () => {
  return { ...apiCallCount };
};

/**
 * Check if we're approaching the API quota limit
 * @param {number} quotaLimit - The daily quota limit (default: 10000)
 * @returns {boolean} True if approaching limit
 */
const isApproachingQuotaLimit = (quotaLimit = 10000) => {
  // Consider approaching limit if we've used 80% of quota
  return apiCallCount.daily > quotaLimit * 0.8;
};

/**
 * Check if we've exceeded the API quota limit
 * @param {number} quotaLimit - The daily quota limit (default: 10000)
 * @returns {boolean} True if exceeded limit
 */
const hasExceededQuotaLimit = (quotaLimit = 10000) => {
  return apiCallCount.daily >= quotaLimit;
};

/**
 * Generate a cache key from request parameters
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {string} Cache key
 */
const generateCacheKey = (endpoint, params) => {
  // Sort the params to ensure consistent keys regardless of property order
  const sortedParams = {};
  if (params) {
    Object.keys(params).sort().forEach(key => {
      sortedParams[key] = params[key];
    });
  }
  
  // Create a stable string representation
  return `${endpoint}:${JSON.stringify(sortedParams)}`;
};

/**
 * Get cached response if available
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached response or null
 */
const getCachedResponse = (cacheKey) => {
  // Check memory cache first
  if (memoryCache.has(cacheKey)) {
    const cachedItem = memoryCache.get(cacheKey);
    if (Date.now() < cachedItem.expiresAt) {
      console.log(`[API Cache] Memory cache hit for ${cacheKey}`);
      return cachedItem.data;
    }
    // Remove expired item
    console.log(`[API Cache] Memory cache expired for ${cacheKey}`);
    memoryCache.delete(cacheKey);
  }
  
  // Check localStorage cache if available
  try {
    if (typeof window !== 'undefined') {
      const localCache = localStorage.getItem(`yt_cache_${cacheKey}`);
      if (localCache) {
        try {
          const cachedItem = JSON.parse(localCache);
          if (Date.now() < cachedItem.expiresAt) {
            // Refresh memory cache
            console.log(`[API Cache] LocalStorage cache hit for ${cacheKey}`);
            memoryCache.set(cacheKey, cachedItem);
            return cachedItem.data;
          }
          // Remove expired item
          console.log(`[API Cache] LocalStorage cache expired for ${cacheKey}`);
          localStorage.removeItem(`yt_cache_${cacheKey}`);
        } catch (parseError) {
          console.error(`[API Cache] Error parsing cached item for ${cacheKey}:`, parseError);
          localStorage.removeItem(`yt_cache_${cacheKey}`);
        }
      }
    }
  } catch (e) {
    console.error('Error reading from localStorage cache:', e);
  }
  
  console.log(`[API Cache] No cache found for ${cacheKey}`);
  return null;
};

/**
 * Cache API response
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Response data
 * @param {number} ttl - Time to live in milliseconds
 */
const cacheResponse = (cacheKey, data, ttl = 3600000) => { // Default: 1 hour
  const cacheItem = {
    data,
    expiresAt: Date.now() + ttl
  };
  
  // Cache in memory
  memoryCache.set(cacheKey, cacheItem);
  console.log(`[API Cache] Cached in memory: ${cacheKey}`);
  
  // Cache in localStorage if available
  try {
    if (typeof window !== 'undefined') {
      const cacheString = JSON.stringify(cacheItem);
      localStorage.setItem(`yt_cache_${cacheKey}`, cacheString);
      console.log(`[API Cache] Cached in localStorage: ${cacheKey}`);
    }
  } catch (e) {
    console.error('Error writing to localStorage cache:', e);
  }
};

// Track in-flight requests to prevent duplicate calls
const inflightRequests = new Map();

/**
 * Make an API request with caching and rate limiting
 * @param {Function} requestFn - Function that makes the actual API request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @param {Object} options - Options for caching and rate limiting
 * @returns {Promise<Object>} API response with cache status
 */
const cachedRequest = async (requestFn, endpoint, params, options = {}) => {
  const {
    ttl = 3600000, // Default: 1 hour
    bypassCache = false,
    quotaLimit = 10000,
    quotaCost = 1, // Default cost of 1 unit per request
    forceNetwork = false, // Force network request even if approaching quota
    apiType = 'other' // Type of API call for tracking
  } = options;
  
  // Generate cache key
  const cacheKey = generateCacheKey(endpoint, params);
  
  // Check if we're exceeding quota
  if (hasExceededQuotaLimit(quotaLimit) && !forceNetwork) {
    throw new Error('YouTube API quota exceeded. Please try again tomorrow.');
  }
  
  // Check if we're approaching quota limit
  if (isApproachingQuotaLimit(quotaLimit) && !forceNetwork) {
    // Use cached data if available, regardless of TTL
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      logApiCallToHistory({
        endpoint,
        params,
        cacheKey,
        quotaCost: 0, // No quota cost for cache hit
        fromCache: true,
        status: 'cache_hit_quota_limit',
        timestamp: Date.now(),
        apiType
      });
      
      console.log(`[API Cache] Cache hit for ${endpoint}`);
      return { response: cachedData, fromCache: true };
    }
    // If no cache and approaching limit, proceed with caution
    console.warn('Approaching YouTube API quota limit. Using network request with caution.');
  }
  
  // Check cache if not bypassing
  if (!bypassCache) {
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      logApiCallToHistory({
        endpoint,
        params,
        cacheKey,
        quotaCost: 0, // No quota cost for cache hit
        fromCache: true,
        status: 'cache_hit',
        timestamp: Date.now(),
        apiType
      });
      
      console.log(`[API Cache] Cache hit for ${endpoint}`);
      return { response: cachedData, fromCache: true };
    }
  }
  
  // Check for in-flight request with same parameters
  if (inflightRequests.has(cacheKey)) {
    logApiCallToHistory({
      endpoint,
      params,
      cacheKey,
      quotaCost: 0, // No additional quota cost for in-flight request
      fromCache: false,
      status: 'in_flight_reuse',
      timestamp: Date.now(),
      apiType
    });
    
    // Wait for the existing request to complete
    console.log(`[API Cache] Using in-flight request for ${endpoint}`);
    const result = await inflightRequests.get(cacheKey);
    return { response: result, fromCache: false, fromInflight: true };
  }
  
  // Make the request and store the promise
  const requestPromise = (async () => {
    let response;
    let error;
    let status = 'success';
    const startTime = Date.now();
    
    try {
      console.log(`[API Cache] Making network request for ${endpoint} (quota cost: ${quotaCost})`);
      response = await requestFn();
      
      // Update API call count with type and correct quota cost
      // This follows the YouTube Data API v3 Quota Calculator guidelines
      updateApiCallCount(quotaCost, apiType);
      
      // Cache the response
      cacheResponse(cacheKey, response, ttl);
      
      return response;
    } catch (err) {
      error = err;
      status = 'error';
      throw err;
    } finally {
      // Remove from in-flight requests
      inflightRequests.delete(cacheKey);
      
      // Log the API call to history
      logApiCallToHistory({
        endpoint,
        params,
        cacheKey,
        quotaCost,
        fromCache: false,
        status,
        timestamp: startTime,
        duration: Date.now() - startTime,
        response: response ? {
          status: response.status,
          statusText: response.statusText,
          data: response.data ? JSON.stringify(response.data).substring(0, 500) + (JSON.stringify(response.data).length > 500 ? '...' : '') : null
        } : null,
        error: error ? {
          message: error.message,
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data ? JSON.stringify(error.response.data).substring(0, 500) + (JSON.stringify(error.response.data).length > 500 ? '...' : '') : null
          } : null
        } : null,
        apiType
      });
    }
  })();
  
  // Store the promise to prevent duplicate requests
  inflightRequests.set(cacheKey, requestPromise);
  
  // Wait for the request to complete
  const response = await requestPromise;
  
  // Add cache status to the response
  if (response && response.data) {
    response.data.fromCache = false;
  }
  
  return { response, fromCache: false };
};

/**
 * Log API call to history in localStorage
 * @param {Object} callDetails - Details of the API call
 */
const logApiCallToHistory = (callDetails) => {
  try {
    if (typeof window !== 'undefined') {
      // Get existing history or initialize new array
      const history = JSON.parse(localStorage.getItem('youtube_api_call_history') || '[]');
      
      // Add new entry to the beginning of the array (newest first)
      history.unshift({
        id: generateUniqueId(),
        ...callDetails,
        date: new Date().toISOString()
      });
      
      // Limit history size to prevent localStorage from growing too large
      const maxHistorySize = 100;
      const trimmedHistory = history.slice(0, maxHistorySize);
      
      // Save back to localStorage
      localStorage.setItem('youtube_api_call_history', JSON.stringify(trimmedHistory));
    }
  } catch (e) {
    console.error('Error saving API call to history:', e);
  }
};

/**
 * Generate a unique ID for history entries
 * @returns {string} Unique ID
 */
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

/**
 * Get the API call history
 * @returns {Array} API call history
 */
const getApiCallHistory = () => {
  try {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('youtube_api_call_history');
      return history ? JSON.parse(history) : [];
    }
  } catch (e) {
    console.error('Error loading API call history:', e);
  }
  return [];
};

/**
 * Clear the API call history
 */
const clearApiCallHistory = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('youtube_api_call_history');
    }
  } catch (e) {
    console.error('Error clearing API call history:', e);
  }
};

// Export the utilities
module.exports = {
  cachedRequest,
  getCachedResponse,
  cacheResponse,
  generateCacheKey,
  updateApiCallCount,
  getApiCallCount,
  isApproachingQuotaLimit,
  hasExceededQuotaLimit,
  logApiCallToHistory,
  getApiCallHistory,
  clearApiCallHistory
};
