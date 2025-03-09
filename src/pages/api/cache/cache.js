/**
 * Cache service for Next.js API routes
 * Provides in-memory caching with optional persistence to file system
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Set up persistence directory
    this.persistenceEnabled = process.env.CACHE_PERSISTENCE !== 'false';
    this.persistenceDir = path.join(process.cwd(), '.cache');
    
    if (this.persistenceEnabled && !fs.existsSync(this.persistenceDir)) {
      try {
        fs.mkdirSync(this.persistenceDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create cache directory:', error);
        this.persistenceEnabled = false;
      }
    }
    
    // Load cache from disk on startup if persistence is enabled
    this.loadFromDisk();
  }

  /**
   * Generate a cache key from an object
   * @param {Object} params - Parameters to generate key from
   * @returns {string} - Cache key
   */
  generateKey(params) {
    return Object.entries(params)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join('_');
  }

  /**
   * Get an item from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null if not found
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      
      // Try to load from disk if not in memory and persistence is enabled
      if (this.persistenceEnabled) {
        const diskItem = this.loadItemFromDisk(key);
        if (diskItem) {
          this.cache.set(key, diskItem);
          
          // Check if item has expired
          if (diskItem.expiry && diskItem.expiry < Date.now()) {
            this.delete(key);
            return null;
          }
          
          this.stats.hits++;
          return diskItem.value;
        }
      }
      
      return null;
    }

    // Check if item has expired
    if (item.expiry && item.expiry < Date.now()) {
      this.delete(key);
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Set an item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl = null) {
    const item = {
      value,
      created: Date.now(),
      expiry: ttl ? Date.now() + (ttl * 1000) : null
    };

    this.cache.set(key, item);
    this.stats.sets++;
    
    // Persist to disk if enabled
    if (this.persistenceEnabled) {
      this.saveItemToDisk(key, item);
    }
    
    return true;
  }

  /**
   * Delete an item from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if item was deleted, false if not found
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
      
      // Delete from disk if persistence is enabled
      if (this.persistenceEnabled) {
        this.deleteItemFromDisk(key);
      }
    }
    
    return deleted;
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    
    // Clear disk cache if persistence is enabled
    if (this.persistenceEnabled) {
      this.clearDiskCache();
    }
    
    return true;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    // Calculate total size of cache items
    let totalSize = 0;
    for (const key of this.cache.keys()) {
      const item = this.cache.get(key);
      totalSize += JSON.stringify(item).length;
    }
    
    // Format size
    const sizeFormatted = formatSize(totalSize);
    
    return {
      ...this.stats,
      size: this.cache.size,
      count: this.cache.size,
      totalSize,
      sizeFormatted,
      keys: Array.from(this.cache.keys()),
      persistenceEnabled: this.persistenceEnabled
    };
  }
  
  /**
   * Hash a cache key for safe filesystem use
   * @private
   * @param {string} key - Cache key
   * @returns {string} - Hashed key
   */
  hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }
  
  /**
   * Save an item to disk
   * @private
   * @param {string} key - Cache key
   * @param {Object} item - Cache item
   */
  saveItemToDisk(key, item) {
    if (!this.persistenceEnabled) return;
    
    try {
      // Ensure the directory exists before writing
      if (!fs.existsSync(this.persistenceDir)) {
        fs.mkdirSync(this.persistenceDir, { recursive: true });
      }
      
      const hashedKey = this.hashKey(key);
      const filePath = path.join(this.persistenceDir, `${hashedKey}.json`);
      fs.writeFileSync(filePath, JSON.stringify({ originalKey: key, ...item }));
    } catch (error) {
      console.error(`Failed to save cache item to disk: ${key}`, error);
    }
  }
  
  /**
   * Load an item from disk
   * @private
   * @param {string} key - Cache key
   * @returns {Object|null} - Cache item or null if not found
   */
  loadItemFromDisk(key) {
    if (!this.persistenceEnabled) return null;
    
    try {
      const hashedKey = this.hashKey(key);
      const filePath = path.join(this.persistenceDir, `${hashedKey}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = fs.readFileSync(filePath, 'utf-8');
      const item = JSON.parse(data);
      
      // Return the item without the originalKey metadata
      if (item.originalKey) {
        const { originalKey, ...itemWithoutKey } = item;
        return itemWithoutKey;
      }
      
      return item;
    } catch (error) {
      console.error(`Failed to load cache item from disk: ${key}`, error);
      return null;
    }
  }
  
  /**
   * Delete an item from disk
   * @private
   * @param {string} key - Cache key
   */
  deleteItemFromDisk(key) {
    if (!this.persistenceEnabled) return;
    
    try {
      const hashedKey = this.hashKey(key);
      const filePath = path.join(this.persistenceDir, `${hashedKey}.json`);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete cache item from disk: ${key}`, error);
    }
  }
  
  /**
   * Clear all items from disk
   * @private
   */
  clearDiskCache() {
    if (!this.persistenceEnabled) return;
    
    try {
      const files = fs.readdirSync(this.persistenceDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.persistenceDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to clear disk cache', error);
    }
  }
  
  /**
   * Load all cache items from disk
   * @private
   */
  loadFromDisk() {
    if (!this.persistenceEnabled) return;
    
    try {
      if (!fs.existsSync(this.persistenceDir)) {
        return;
      }
      
      const files = fs.readdirSync(this.persistenceDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.persistenceDir, file);
            const data = fs.readFileSync(filePath, 'utf-8');
            const item = JSON.parse(data);
            
            // Skip expired items
            if (item.expiry && item.expiry < Date.now()) {
              fs.unlinkSync(filePath);
              continue;
            }
            
            // We need to store the item with its original key
            // Since we can't reverse the hash, we'll store it with a special metadata key
            if (item.originalKey) {
              this.cache.set(item.originalKey, item);
            } else {
              // For backward compatibility with existing cache files
              const key = file.replace('.json', '');
              this.cache.set(key, item);
            }
          } catch (error) {
            console.error(`Failed to load cache file: ${file}`, error);
            // Continue to next file on error
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cache from disk', error);
    }
  }
}

/**
 * Format byte size to human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create singleton instance
const cache = new CacheService();

// Export the singleton
export default cache;
