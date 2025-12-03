import { api } from './api';
import type { Account } from '../types/account.types';

export const accountsApi = {
  async getAll(): Promise<Account[]> {
    const response = await api.get<{ accounts: Account[] }>('/api/accounts');
    return response.accounts;
  },

  async getById(id: string): Promise<Account> {
    const response = await api.get<{ account: Account }>(`/api/accounts/${id}`);
    return response.account;
  },

  async create(account: Omit<Account, 'id'>): Promise<Account> {
    const response = await api.post<{ account: Account }>('/api/accounts', { account });
    return response.account;
  },

  async update(id: string, account: Omit<Account, 'id'>): Promise<Account> {
    const response = await api.put<{ account: Account }>(`/api/accounts/${id}`, { account });
    return response.account;
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete<{ success: boolean }>(`/api/accounts/${id}`);
    return response.success;
  },
};
