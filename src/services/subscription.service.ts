import api from './api';
import type {
  AdminSubscriptionItem,
  PaginatedSubscriptionsResponse,
  AdminTransaction,
  PaginatedTransactionsResponse,
  RevenueByPlan,
} from '../types';

export interface ListSubscriptionsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'active' | 'cancelled' | 'expired';
  plan_type?: 'monthly' | 'annual';
  sort_by?: 'created_at' | 'started_at' | 'expires_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  status?: 'created' | 'success' | 'failed' | 'dropped' | 'failed_dropped';
  plan_type?: 'monthly' | 'annual';
  sort_by?: 'created_at' | 'amount';
  sort_order?: 'asc' | 'desc';
}

async function listSubscriptions(
  params: ListSubscriptionsParams = {},
): Promise<PaginatedSubscriptionsResponse> {
  const { data } = await api.get('/admin/subscriptions', { params });
  return data.data;
}

async function listTransactions(
  params: ListTransactionsParams = {},
): Promise<PaginatedTransactionsResponse> {
  const { data } = await api.get('/admin/subscriptions/transactions', { params });
  return data.data;
}

async function getRevenueByPlan(): Promise<RevenueByPlan[]> {
  const { data } = await api.get('/admin/subscriptions/revenue-by-plan');
  return data.data;
}

async function cancelSubscription(subscriptionId: string): Promise<AdminSubscriptionItem> {
  const { data } = await api.put(`/admin/subscriptions/${subscriptionId}/cancel`);
  return data.data;
}

async function revokeSubscription(subscriptionId: string): Promise<AdminSubscriptionItem> {
  const { data } = await api.put(`/admin/subscriptions/${subscriptionId}/revoke`);
  return data.data;
}

const subscriptionService = {
  listSubscriptions,
  listTransactions,
  getRevenueByPlan,
  cancelSubscription,
  revokeSubscription,
};

export default subscriptionService;
