import api from './api';
import type {
  AccountDeletionCounts,
  PaginatedAccountDeletionsResponse,
} from '../types';

export interface ListDeletionsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'deleted' | 'all';
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface BulkDeletionResult {
  total: number;
  succeeded: number;
  failed: number;
  failures: { user_id: string; error: string }[];
}

async function listRequests(params: ListDeletionsParams = {}): Promise<PaginatedAccountDeletionsResponse> {
  const { data } = await api.get('/admin/account-deletions', { params });
  return data.data;
}

async function getCounts(): Promise<AccountDeletionCounts> {
  const { data } = await api.get('/admin/account-deletions/counts');
  return data.data;
}

async function approve(userId: string): Promise<void> {
  await api.post(`/admin/account-deletions/${userId}/approve`);
}

async function reject(userId: string, reason?: string): Promise<void> {
  await api.post(`/admin/account-deletions/${userId}/reject`, { reason: reason ?? null });
}

async function restore(userId: string): Promise<void> {
  await api.post(`/admin/account-deletions/${userId}/restore`);
}

async function bulkApprove(userIds: string[]): Promise<BulkDeletionResult> {
  const { data } = await api.post('/admin/account-deletions/bulk-approve', { user_ids: userIds });
  return data.data;
}

async function bulkReject(userIds: string[], reason?: string): Promise<BulkDeletionResult> {
  const { data } = await api.post('/admin/account-deletions/bulk-reject', {
    user_ids: userIds,
    reason: reason ?? null,
  });
  return data.data;
}

const accountDeletionService = {
  listRequests,
  getCounts,
  approve,
  reject,
  restore,
  bulkApprove,
  bulkReject,
};

export default accountDeletionService;
