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
 * @param {number} [decimals=4] - Number of decimal places
 * @returns {Object} - Conversion result
 */
function convertFromUsd(usdAmount, targetCurrency = 'USD', decimals = 4) {
  // Default to USD if currency not supported
  if (!EXCHANGE_RATES[targetCurrency]) {
    console.warn(`Currency ${targetCurrency} not supported, using USD`);
    targetCurrency = 'USD';
  }

  // Get exchange rate
  const exchangeRate = EXCHANGE_RATES[targetCurrency];

  // Convert amount
  const convertedAmount = usdAmount * exchangeRate;

  // Format amount
  const formattedAmount = formatAmount(convertedAmount, targetCurrency, decimals);

  // Return result
  return {
    amount: convertedAmount,
    formatted: formattedAmount,
    currency: targetCurrency,
    exchangeRate,
    originalAmount: usdAmount,
    originalCurrency: 'USD'
  };
}

/**
 * Get the exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - Exchange rate (fromCurrency to toCurrency)
 */
function getExchangeRate(fromCurrency = 'USD', toCurrency = 'USD') {
  // Default to USD if currency not supported
  if (!EXCHANGE_RATES[fromCurrency]) {
    console.warn(`Currency ${fromCurrency} not supported, using USD`);
    fromCurrency = 'USD';
  }

  if (!EXCHANGE_RATES[toCurrency]) {
    console.warn(`Currency ${toCurrency} not supported, using USD`);
    toCurrency = 'USD';
  }

  // Calculate exchange rate
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
    console.warn(`Currency ${currency} not supported, using USD`);
    currency = 'USD';
  }

  // Get currency symbol
  const symbol = CURRENCY_SYMBOLS[currency];

  // Format amount
  return `${symbol}${amount.toFixed(decimals)}`;
}

/**
 * Get list of supported currencies with their symbols
 * @returns {Array} - Array of currency objects with code and symbol
 */
function getSupportedCurrencies() {
  return Object.keys(EXCHANGE_RATES).map(code => ({
    code,
    symbol: CURRENCY_SYMBOLS[code] || code,
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

// Export named exports
export {
  convertFromUsd,
  convertUsdToIls,
  getSupportedCurrencies,
  getExchangeRate,
  formatAmount,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS
};

// Also export as default for backward compatibility
export default {
  convertFromUsd,
  convertUsdToIls,
  getSupportedCurrencies,
  getExchangeRate,
  formatAmount,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS
};
