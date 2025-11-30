import { api } from './api';
import type { Position, PositionWithStock, AggregatedPosition } from '../types/portfolio.types';

export const positionsApi = {
  async getAll(): Promise<PositionWithStock[]> {
    const response = await api.get<{ positions: PositionWithStock[] }>('/api/positions');
    return response.positions;
  },

  async getAggregated(): Promise<AggregatedPosition[]> {
    const response = await api.get<{ positions: AggregatedPosition[] }>('/api/positions/aggregated');
    return response.positions;
  },

  async getByTicker(ticker: string): Promise<PositionWithStock[]> {
    const response = await api.get<{ positions: PositionWithStock[] }>(`/api/positions/ticker/${ticker}`);
    return response.positions;
  },

  async getById(id: string): Promise<PositionWithStock> {
    const response = await api.get<{ position: PositionWithStock }>(`/api/positions/${id}`);
    return response.position;
  },

  async create(position: Omit<Position, 'id'>): Promise<PositionWithStock> {
    const response = await api.post<{ position: PositionWithStock }>('/api/positions', { position });
    return response.position;
  },

  async update(id: string, position: Omit<Position, 'id'>): Promise<PositionWithStock> {
    const response = await api.put<{ position: PositionWithStock }>(`/api/positions/${id}`, { position });
    return response.position;
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/api/positions/${id}`);
    return response.success;
  },
};
