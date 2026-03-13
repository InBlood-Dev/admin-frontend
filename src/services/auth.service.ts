import api from './api';
import type { AdminUser, LoginResponse, RefreshResponse } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    return data.data as LoginResponse;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const { data } = await api.post('/admin/auth/refresh-token', {
      refresh_token: refreshToken,
    });
    return data.data as RefreshResponse;
  },

  getProfile: async (): Promise<AdminUser> => {
    const { data } = await api.get('/admin/auth/profile');
    return data.data.admin as AdminUser;
  },

  logout: async (): Promise<void> => {
    await api.post('/admin/auth/logout');
  },
};
