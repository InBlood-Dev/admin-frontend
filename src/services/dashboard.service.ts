import api from './api';
import type {
  DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan,
  GenderPoint, AgeRangePoint, LocationDistribution, OrientationPoint, DemographicsSummary,
} from '../types';

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

async function getGenderDistribution(): Promise<GenderPoint[]> {
  const { data } = await api.get('/admin/dashboard/gender-distribution');
  return data.data;
}

async function getAgeDistribution(): Promise<AgeRangePoint[]> {
  const { data } = await api.get('/admin/dashboard/age-distribution');
  return data.data;
}

async function getLocationDistribution(): Promise<LocationDistribution> {
  const { data } = await api.get('/admin/dashboard/location-distribution');
  return data.data;
}

async function getOrientationDistribution(): Promise<OrientationPoint[]> {
  const { data } = await api.get('/admin/dashboard/orientation-distribution');
  return data.data;
}

async function getDemographicsSummary(): Promise<DemographicsSummary> {
  const { data } = await api.get('/admin/dashboard/demographics-summary');
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
};

export default dashboardService;
