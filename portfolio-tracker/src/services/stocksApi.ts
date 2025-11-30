import { api } from './api';
import type { Stock } from '../types/portfolio.types';

export const stocksApi = {
  async getAll(): Promise<Stock[]> {
    const response = await api.get<{ stocks: Stock[] }>('/api/stocks');
    return response.stocks;
  },

  async getByTicker(ticker: string): Promise<Stock> {
    const response = await api.get<{ stock: Stock }>(`/api/stocks/${ticker}`);
    return response.stock;
  },

  async create(stock: Stock): Promise<Stock> {
    const response = await api.post<{ stock: Stock }>('/api/stocks', { stock });
    return response.stock;
  },

  async update(ticker: string, stock: Partial<Stock>): Promise<Stock> {
    const response = await api.put<{ stock: Stock }>(`/api/stocks/${ticker}`, { stock });
    return response.stock;
  },

  async delete(ticker: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/api/stocks/${ticker}`);
    return response.success;
  },
};
