/**
 * Client-side YouTube API usage tracker
 * 
 * This utility helps track YouTube API usage on the client side
 * by updating the usage counter based on API responses.
 */

/**
 * Update the API usage counter based on an API response
 * @param {Object} response - API response object
 * @param {string} apiType - Type of API call (search, channelInfo, videos, other)
 */
export const updateApiUsageFromResponse = (response, apiType = 'other') => {
  try {
    if (!response || !response.data) return;
    
    // Check if the response contains apiCost field
    const apiCost = response.data.apiCost || 0;
    
    // Check if this was a cached response (multiple ways to detect)
    const fromCache = 
      // Explicit fromCache flag in response data (from server)
      response.data.fromCache === true || 
      // Config flag (from axios interceptor)
      response.config?.fromCache === true || 
      // Headers (from axios interceptor)
      (response.headers && response.headers['x-from-cache'] === 'true');
    
    console.log(`[Client API Tracker] Response for ${apiType}: fromCache=${fromCache}, apiCost=${apiCost}`);
    
    // Only update quota usage for non-cached responses
    if (apiCost > 0 && !fromCache) {
      // Get current API usage from localStorage
      const savedCount = localStorage.getItem('youtube_api_call_count');
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
      
      // Parse existing data if available
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
        }
      }
      
      // Update the counter
      apiCallCount.daily += apiCost;
      apiCallCount.timestamp = Date.now();
      
      // Update breakdown
      if (apiType === 'search') {
        apiCallCount.breakdown.search += apiCost;
      } else if (apiType === 'channelInfo') {
        apiCallCount.breakdown.channelInfo += apiCost;
      } else if (apiType === 'videos') {
        apiCallCount.breakdown.videos += apiCost;
      } else {
        apiCallCount.breakdown.other += apiCost;
      }
      
      // Save back to localStorage
      localStorage.setItem('youtube_api_call_count', JSON.stringify(apiCallCount));
      localStorage.setItem('youtube_api_usage_breakdown', JSON.stringify(apiCallCount.breakdown));
      
      // Track history of API usage
      const history = JSON.parse(localStorage.getItem('youtube_api_usage_history') || '[]');
      history.push({
        date: new Date().toISOString(),
        action: 'api_call',
        count: apiCost,
        type: apiType,
        details: `Added ${apiCost} units for ${apiType} (client-side tracking)`
      });
      
      // Keep only the last 50 entries
      if (history.length > 50) {
        history.shift();
      }
      
      localStorage.setItem('youtube_api_usage_history', JSON.stringify(history));
      
      console.log(`[Client API Tracker] Updated API usage: +${apiCost} units for ${apiType}. Total: ${apiCallCount.daily}`);
    } else if (fromCache) {
      console.log(`[Client API Tracker] Skipping quota update for cached response (${apiType})`);
    }
    
    // Always log to the API call history, even for cached responses
    logToApiCallHistory(response, apiType, apiCost, fromCache);
    
  } catch (e) {
    console.error('Error updating API usage from response:', e);
  }
};

/**
 * Log API call to the API call history
 * @param {Object} response - API response object
 * @param {string} apiType - Type of API call
 * @param {number} quotaCost - Quota cost of the API call
 * @param {boolean} fromCache - Whether the response was from cache
 */
export const logToApiCallHistory = (response, apiType, quotaCost, fromCache = false) => {
  try {
    if (!response) return;
    
    // Get the endpoint from the request URL
    const url = response.config?.url || 'unknown';
    const endpoint = url.split('/').slice(-2).join('/');
    
    // Get the parameters from the request
    const params = response.config?.params || {};
    
    // Determine status based on cache and response
    let status = 'success';
    if (fromCache) {
      status = 'cache_hit';
    } else if (response.config?.metadata?.fromInflight) {
      status = 'in_flight_reuse';
    }
    
    // Create a history entry
    const historyEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      endpoint,
      params,
      cacheKey: `${endpoint}:${JSON.stringify(params)}`,
      quotaCost: fromCache ? 0 : quotaCost, // No quota cost for cached responses
      fromCache,
      status,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      duration: response.config?.metadata?.duration || 0,
      response: {
        status: response.status,
        statusText: response.statusText,
        data: response.data ? JSON.stringify(response.data).substring(0, 500) + (JSON.stringify(response.data).length > 500 ? '...' : '') : null
      },
      apiType
    };
    
    // Get existing history or initialize new array
    const history = JSON.parse(localStorage.getItem('youtube_api_call_history') || '[]');
    
    // Add new entry to the beginning of the array (newest first)
    history.unshift(historyEntry);
    
    // Limit history size to prevent localStorage from growing too large
    const maxHistorySize = 100;
    const trimmedHistory = history.slice(0, maxHistorySize);
    
    // Save back to localStorage
    localStorage.setItem('youtube_api_call_history', JSON.stringify(trimmedHistory));
    
    console.log(`[Client API Tracker] Added entry to API call history for ${endpoint} (fromCache: ${fromCache})`);
  } catch (e) {
    console.error('Error logging to API call history:', e);
  }
};

export default {
  updateApiUsageFromResponse,
  logToApiCallHistory
};
