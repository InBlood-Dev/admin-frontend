import api from './api';
import type { PaginatedVerificationsResponse } from '../types';

export interface ListVerificationsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected';
  media_type?: 'selfie' | 'video';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

async function listVerifications(
  params: ListVerificationsParams = {},
): Promise<PaginatedVerificationsResponse> {
  const { data } = await api.get('/admin/verifications', { params });
  return data.data;
}

const verificationService = {
  listVerifications,
};

export default verificationService;
