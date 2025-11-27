export type MarketCap = 'large' | 'mid' | 'small';
export type Style = 'value' | 'blend' | 'growth';

export type Sector =
  | 'Technology'
  | 'Healthcare'
  | 'Financials'
  | 'Consumer Discretionary'
  | 'Consumer Staples'
  | 'Industrials'
  | 'Energy'
  | 'Materials'
  | 'Real Estate'
  | 'Utilities'
  | 'Communication Services';

export interface StockData {
  ticker: string;
  name: string;
  currentPrice: number;
  annualDividend: number;
  sector: Sector;
  country: string;
  marketCap: MarketCap;
  style: Style;
  isDomestic: boolean;
}

export interface StockDatabase {
  [ticker: string]: StockData;
}
