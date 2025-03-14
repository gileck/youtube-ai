// API route for getting supported currencies
import Currency from '../../core/utils/currency';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const currencies = Currency.getSupportedCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error getting currencies:', error);
    res.status(200).json({ 
      success: false,
      error: 'Failed to get currencies',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
