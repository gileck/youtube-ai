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
 * Get the exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - Exchange rate (fromCurrency to toCurrency)
 */
function getExchangeRate(fromCurrency = 'USD', toCurrency = 'USD') {
  // Default to 1.0 if currencies not supported
  if (!EXCHANGE_RATES[fromCurrency] || !EXCHANGE_RATES[toCurrency]) {
    return 1.0;
  }
  
  // Calculate the exchange rate
  // First convert to USD, then to target currency
  const fromRate = EXCHANGE_RATES[fromCurrency];
  const toRate = EXCHANGE_RATES[toCurrency];
  
  return toRate / fromRate;
}

/**
 * Format an amount with the appropriate currency symbol
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted amount with currency symbol
 */
function formatAmount(amount, currency = 'USD', decimals = 4) {
  // Default to USD if currency not supported
  if (!CURRENCY_SYMBOLS[currency]) {
    currency = 'USD';
  }
  
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toFixed(decimals)}`;
}

/**
 * Get list of supported currencies with their symbols
 * @returns {Array} - Array of currency objects with code and symbol
 */
function getSupportedCurrencies() {
  return Object.keys(EXCHANGE_RATES).map(code => ({
    code,
    symbol: CURRENCY_SYMBOLS[code] || '',
    rate: EXCHANGE_RATES[code]
  }));
}

/**
 * Convert USD to ILS (for backward compatibility)
 * @param {number} usdAmount - Amount in USD
 * @returns {Object} - Conversion result
 */
function convertUsdToIls(usdAmount) {
  return convertFromUsd(usdAmount, 'ILS');
}

module.exports = {
  convertFromUsd,
  convertUsdToIls,
  getSupportedCurrencies,
  getExchangeRate,
  formatAmount,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS
};
