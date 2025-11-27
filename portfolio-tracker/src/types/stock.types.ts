export type MarketCap = "mega" | "large" | "mid" | "small" | "micro";
export type Style = "value" | "blend" | "growth";

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

export interface EtfData {
  ticker: string;
  name: string;
  description: string;
  currentPrice: number;
  annualDividend: number;
  sector: Array<Sector>;
  country: Array<string>;
  marketCap: MarketCap;
  style: Style;
  isDomestic: boolean;
}

export interface StockDatabase {
  [ticker: string]: StockData | EtfData;
}
