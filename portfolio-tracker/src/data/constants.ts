import type { Sector, MarketCap, Style } from '../types/stock.types';

export const SECTORS: Sector[] = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Industrials',
  'Energy',
  'Materials',
  'Real Estate',
  'Utilities',
  'Communication Services',
];

export const MARKET_CAPS: MarketCap[] = ['large', 'mid', 'small'];

export const STYLES: Style[] = ['value', 'blend', 'growth'];

export const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Netherlands',
  'Switzerland',
  'Japan',
  'China',
  'Taiwan',
  'South Korea',
  'Denmark',
  'Australia',
];

export const STORAGE_KEY = 'portfolio-tracker-holdings';
