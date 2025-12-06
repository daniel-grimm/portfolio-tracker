import type { StockData, MarketCap, Sector, Style } from '../types/stock.types';
import { fetchStockQuote, fetchCompanyProfile } from './finnhubService';

/**
 * User-provided classification data for a stock
 */
export interface UserStockClassification {
  sector: Sector;
  style: Style;
  annualDividend: number;
}

/**
 * Classifies market cap based on market capitalization value
 * @param marketCapValue - Market cap in millions
 */
export function classifyMarketCap(marketCapValue: number): MarketCap {
  if (marketCapValue >= 200000) return 'mega';    // $200B+
  if (marketCapValue >= 10000) return 'large';     // $10B - $200B
  if (marketCapValue >= 2000) return 'mid';        // $2B - $10B
  if (marketCapValue >= 300) return 'small';       // $300M - $2B
  return 'micro';                                   // < $300M
}

/**
 * Fetches complete stock data from Finnhub API and combines with user classification
 * @param ticker - Stock ticker symbol
 * @param userClassification - User-provided sector, style, and dividend info
 * @returns Complete StockData object with API data and user classification
 */
export async function getStockData(
  ticker: string,
  userClassification: UserStockClassification
): Promise<StockData> {
  try {
    // Fetch data from Finnhub API in parallel
    const [quote, profile] = await Promise.all([
      fetchStockQuote(ticker),
      fetchCompanyProfile(ticker)
    ]);

    // Classify market cap from Finnhub's value
    const marketCap = classifyMarketCap(profile.marketCapitalization);

    // Determine if stock is domestic (US-based)
    const isDomestic = profile.country === 'US';

    // Combine API data with user classification
    const stockData: StockData = {
      ticker: ticker.toUpperCase(),
      name: profile.name,
      currentPrice: quote.c,
      annualDividend: userClassification.annualDividend,
      sector: userClassification.sector,
      country: profile.country,
      marketCap,
      style: userClassification.style,
      isDomestic,
      lastUpdated: Date.now(),
      securityType: "stock", // This service is for stocks only
      isEtf: false, // Deprecated: use securityType instead
    };

    return stockData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch stock data for ${ticker}: ${error.message}`);
    }
    throw new Error(`Failed to fetch stock data for ${ticker}: Unknown error`);
  }
}
