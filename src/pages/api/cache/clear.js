// API route for clearing the entire cache
import cache from './cache';

export default function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      cache.clear();
      res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
