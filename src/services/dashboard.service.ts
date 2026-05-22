import api from './api';
import type {
  DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan,
  GenderPoint, AgeRangePoint, LocationDistribution, OrientationPoint, DemographicsSummary,
  DateRange, PremiumComparison,
  AnalyticsOverview, DailyTrendPoint, DailySessionPoint,
  TopPage, TopEvent, ReferrerPoint, DevicePoint,
  PlayInstallStats, SearchConsoleOverview, SearchQueryRow, SearchPageRow,
  SearchDailyPoint, UptimeStats, UptimePoint,
  HourPoint, HourlyCategorical,
} from '../types';

type Granularity = 'hour' | undefined;

function buildParams(range?: DateRange, granularity?: Granularity): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.from) params.from = range.from;
  if (range?.to) params.to = range.to;
  if (granularity === 'hour') params.granularity = 'hour';
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

// --- PostHog Analytics ---

async function getAnalyticsOverview(range?: DateRange): Promise<AnalyticsOverview> {
  const { data } = await api.get('/admin/analytics/overview', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsDailyTrends(range?: DateRange): Promise<DailyTrendPoint[]> {
  const { data } = await api.get('/admin/analytics/daily-trends', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsDailySessions(range?: DateRange): Promise<DailySessionPoint[]> {
  const { data } = await api.get('/admin/analytics/daily-sessions', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsTopPages(range?: DateRange): Promise<TopPage[]> {
  const { data } = await api.get('/admin/analytics/top-pages', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsTopEvents(range?: DateRange): Promise<TopEvent[]> {
  const { data } = await api.get('/admin/analytics/top-events', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsReferrers(range?: DateRange): Promise<ReferrerPoint[]> {
  const { data } = await api.get('/admin/analytics/referrers', { params: buildParams(range) });
  return data.data;
}

async function getAnalyticsDevices(range?: DateRange): Promise<DevicePoint[]> {
  const { data } = await api.get('/admin/analytics/devices', { params: buildParams(range) });
  return data.data;
}

// --- External Analytics ---

async function getPlayInstalls(range?: DateRange): Promise<PlayInstallStats> {
  const { data } = await api.get('/admin/external-analytics/play-installs', { params: buildParams(range) });
  return data.data;
}

async function getSearchOverview(range?: DateRange): Promise<SearchConsoleOverview> {
  const { data } = await api.get('/admin/external-analytics/search-console/overview', { params: buildParams(range) });
  return data.data;
}

async function getSearchQueries(range?: DateRange): Promise<SearchQueryRow[]> {
  const { data } = await api.get('/admin/external-analytics/search-console/queries', { params: buildParams(range) });
  return data.data;
}

async function getSearchPages(range?: DateRange): Promise<SearchPageRow[]> {
  const { data } = await api.get('/admin/external-analytics/search-console/pages', { params: buildParams(range) });
  return data.data;
}

async function getSearchTrends(range?: DateRange): Promise<SearchDailyPoint[]> {
  const { data } = await api.get('/admin/external-analytics/search-console/trends', { params: buildParams(range) });
  return data.data;
}

async function getUptimeStats(): Promise<UptimeStats> {
  const { data } = await api.get('/admin/external-analytics/uptime');
  return data.data;
}

async function getUptimeTimeline(): Promise<UptimePoint[]> {
  const { data } = await api.get('/admin/external-analytics/uptime/timeline');
  return data.data;
}

// --- Hour-of-day variants ---
// Same endpoints, `granularity=hour`. Time-series charts return HourPoint[];
// categorical charts return HourlyCategorical ({ keys, data }).

async function getHourlySeries(path: string, range?: DateRange): Promise<HourPoint[]> {
  const { data } = await api.get(path, { params: buildParams(range, 'hour') });
  return data.data;
}

async function getHourlyCategorical(path: string, range?: DateRange): Promise<HourlyCategorical> {
  const { data } = await api.get(path, { params: buildParams(range, 'hour') });
  return data.data;
}

const getSignupsHourly = (range?: DateRange) => getHourlySeries('/admin/dashboard/signups', range);
const getUserGrowthHourly = (range?: DateRange) => getHourlySeries('/admin/dashboard/user-growth', range);
const getRevenueHourly = (range?: DateRange) => getHourlySeries('/admin/dashboard/revenue', range);
const getGenderHourly = (range?: DateRange) => getHourlyCategorical('/admin/dashboard/gender-distribution', range);
const getAgeHourly = (range?: DateRange) => getHourlyCategorical('/admin/dashboard/age-distribution', range);
const getOrientationHourly = (range?: DateRange) => getHourlyCategorical('/admin/dashboard/orientation-distribution', range);
const getLocationHourly = (range?: DateRange) => getHourlyCategorical('/admin/dashboard/location-distribution', range);
const getAnalyticsDailyTrendsHourly = (range?: DateRange) => getHourlySeries('/admin/analytics/daily-trends', range);
const getAnalyticsDailySessionsHourly = (range?: DateRange) => getHourlySeries('/admin/analytics/daily-sessions', range);
const getAnalyticsDevicesHourly = (range?: DateRange) => getHourlyCategorical('/admin/analytics/devices', range);
const getAnalyticsReferrersHourly = (range?: DateRange) => getHourlyCategorical('/admin/analytics/referrers', range);

async function getPremiumGrowthHourly(range?: DateRange): Promise<HourPoint[]> {
  const { data } = await api.get('/admin/dashboard/premium-comparison', { params: buildParams(range, 'hour') });
  return data.data.growth;
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
  getAnalyticsOverview,
  getAnalyticsDailyTrends,
  getAnalyticsDailySessions,
  getAnalyticsTopPages,
  getAnalyticsTopEvents,
  getAnalyticsReferrers,
  getAnalyticsDevices,
  getPlayInstalls,
  getSearchOverview,
  getSearchQueries,
  getSearchPages,
  getSearchTrends,
  getUptimeStats,
  getUptimeTimeline,
  // Hour-of-day variants
  getSignupsHourly,
  getUserGrowthHourly,
  getRevenueHourly,
  getGenderHourly,
  getAgeHourly,
  getOrientationHourly,
  getLocationHourly,
  getPremiumGrowthHourly,
  getAnalyticsDailyTrendsHourly,
  getAnalyticsDailySessionsHourly,
  getAnalyticsDevicesHourly,
  getAnalyticsReferrersHourly,
};

export default dashboardService;
