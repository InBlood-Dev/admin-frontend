import api from './api';

export interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  segment: 'all' | 'premium' | 'inactive' | 'new_users';
  sent_by: { id: string; name: string } | null;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: 'sending' | 'sent' | 'failed';
  sent_at: string | null;
}

export interface PaginatedBroadcastsResponse {
  broadcasts: BroadcastItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

async function sendBroadcast(payload: { title: string; body: string; segment: string }): Promise<BroadcastItem> {
  const { data } = await api.post('/admin/notifications/broadcast', payload);
  return data.data;
}

async function getBroadcastHistory(params: { page?: number; limit?: number } = {}): Promise<PaginatedBroadcastsResponse> {
  const { data } = await api.get('/admin/notifications/history', { params });
  return data.data;
}

async function getSegmentCount(segment: string): Promise<{ segment: string; count: number }> {
  const { data } = await api.get('/admin/notifications/segment-count', { params: { segment } });
  return data.data;
}

const notificationService = {
  sendBroadcast,
  getBroadcastHistory,
  getSegmentCount,
};

export default notificationService;
