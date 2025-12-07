import { api } from './api';
import type {
  Dividend,
  QuarterlyDividend,
  YearlyDividend,
  DividendGrowth,
} from '../types/dividend.types';

export const dividendsApi = {
  async getAll(): Promise<Dividend[]> {
    const response = await api.get<{ dividends: Dividend[] }>('/api/dividends');
    return response.dividends;
  },

  async getById(id: string): Promise<Dividend> {
    const response = await api.get<{ dividend: Dividend }>(`/api/dividends/${id}`);
    return response.dividend;
  },

  async getByTicker(ticker: string): Promise<Dividend[]> {
    const response = await api.get<{ dividends: Dividend[] }>(`/api/dividends/ticker/${ticker}`);
    return response.dividends;
  },

  async create(dividend: Omit<Dividend, 'id'>): Promise<Dividend> {
    const response = await api.post<{ dividend: Dividend }>('/api/dividends', { dividend });
    return response.dividend;
  },

  async update(id: string, dividend: Partial<Omit<Dividend, 'id'>>): Promise<Dividend> {
    const response = await api.put<{ dividend: Dividend }>(`/api/dividends/${id}`, { dividend });
    return response.dividend;
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/api/dividends/${id}`);
    return response.success;
  },

  async getQuarterlyAggregated(count: number = 8): Promise<QuarterlyDividend[]> {
    const response = await api.get<{ quarters: QuarterlyDividend[] }>(
      `/api/dividends/aggregated/quarterly?count=${count}`
    );
    return response.quarters;
  },

  async getYearlyAggregated(count: number = 5): Promise<YearlyDividend[]> {
    const response = await api.get<{ years: YearlyDividend[] }>(
      `/api/dividends/aggregated/yearly?count=${count}`
    );
    return response.years;
  },

  async getQuarterlyGrowth(year: number, quarter: number): Promise<DividendGrowth> {
    const response = await api.get<DividendGrowth>(
      `/api/dividends/growth/quarterly?year=${year}&quarter=${quarter}`
    );
    return response;
  },

  async getYearlyGrowth(year: number): Promise<DividendGrowth> {
    const response = await api.get<DividendGrowth>(
      `/api/dividends/growth/yearly?year=${year}`
    );
    return response;
  },

  async getCAGR(): Promise<number> {
    const response = await api.get<{ cagr: number }>('/api/dividends/metrics/cagr');
    return response.cagr;
  },
};
