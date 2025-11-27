import type { StockData } from "./stock.types";

export interface Holding {
  id: string;
  ticker: string;
  quantity: number;
  costBasis: number;
  purchaseDate?: string;
}

export interface Portfolio {
  holdings: Holding[];
}

export interface HoldingMetadata extends Holding {
  stockData: StockData;
  currentValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  dividendYield: number;
  yieldOnCost: number;
  annualIncome: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalAnnualIncome: number;
  averageDividendYield: number;
  averageYieldOnCost: number;
}

export interface StyleBoxAllocation {
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

export interface SectorAllocation {
  [sector: string]: number;
}

export interface GeographicAllocation {
  [country: string]: number;
}

export interface DomesticIntlAllocation {
  domestic: number;
  international: number;
}
