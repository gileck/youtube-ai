// API route for managing cache entries by key
import cache from './cache';

export default function handler(req, res) {
  const { key } = req.query;

  if (req.method === 'DELETE') {
    try {
      const success = cache.delete(key);

      if (success) {
        res.json({ success: true, message: 'Cache entry deleted' });
      } else {
        res.status(404).json({ success: false, error: 'Cache entry not found' });
      }
    } catch (error) {
      console.error('Error deleting cache entry:', error);
      res.status(500).json({ error: 'Failed to delete cache entry' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
