// API route for clearing the entire cache
import cache from './cache';

export default function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      cache.clear();
      res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.json({ 
        success: false, 
        error: 'Failed to clear cache',
        message: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
