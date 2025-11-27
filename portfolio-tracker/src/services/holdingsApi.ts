import { api } from './api';
import type { Holding } from '../types/portfolio.types';

export const holdingsApi = {
  async getAll(): Promise<Holding[]> {
    const response = await api.get<{ holdings: Holding[] }>('/api/holdings');
    return response.holdings;
  },

  async getById(id: string): Promise<Holding> {
    const response = await api.get<{ holding: Holding }>(`/api/holdings/${id}`);
    return response.holding;
  },

  async create(holding: Omit<Holding, 'id'>): Promise<Holding> {
    const response = await api.post<{ holding: Holding }>('/api/holdings', holding);
    return response.holding;
  },

  async update(id: string, holding: Omit<Holding, 'id'>): Promise<Holding> {
    const response = await api.put<{ holding: Holding }>(`/api/holdings/${id}`, holding);
    return response.holding;
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/api/holdings/${id}`);
    return response.success;
  },
};
