import api from './api';
import type { DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan } from '../types';

async function getStats(): Promise<DashboardStats> {
  const { data } = await api.get('/admin/dashboard/stats');
  return data.data;
}

async function getUserGrowth(): Promise<UserGrowthPoint[]> {
  const { data } = await api.get('/admin/dashboard/user-growth');
  return data.data;
}

async function getSignups(): Promise<SignupsPoint[]> {
  const { data } = await api.get('/admin/dashboard/signups');
  return data.data;
}

async function getRevenue(): Promise<RevenuePoint[]> {
  const { data } = await api.get('/admin/dashboard/revenue');
  return data.data;
}

async function getRevenueByPlan(): Promise<RevenueByPlan[]> {
  const { data } = await api.get('/admin/subscriptions/revenue-by-plan');
  return data.data;
}

const dashboardService = {
  getStats,
  getUserGrowth,
  getSignups,
  getRevenue,
  getRevenueByPlan,
};

export default dashboardService;
