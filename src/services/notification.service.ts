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

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  body: string;
  segment: 'all' | 'premium' | 'inactive' | 'new_users';
  scheduled_at: string;
  created_by: { id: string; name: string } | null;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  broadcast_ref: string | null;
  cancelled_at: string | null;
  error_message: string | null;
  createdAt: string;
}

export interface PaginatedScheduledResponse {
  notifications: ScheduledNotificationItem[];
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

async function scheduleNotification(payload: {
  title: string; body: string; segment: string; scheduled_at: string;
}): Promise<ScheduledNotificationItem> {
  const { data } = await api.post('/admin/notifications/schedule', payload);
  return data.data;
}

async function getScheduledNotifications(params: {
  page?: number; limit?: number; status?: string;
} = {}): Promise<PaginatedScheduledResponse> {
  const { data } = await api.get('/admin/notifications/scheduled', { params });
  return data.data;
}

async function cancelScheduledNotification(id: string): Promise<ScheduledNotificationItem> {
  const { data } = await api.patch(`/admin/notifications/scheduled/${id}/cancel`);
  return data.data;
}

const notificationService = {
  sendBroadcast,
  getBroadcastHistory,
  getSegmentCount,
  scheduleNotification,
  getScheduledNotifications,
  cancelScheduledNotification,
};

export default notificationService;
