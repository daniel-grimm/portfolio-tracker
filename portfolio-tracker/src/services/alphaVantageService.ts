// Alpha Vantage API response types
export interface AlphaVantageGlobalQuote {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

// Normalized quote format matching Finnhub's interface
export interface AlphaVantageQuote {
  c: number; // Current price
}

// Get API key from environment
const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_TOKEN;

if (!apiKey) {
  throw new Error('VITE_ALPHAVANTAGE_API_TOKEN is not defined in environment variables');
}

const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Fetches the current quote for a mutual fund from Alpha Vantage.
 *
 * @param ticker - The mutual fund ticker symbol (e.g., "FXAIX")
 * @returns Promise with normalized quote data
 * @throws Error if the API request fails or no data is available
 */
export async function fetchMutualFundQuote(ticker: string): Promise<AlphaVantageQuote> {
  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${ticker}: ${response.statusText}`);
  }

  const data = await response.json() as AlphaVantageGlobalQuote;

  // Check if we got a valid response
  if (!data["Global Quote"] || !data["Global Quote"]["05. price"]) {
    throw new Error(`No quote data available for ticker: ${ticker}. Please verify the symbol is correct.`);
  }

  // Parse the price from the string format
  const price = parseFloat(data["Global Quote"]["05. price"]);

  if (isNaN(price) || price === 0) {
    throw new Error(`Invalid price data for ticker: ${ticker}`);
  }

  // Return in normalized format matching Finnhub
  return {
    c: price,
  };
}
