// API route for getting available models
import Models from '../../core/utils/models';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get model categories
    const models = {
      economy: Models.ECONOMY_MODELS.map(modelId => ({
        id: modelId,
        name: modelId.split('/')[1] || modelId,
        category: 'Economy'
      })),
      standard: Models.STANDARD_MODELS.map(modelId => ({
        id: modelId,
        name: modelId.split('/')[1] || modelId,
        category: 'Standard'
      })),
      premium: Models.PREMIUM_MODELS.map(modelId => ({
        id: modelId,
        name: modelId.split('/')[1] || modelId,
        category: 'Premium'
      }))
    };

    res.json(models);
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
}