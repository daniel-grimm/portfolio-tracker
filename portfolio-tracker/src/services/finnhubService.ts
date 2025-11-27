// Finnhub API response types
export interface FinnhubQuote {
  c: number;  // Current price
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCompanyProfile {
  name: string;
  country: string;
  marketCapitalization: number;  // In millions
  industry: string;
  ipo: string;
  logo: string;
  ticker: string;
}

export interface FinnhubSymbolLookup {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

// Get API key from environment
const apiKey = import.meta.env.VITE_FINNHUB_API_TOKEN;

if (!apiKey) {
  throw new Error('VITE_FINNHUB_API_TOKEN is not defined in environment variables');
}

const BASE_URL = 'https://finnhub.io/api/v1';

/**
 * Fetches the current stock quote for a given ticker
 */
export async function fetchStockQuote(ticker: string): Promise<FinnhubQuote> {
  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${ticker}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || data.c === 0) {
    throw new Error(`No quote data available for ticker: ${ticker}`);
  }

  return data as FinnhubQuote;
}

/**
 * Fetches company profile information for a given ticker
 */
export async function fetchCompanyProfile(ticker: string): Promise<FinnhubCompanyProfile> {
  const url = `${BASE_URL}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch company profile for ${ticker}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || !data.name) {
    throw new Error(`No company profile found for ticker: ${ticker}`);
  }

  return data as FinnhubCompanyProfile;
}

/**
 * Validates if a ticker exists by searching for it
 */
export async function searchStock(ticker: string): Promise<boolean> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(ticker)}&token=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search for ticker ${ticker}: ${response.statusText}`);
  }

  const data = await response.json();
  const result = data as FinnhubSymbolLookup;

  const exactMatch = result.result?.some(
    (item) => item.symbol.toUpperCase() === ticker.toUpperCase()
  );

  return exactMatch;
}
