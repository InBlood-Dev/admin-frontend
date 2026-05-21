import api from './api';

/**
 * Wrappers around /api/v1/admin/analytics-internal endpoints. Mirrors the
 * shape of the other admin services in this codebase (single default export
 * with named methods).
 */

export interface AnalyticsFilter {
  from?: string;
  to?: string;
  platform?: 'ios' | 'android' | 'web' | '';
  screen?: string;
  event_name?: string;
}

export interface OverviewResponse {
  range: { from: string; to: string };
  totals: {
    events: number;
    screen_views: number;
    interactions: number;
    features: number;
    errors: number;
  };
  distinct: { unique_users: number; unique_sessions: number };
  session_stats: {
    avg_duration_ms: number;
    avg_events: number;
    avg_screens: number;
  };
  daily: Array<{ day: string; events: number; unique_users: number; unique_sessions: number }>;
  by_platform: Array<{ platform: string; count: number }>;
}

export interface TopEventRow {
  event_name: string;
  category: string;
  count: number;
  unique_users: number;
  last_seen: string;
}

export interface TopScreenRow {
  screen: string;
  views: number;
  unique_users: number;
  unique_sessions: number;
  avg_dwell_ms: number;
  total_dwell_ms: number;
}

export interface TopSectionRow {
  screen: string;
  section: string;
  views: number;
  unique_users: number;
  avg_dwell_ms: number;
  total_dwell_ms: number;
}

export interface FunnelStep {
  event: string;
  users: number;
}

export interface AnalyticsEventRow {
  id: string;
  event_name: string;
  event_category: string;
  screen: string | null;
  section: string | null;
  properties: Record<string, unknown>;
  duration_ms: number | null;
  platform: string;
  session_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

export interface ListEventsResponse {
  items: AnalyticsEventRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function buildParams(filter: AnalyticsFilter): Record<string, string> {
  const out: Record<string, string> = {};
  if (filter.from) out.from = filter.from;
  if (filter.to) out.to = filter.to;
  if (filter.platform) out.platform = filter.platform;
  if (filter.screen) out.screen = filter.screen;
  if (filter.event_name) out.event_name = filter.event_name;
  return out;
}

async function overview(filter: AnalyticsFilter): Promise<OverviewResponse> {
  const res = await api.get('/admin/analytics-internal/overview', { params: buildParams(filter) });
  return res.data.data;
}

async function topEvents(filter: AnalyticsFilter, limit = 25): Promise<TopEventRow[]> {
  const res = await api.get('/admin/analytics-internal/top-events', {
    params: { ...buildParams(filter), limit }
  });
  return res.data.data.items;
}

async function topScreens(filter: AnalyticsFilter, limit = 25): Promise<TopScreenRow[]> {
  const res = await api.get('/admin/analytics-internal/top-screens', {
    params: { ...buildParams(filter), limit }
  });
  return res.data.data.items;
}

async function topSections(filter: AnalyticsFilter, limit = 50): Promise<TopSectionRow[]> {
  const res = await api.get('/admin/analytics-internal/top-sections', {
    params: { ...buildParams(filter), limit }
  });
  return res.data.data.items;
}

async function funnel(filter: AnalyticsFilter, steps: string[]): Promise<{ steps: FunnelStep[] }> {
  const res = await api.get('/admin/analytics-internal/funnel', {
    params: { ...buildParams(filter), steps: steps.join(',') }
  });
  return res.data.data;
}

async function listEvents(
  filter: AnalyticsFilter,
  page = 1,
  limit = 50
): Promise<ListEventsResponse> {
  const res = await api.get('/admin/analytics-internal/events', {
    params: { ...buildParams(filter), page, limit }
  });
  return res.data.data;
}

async function activeUsers(filter: AnalyticsFilter): Promise<Array<{ day: string; dau: number }>> {
  const res = await api.get('/admin/analytics-internal/active-users', {
    params: buildParams(filter)
  });
  return res.data.data.items;
}

/**
 * Triggers an XLSX download. Calls the export route as a binary blob and
 * pipes it through a hidden anchor tag with `download` attribute.
 */
async function downloadXlsx(kind: string, filter: AnalyticsFilter): Promise<void> {
  const res = await api.get('/admin/analytics-internal/export', {
    params: { kind, ...buildParams(filter) },
    responseType: 'blob'
  });

  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `inblood-analytics-${kind}-${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default {
  overview,
  topEvents,
  topScreens,
  topSections,
  funnel,
  listEvents,
  activeUsers,
  downloadXlsx
};
