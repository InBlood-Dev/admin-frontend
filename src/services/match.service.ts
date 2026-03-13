import api from './api';
import type { PaginatedAdminMatchesResponse } from '../types';

export interface ListMatchesParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  sort_by?: 'matched_at' | 'unmatched_at';
  sort_order?: 'asc' | 'desc';
}

async function listMatches(params: ListMatchesParams = {}): Promise<PaginatedAdminMatchesResponse> {
  const { data } = await api.get('/admin/matches', { params });
  return data.data;
}

const matchService = {
  listMatches,
};

export default matchService;
