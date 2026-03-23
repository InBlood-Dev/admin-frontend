import api from './api';
import type {
  DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan,
  GenderPoint, AgeRangePoint, LocationDistribution, OrientationPoint, DemographicsSummary,
  DateRange, PremiumComparison,
} from '../types';

function buildParams(range?: DateRange): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.from) params.from = range.from;
  if (range?.to) params.to = range.to;
  return params;
}

async function getStats(range?: DateRange): Promise<DashboardStats> {
  const { data } = await api.get('/admin/dashboard/stats', { params: buildParams(range) });
  return data.data;
}

async function getUserGrowth(range?: DateRange): Promise<UserGrowthPoint[]> {
  const { data } = await api.get('/admin/dashboard/user-growth', { params: buildParams(range) });
  return data.data;
}

async function getSignups(range?: DateRange): Promise<SignupsPoint[]> {
  const { data } = await api.get('/admin/dashboard/signups', { params: buildParams(range) });
  return data.data;
}

async function getRevenue(range?: DateRange): Promise<RevenuePoint[]> {
  const { data } = await api.get('/admin/dashboard/revenue', { params: buildParams(range) });
  return data.data;
}

async function getRevenueByPlan(): Promise<RevenueByPlan[]> {
  const { data } = await api.get('/admin/subscriptions/revenue-by-plan');
  return data.data;
}

async function getGenderDistribution(range?: DateRange): Promise<GenderPoint[]> {
  const { data } = await api.get('/admin/dashboard/gender-distribution', { params: buildParams(range) });
  return data.data;
}

async function getAgeDistribution(range?: DateRange): Promise<AgeRangePoint[]> {
  const { data } = await api.get('/admin/dashboard/age-distribution', { params: buildParams(range) });
  return data.data;
}

async function getLocationDistribution(range?: DateRange): Promise<LocationDistribution> {
  const { data } = await api.get('/admin/dashboard/location-distribution', { params: buildParams(range) });
  return data.data;
}

async function getOrientationDistribution(range?: DateRange): Promise<OrientationPoint[]> {
  const { data } = await api.get('/admin/dashboard/orientation-distribution', { params: buildParams(range) });
  return data.data;
}

async function getDemographicsSummary(range?: DateRange): Promise<DemographicsSummary> {
  const { data } = await api.get('/admin/dashboard/demographics-summary', { params: buildParams(range) });
  return data.data;
}

async function getPremiumComparison(range?: DateRange): Promise<PremiumComparison> {
  const { data } = await api.get('/admin/dashboard/premium-comparison', { params: buildParams(range) });
  return data.data;
}

const dashboardService = {
  getStats,
  getUserGrowth,
  getSignups,
  getRevenue,
  getRevenueByPlan,
  getGenderDistribution,
  getAgeDistribution,
  getLocationDistribution,
  getOrientationDistribution,
  getDemographicsSummary,
  getPremiumComparison,
};

export default dashboardService;
