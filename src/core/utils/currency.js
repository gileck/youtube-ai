/**
 * Currency utility for converting USD to other currencies
 */

// Exchange rates (USD to other currencies)
// These can be updated manually as needed
const EXCHANGE_RATES = {
  USD: 1.0,
  ILS: 3.65,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 150.5,
  CAD: 1.35,
  AUD: 1.52
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  ILS: '₪',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
};

/**
 * Convert an amount from USD to another currency
 * @param {number} usdAmount - Amount in USD
 * @param {string} targetCurrency - Target currency code (USD, ILS, EUR, etc.)
 * @returns {Object} - Converted amount and rate information
 */
function convertFromUsd(usdAmount, targetCurrency = 'USD') {
  // Default to USD if currency not supported
  if (!EXCHANGE_RATES[targetCurrency]) {
    targetCurrency = 'USD';
  }
  
  const rate = EXCHANGE_RATES[targetCurrency];
  const convertedAmount = usdAmount * rate;
  const symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  return {
    usdAmount,
    convertedAmount,
    rate,
    targetCurrency,
    formattedUsd: `$${usdAmount.toFixed(4)}`,
    formattedConverted: `${symbol}${convertedAmount.toFixed(4)}`
  };
}

/**
 * Get list of supported currencies with their symbols
 * @returns {Array} - Array of currency objects with code and symbol
 */
function getSupportedCurrencies() {
  return Object.keys(EXCHANGE_RATES).map(code => ({
    code,
    symbol: CURRENCY_SYMBOLS[code],
    rate: EXCHANGE_RATES[code]
  }));
}

// For backward compatibility
function convertUsdToIls(usdAmount) {
  return convertFromUsd(usdAmount, 'ILS');
}

module.exports = {
  convertFromUsd,
  convertUsdToIls,
  getSupportedCurrencies,
  USD_TO_ILS_RATE: EXCHANGE_RATES.ILS,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS
};
