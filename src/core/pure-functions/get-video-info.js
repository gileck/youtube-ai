/**
 * Pure functions for fetching and processing YouTube video information
 * This module handles retrieving video metadata such as title, description,
 * channel name, publication date, etc.
 */
const https = require('https');

/**
 * Extracts the video ID from a YouTube URL
 * @param {string} url - The YouTube URL
 * @returns {string|null} - The video ID or null if not found
 */
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Fetches detailed information about a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<Object>} - Object containing video details
 */
async function getVideoInfo(videoId) {
  try {
    const htmlContent = await fetchVideoPage(videoId);
    
    // Extract all the video information from the HTML
    const title = extractVideoTitle(htmlContent, videoId);
    const description = extractVideoDescription(htmlContent, videoId);
    const channelName = extractChannelName(htmlContent, videoId);
    const channelId = extractChannelId(htmlContent);
    const publishDate = extractPublishDate(htmlContent);
    const viewCount = extractViewCount(htmlContent);
    const duration = extractDuration(htmlContent);
    const thumbnails = generateThumbnailUrls(videoId);
    
    return {
      videoId,
      title,
      description,
      channel: {
        name: channelName,
        id: channelId,
        url: channelId ? `https://www.youtube.com/channel/${channelId}` : null
      },
      publishDate,
      viewCount,
      duration,
      thumbnails,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    console.error(`Error fetching video info for ${videoId}:`, error);
    // Return basic info even if there's an error
    return {
      videoId,
      title: `Video ${videoId}`,
      description: '',
      channel: { name: '', id: null, url: null },
      publishDate: null,
      viewCount: null,
      duration: null,
      thumbnails: generateThumbnailUrls(videoId),
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }
}

/**
 * Fetches the HTML content of a YouTube video page
 * @param {string} videoId - The YouTube video ID
 * @returns {Promise<string>} - The HTML content
 */
function fetchVideoPage(videoId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      console.error(`Error fetching video ${videoId}:`, error);
      reject(error);
    });
  });
}

/**
 * Extracts the video title from HTML content
 * @param {string} html - The HTML content
 * @param {string} videoId - The YouTube video ID (for fallback)
 * @returns {string} - The video title
 */
function extractVideoTitle(html, videoId) {
  try {
    // Try to extract the title from the HTML
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch && titleMatch[1]) {
      // Clean up the title (remove " - YouTube" suffix)
      let title = titleMatch[1].replace(/ - YouTube$/, '');
      
      // Decode HTML entities
      title = decodeHtmlEntities(title);
      
      return title;
    }
    
    // Alternative method to extract title
    const altTitleMatch = html.match(/"title":"(.*?)"/);
    if (altTitleMatch && altTitleMatch[1]) {
      let title = altTitleMatch[1];
      
      // Decode HTML entities
      title = decodeHtmlEntities(title);
      
      return title;
    }
    
    // Another alternative from meta tags
    const metaTitleMatch = html.match(/<meta property="og:title" content="(.*?)">/);
    if (metaTitleMatch && metaTitleMatch[1]) {
      return decodeHtmlEntities(metaTitleMatch[1]);
    }
    
    return `Video ${videoId}`; // Fallback title
  } catch (error) {
    console.error(`Error extracting title for video ${videoId}:`, error);
    return `Video ${videoId}`; // Fallback title
  }
}

/**
 * Extracts the video description from HTML content
 * @param {string} html - The HTML content
 * @param {string} videoId - The YouTube video ID (for logging)
 * @returns {string} - The video description
 */
function extractVideoDescription(html, videoId) {
  try {
    // Try to extract the description from the HTML
    const descriptionMatch = html.match(/"description":{"simpleText":"(.*?)"}/);
    if (descriptionMatch && descriptionMatch[1]) {
      // Decode HTML entities
      const description = descriptionMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      return description;
    }
    
    // Alternative method to extract description
    const altDescMatch = html.match(/<meta name="description" content="(.*?)">/);
    if (altDescMatch && altDescMatch[1]) {
      return decodeHtmlEntities(altDescMatch[1]);
    }
    
    // Another alternative from meta tags
    const metaDescMatch = html.match(/<meta property="og:description" content="(.*?)">/);
    if (metaDescMatch && metaDescMatch[1]) {
      return decodeHtmlEntities(metaDescMatch[1]);
    }
    
    return ''; // Fallback empty description
  } catch (error) {
    console.error(`Error extracting description for video ${videoId}:`, error);
    return ''; // Fallback empty description
  }
}

/**
 * Extracts the channel name from HTML content
 * @param {string} html - The HTML content
 * @param {string} videoId - The YouTube video ID (for logging)
 * @returns {string} - The channel name
 */
function extractChannelName(html, videoId) {
  try {
    // Try to extract the channel name from the HTML
    const channelMatch = html.match(/"ownerChannelName":"(.*?)"/);
    if (channelMatch && channelMatch[1]) {
      return decodeHtmlEntities(channelMatch[1]);
    }
    
    // Alternative method
    const altChannelMatch = html.match(/<link itemprop="name" content="(.*?)">/);
    if (altChannelMatch && altChannelMatch[1]) {
      return decodeHtmlEntities(altChannelMatch[1]);
    }
    
    return ''; // Fallback empty channel name
  } catch (error) {
    console.error(`Error extracting channel name for video ${videoId}:`, error);
    return ''; // Fallback empty channel name
  }
}

/**
 * Extracts the channel ID from HTML content
 * @param {string} html - The HTML content
 * @returns {string|null} - The channel ID or null if not found
 */
function extractChannelId(html) {
  try {
    // Try to extract the channel ID from the HTML
    const channelIdMatch = html.match(/"channelId":"(.*?)"/);
    if (channelIdMatch && channelIdMatch[1]) {
      return channelIdMatch[1];
    }
    
    // Alternative method
    const altChannelIdMatch = html.match(/\/channel\/([\w-]+)/);
    if (altChannelIdMatch && altChannelIdMatch[1]) {
      return altChannelIdMatch[1];
    }
    
    return null; // Fallback null channel ID
  } catch (error) {
    console.error('Error extracting channel ID:', error);
    return null; // Fallback null channel ID
  }
}

/**
 * Extracts the publish date from HTML content
 * @param {string} html - The HTML content
 * @returns {string|null} - The publish date or null if not found
 */
function extractPublishDate(html) {
  try {
    // Try to extract the publish date from the HTML
    const dateMatch = html.match(/"publishDate":"(.*?)"/);
    if (dateMatch && dateMatch[1]) {
      return dateMatch[1]; // Format: YYYY-MM-DD
    }
    
    // Alternative method
    const altDateMatch = html.match(/<meta itemprop="datePublished" content="(.*?)">/);
    if (altDateMatch && altDateMatch[1]) {
      return altDateMatch[1];
    }
    
    return null; // Fallback null publish date
  } catch (error) {
    console.error('Error extracting publish date:', error);
    return null; // Fallback null publish date
  }
}

/**
 * Extracts the view count from HTML content
 * @param {string} html - The HTML content
 * @returns {number|null} - The view count or null if not found
 */
function extractViewCount(html) {
  try {
    // Try to extract the view count from the HTML
    const viewCountMatch = html.match(/"viewCount":"(.*?)"/);
    if (viewCountMatch && viewCountMatch[1]) {
      return parseInt(viewCountMatch[1], 10);
    }
    
    // Alternative method
    const altViewCountMatch = html.match(/<meta itemprop="interactionCount" content="(.*?)">/);
    if (altViewCountMatch && altViewCountMatch[1]) {
      return parseInt(altViewCountMatch[1], 10);
    }
    
    return null; // Fallback null view count
  } catch (error) {
    console.error('Error extracting view count:', error);
    return null; // Fallback null view count
  }
}

/**
 * Extracts the video duration from HTML content
 * @param {string} html - The HTML content
 * @returns {string|null} - The duration in ISO 8601 format or null if not found
 */
function extractDuration(html) {
  try {
    // Try to extract the duration from the HTML
    const durationMatch = html.match(/"lengthSeconds":"(.*?)"/);
    if (durationMatch && durationMatch[1]) {
      const seconds = parseInt(durationMatch[1], 10);
      // Convert to ISO 8601 duration format
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      let isoDuration = 'PT';
      if (hours > 0) isoDuration += `${hours}H`;
      if (minutes > 0) isoDuration += `${minutes}M`;
      if (remainingSeconds > 0) isoDuration += `${remainingSeconds}S`;
      
      return isoDuration;
    }
    
    // Alternative method
    const altDurationMatch = html.match(/<meta itemprop="duration" content="(.*?)">/);
    if (altDurationMatch && altDurationMatch[1]) {
      return altDurationMatch[1];
    }
    
    return null; // Fallback null duration
  } catch (error) {
    console.error('Error extracting duration:', error);
    return null; // Fallback null duration
  }
}

/**
 * Generates thumbnail URLs for a YouTube video
 * @param {string} videoId - The YouTube video ID
 * @returns {Object} - Object containing thumbnail URLs
 */
function generateThumbnailUrls(videoId) {
  return {
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    standard: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  };
}

/**
 * Decodes HTML entities in a string
 * @param {string} text - The text to decode
 * @returns {string} - The decoded text
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026amp;/g, '&')
    .replace(/\\u0026lt;/g, '<')
    .replace(/\\u0026gt;/g, '>')
    .replace(/\\u0026quot;/g, '"')
    .replace(/\\u0026#39;/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

module.exports = {
  extractVideoId,
  getVideoInfo,
  fetchVideoPage,
  extractVideoTitle,
  extractVideoDescription,
  extractChannelName,
  extractChannelId,
  extractPublishDate,
  extractViewCount,
  extractDuration,
  generateThumbnailUrls
};
