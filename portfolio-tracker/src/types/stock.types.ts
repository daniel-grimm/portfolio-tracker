/**
 * Stock and ETF type definitions for the portfolio tracker.
 *
 * These types define the structure of stock market data fetched from Finnhub API
 * and stored alongside holdings in the database. Stock data is persisted as JSON
 * snapshots to reduce API calls and track historical information.
 */

/**
 * Security type classification.
 *
 * - `stock`: Individual company stock
 * - `etf`: Exchange-Traded Fund
 * - `mutualfund`: Mutual Fund
 */
export type SecurityType = "stock" | "etf" | "mutualfund";

/**
 * Market capitalization classification for stocks.
 *
 * Categories based on company size:
 * - `mega`: >$200B market cap
 * - `large`: $10B-$200B market cap
 * - `mid`: $2B-$10B market cap
 * - `small`: $300M-$2B market cap
 * - `micro`: <$300M market cap
 */
export type MarketCap = "mega" | "large" | "mid" | "small" | "micro";

/**
 * Investment style classification.
 *
 * - `value`: Undervalued stocks trading below intrinsic value
 * - `blend`: Mixed characteristics of value and growth
 * - `growth`: Growth-oriented stocks with high earnings potential
 */
export type Style = "value" | "blend" | "growth";

/**
 * Stock sector categorization following standard industry classifications.
 *
 * Based on the Global Industry Classification Standard (GICS) sectors.
 */
export type Sector =
  | "Technology"
  | "Healthcare"
  | "Financials"
  | "Consumer Discretionary"
  | "Consumer Staples"
  | "Industrials"
  | "Energy"
  | "Materials"
  | "Real Estate"
  | "Utilities"
  | "Communication Services";

/**
 * Sector allocation map for ETFs.
 * Maps sector name to percentage allocation (0-100).
 */
export interface SectorAllocationMap {
  [sector: string]: number;
}

/**
 * Country allocation map for ETFs.
 * Maps country name to percentage allocation (0-100).
 */
export interface CountryAllocationMap {
  [country: string]: number;
}

/**
 * Style-Market Cap allocation map for ETFs and mutual funds.
 * Maps style-market cap combination to percentage allocation (0-100).
 * Keys follow the pattern: {marketCap}{Style} (e.g., "largeValue", "midBlend").
 */
export interface StyleMarketCapAllocationMap {
  largeValue: number;
  largeBlend: number;
  largeGrowth: number;
  midValue: number;
  midBlend: number;
  midGrowth: number;
  smallValue: number;
  smallBlend: number;
  smallGrowth: number;
}

/**
 * Complete snapshot of stock market data.
 *
 * This data is fetched from API providers and stored with each holding as a JSON snapshot
 * in the database. Storing snapshots reduces API calls, improves performance, and
 * preserves historical data for each position.
 *
 * For ETFs and mutual funds, the optional fields (description, sectorAllocations, countryAllocations)
 * enable proportional allocation across multiple sectors and countries.
 */
export interface StockData {
  /** Stock ticker symbol (e.g., "AAPL", "MSFT", "FXAIX") */
  ticker: string;

  /** Company or fund name (e.g., "Apple Inc.", "Fidelity 500 Index Fund") */
  name: string;

  /** Current price in USD */
  currentPrice: number;

  /** Annual dividend payment per share in USD */
  annualDividend: number;

  /** Primary business sector */
  sector: Sector;

  /** Country of company headquarters (ISO country code or name) */
  country: string;

  /** Market capitalization classification */
  marketCap: MarketCap;

  /** Investment style classification */
  style: Style;

  /** Whether this is a US domestic security */
  isDomestic: boolean;

  /** Unix timestamp in milliseconds when this data was last updated */
  lastUpdated: number;

  /** Security type classification */
  securityType: SecurityType;

  /** @deprecated Use securityType instead. Whether this is an ETF (Exchange-Traded Fund) */
  isEtf: boolean;

  /** Description (optional, for ETFs and mutual funds) */
  description?: string;

  /** Sector allocation percentages for ETFs and mutual funds (optional, for proportional analytics) */
  sectorAllocations?: SectorAllocationMap;

  /** Country allocation percentages for ETFs and mutual funds (optional, for proportional analytics) */
  countryAllocations?: CountryAllocationMap;

  /** Style-Market Cap allocation percentages for ETFs and mutual funds (optional, for proportional analytics) */
  styleMarketCapAllocations?: StyleMarketCapAllocationMap;
}

/**
 * ETF (Exchange-Traded Fund) data structure.
 *
 * Similar to StockData but supports multiple sectors and countries since ETFs
 * typically hold diversified portfolios across various assets.
 */
export interface EtfData {
  /** ETF ticker symbol (e.g., "SPY", "VOO") */
  ticker: string;

  /** ETF name (e.g., "SPDR S&P 500 ETF Trust") */
  name: string;

  /** Brief description of the ETF's investment strategy */
  description: string;

  /** Current ETF price in USD */
  currentPrice: number;

  /** Annual dividend payment per share in USD */
  annualDividend: number;

  /** Array of sectors the ETF holds positions in */
  sector: Array<Sector>;

  /** Array of countries the ETF has exposure to */
  country: Array<string>;

  /** Predominant market cap classification of the ETF's holdings */
  marketCap: MarketCap;

  /** Predominant investment style of the ETF's holdings */
  style: Style;

  /** Whether the ETF primarily holds US domestic assets */
  isDomestic: boolean;
}

/**
 * Dictionary mapping ticker symbols to their stock or ETF data.
 *
 * Used for caching and quick lookup of stock information by ticker symbol.
 */
export interface StockDatabase {
  [ticker: string]: StockData | EtfData;
}

/**
 * Helper function to check if a security is an ETF or mutual fund.
 *
 * @param stock - The stock data to check
 * @returns true if the security is an ETF or mutual fund, false otherwise
 */
export function isEtfOrMutualFund(stock: StockData): boolean {
  return stock.securityType === "etf" || stock.securityType === "mutualfund";
}
