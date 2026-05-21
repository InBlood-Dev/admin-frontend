import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, RefreshCw, Activity } from 'lucide-react';
import analyticsService, {
  AnalyticsFilter,
  OverviewResponse,
  TopEventRow,
  TopScreenRow,
  TopSectionRow,
  AnalyticsEventRow,
  FunnelStep
} from '../services/analytics.service';
import ErrorModal from '../components/ErrorModal';
import DateRangePicker from '../components/DateRangePicker';
import type { DateRange } from '../types';

const PAGE_LIMIT = 50;
const PLATFORM_OPTIONS = ['', 'ios', 'android', 'web'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  ios: '#4D9FFF',
  android: '#4DFF88',
  web: '#FFB74D',
  unknown: '#90A4AE'
};

/**
 * Default funnel — covers the main conversion path. Admins can edit the
 * comma-separated list inline.
 */
const DEFAULT_FUNNEL = [
  'app.open',
  'auth.google_login_success',
  'screen.view',
  'verification.video.submitted',
  'discover.swipe'
].join(',');

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return e?.response?.data?.errors?.[0]?.message
    || e?.response?.data?.message
    || (err instanceof Error ? err.message : 'Something went wrong');
}

function formatDuration(ms: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 1000 / 60)}m ${Math.round((ms / 1000) % 60)}s`;
  return `${Math.round(ms / 1000 / 3600)}h`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type TabKey = 'overview' | 'events' | 'screens' | 'sections' | 'funnel' | 'log';

export default function AnalyticsPage() {
  // Filter state — applied to every request.
  const [from, setFrom] = useState(daysAgoIso(7));
  const [to, setTo] = useState(todayIso());
  const [platform, setPlatform] = useState<AnalyticsFilter['platform']>('');
  const [tab, setTab] = useState<TabKey>('overview');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Data per tab.
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [topEvents, setTopEvents] = useState<TopEventRow[]>([]);
  const [topScreens, setTopScreens] = useState<TopScreenRow[]>([]);
  const [topSections, setTopSections] = useState<TopSectionRow[]>([]);
  const [funnelSteps, setFunnelSteps] = useState<string>(DEFAULT_FUNNEL);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPagination, setEventsPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [eventNameFilter, setEventNameFilter] = useState('');
  const [screenFilter, setScreenFilter] = useState('');

  const [loading, setLoading] = useState(false);

  const filter: AnalyticsFilter = useMemo(
    () => ({
      from: from ? `${from}T00:00:00Z` : undefined,
      to: to ? `${to}T23:59:59Z` : undefined,
      platform: platform || undefined
    }),
    [from, to, platform]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const [ov, te, ts, tse] = await Promise.all([
          analyticsService.overview(filter),
          analyticsService.topEvents(filter, 10),
          analyticsService.topScreens(filter, 10),
          analyticsService.topSections(filter, 10)
        ]);
        setOverview(ov);
        setTopEvents(te);
        setTopScreens(ts);
        setTopSections(tse);
      } else if (tab === 'events') {
        const te = await analyticsService.topEvents(filter, 50);
        setTopEvents(te);
      } else if (tab === 'screens') {
        const ts = await analyticsService.topScreens(filter, 50);
        setTopScreens(ts);
      } else if (tab === 'sections') {
        const tse = await analyticsService.topSections(filter, 100);
        setTopSections(tse);
      } else if (tab === 'funnel') {
        const steps = funnelSteps.split(',').map((s) => s.trim()).filter(Boolean);
        const f = await analyticsService.funnel(filter, steps);
        setFunnel(f.steps);
      } else if (tab === 'log') {
        const log = await analyticsService.listEvents(
          { ...filter, event_name: eventNameFilter || undefined, screen: screenFilter || undefined },
          eventsPage,
          PAGE_LIMIT
        );
        setEvents(log.items);
        setEventsPagination(log.pagination);
      }
    } catch (err) {
      setError({ title: 'Failed to load analytics', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [tab, filter, funnelSteps, eventsPage, eventNameFilter, screenFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset paging when filter changes for the events log.
  useEffect(() => {
    if (tab === 'log') setEventsPage(1);
  }, [filter, eventNameFilter, screenFilter, tab]);

  const handleExport = useCallback(async (kind: string) => {
    try {
      await analyticsService.downloadXlsx(kind, filter);
    } catch (err) {
      setError({ title: 'Export failed', message: extractErrorMessage(err) });
    }
  }, [filter]);

  const dailyChart = (overview?.daily ?? []).map((d) => ({
    day: typeof d.day === 'string' ? d.day.slice(0, 10) : d.day,
    events: d.events,
    users: d.unique_users,
    sessions: d.unique_sessions
  }));

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2><Activity size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />In-house Analytics</h2>
          <p>Live event-level data from app, website, and admin clients.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="table-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, padding: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Date Range</label>
            <DateRangePicker
              value={{ from: from || null, to: to || null }}
              onChange={(r: DateRange) => { setFrom(r.from ?? ''); setTo(r.to ?? ''); }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Platform</label>
            <select
              className="form-input"
              value={platform || ''}
              onChange={(e) => setPlatform((e.target.value || '') as AnalyticsFilter['platform'])}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>{p === '' ? 'All' : p}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('overview')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Overview
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('top-events')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Events
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('screens')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Screens
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('sections')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Sections
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('events')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Raw Log
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('all')}>
              <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />All
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="table-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['overview', 'events', 'screens', 'sections', 'funnel', 'log'] as TabKey[]).map((k) => (
            <button
              key={k}
              className={`btn btn-sm${tab === k ? ' btn-primary' : ' btn-ghost'}`}
              onClick={() => setTab(k)}
              style={{ minWidth: 90, textTransform: 'capitalize' }}
            >
              {k === 'log' ? 'Event Log' : k}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && overview && (
        <OverviewTab overview={overview} dailyChart={dailyChart} topEvents={topEvents} topScreens={topScreens} topSections={topSections} />
      )}
      {tab === 'events' && <EventsTab rows={topEvents} loading={loading} />}
      {tab === 'screens' && <ScreensTab rows={topScreens} loading={loading} />}
      {tab === 'sections' && <SectionsTab rows={topSections} loading={loading} />}
      {tab === 'funnel' && (
        <FunnelTab
          steps={funnelSteps}
          onStepsChange={setFunnelSteps}
          result={funnel}
          loading={loading}
          onApply={refresh}
        />
      )}
      {tab === 'log' && (
        <LogTab
          rows={events}
          pagination={eventsPagination}
          page={eventsPage}
          onPageChange={setEventsPage}
          eventName={eventNameFilter}
          onEventNameChange={setEventNameFilter}
          screen={screenFilter}
          onScreenChange={setScreenFilter}
          loading={loading}
        />
      )}

      <ErrorModal
        isOpen={!!error}
        title={error?.title ?? 'Error'}
        message={error?.message ?? ''}
        onClose={() => setError(null)}
        actionLabel="OK"
      />
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function OverviewTab({
  overview,
  dailyChart,
  topEvents,
  topScreens,
  topSections
}: {
  overview: OverviewResponse;
  dailyChart: Array<{ day: string; events: number; users: number; sessions: number }>;
  topEvents: TopEventRow[];
  topScreens: TopScreenRow[];
  topSections: TopSectionRow[];
}) {
  const stats = [
    { label: 'Events', value: overview.totals.events },
    { label: 'Screen Views', value: overview.totals.screen_views },
    { label: 'Interactions', value: overview.totals.interactions },
    { label: 'Features Used', value: overview.totals.features },
    { label: 'Errors', value: overview.totals.errors },
    { label: 'Unique Users', value: overview.distinct.unique_users },
    { label: 'Unique Sessions', value: overview.distinct.unique_sessions },
    { label: 'Avg Session', value: formatDuration(overview.session_stats.avg_duration_ms) },
    { label: 'Avg Events / Session', value: overview.session_stats.avg_events },
    { label: 'Avg Screens / Session', value: overview.session_stats.avg_screens }
  ];

  return (
    <>
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {stats.map((s) => (
          <div key={s.label} className="table-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div className="table-card" style={{ marginBottom: 16, padding: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Events / Users / Sessions per Day</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={dailyChart}>
            <defs>
              <linearGradient id="evtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#CC2936" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="usrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64B5F6" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#1565C0" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0F1115', border: '1px solid #1F2937', borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="events" stroke="#FF6B6B" fill="url(#evtGrad)" />
            <Area type="monotone" dataKey="users" stroke="#64B5F6" fill="url(#usrGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* By platform */}
        <div className="table-card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Events by Platform</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={overview.by_platform} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={80}>
                {overview.by_platform.map((entry) => (
                  <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || '#90A4AE'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0F1115', border: '1px solid #1F2937', borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top screens chart */}
        <div className="table-card" style={{ padding: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Top Screens</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topScreens.slice(0, 8)} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="screen" width={120} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0F1115', border: '1px solid #1F2937', borderRadius: 6 }} />
              <Bar dataKey="views" fill="#4D9FFF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compact tables: top events + top sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="table-card">
          <div className="table-header"><h3>Top Events</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Event</th><th>Count</th><th>Users</th></tr>
              </thead>
              <tbody>
                {topEvents.slice(0, 10).map((e) => (
                  <tr key={e.event_name}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.event_name}</td>
                    <td>{formatNumber(e.count)}</td>
                    <td>{formatNumber(e.unique_users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="table-card">
          <div className="table-header"><h3>Top Sections (by dwell)</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Screen</th><th>Section</th><th>Avg Dwell</th></tr>
              </thead>
              <tbody>
                {topSections.slice(0, 10).map((s) => (
                  <tr key={`${s.screen}|${s.section}`}>
                    <td style={{ fontSize: 12 }}>{s.screen}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.section}</td>
                    <td>{formatDuration(s.avg_dwell_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function EventsTab({ rows, loading }: { rows: TopEventRow[]; loading: boolean }) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>Count</th>
              <th>Unique Users</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="empty-state"><p>Loading…</p></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>No events in this range.</p></div></td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.event_name}>
                  <td style={{ fontFamily: 'monospace' }}>{r.event_name}</td>
                  <td><span className="badge badge-yellow">{r.category}</span></td>
                  <td>{formatNumber(r.count)}</td>
                  <td>{formatNumber(r.unique_users)}</td>
                  <td>{new Date(r.last_seen).toLocaleString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScreensTab({ rows, loading }: { rows: TopScreenRow[]; loading: boolean }) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Screen</th>
              <th>Views</th>
              <th>Unique Users</th>
              <th>Unique Sessions</th>
              <th>Avg Dwell</th>
              <th>Total Dwell</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="empty-state"><p>Loading…</p></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><p>No screen views in this range.</p></div></td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.screen}>
                  <td>{r.screen}</td>
                  <td>{formatNumber(r.views)}</td>
                  <td>{formatNumber(r.unique_users)}</td>
                  <td>{formatNumber(r.unique_sessions)}</td>
                  <td>{formatDuration(r.avg_dwell_ms)}</td>
                  <td>{formatDuration(r.total_dwell_ms)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionsTab({ rows, loading }: { rows: TopSectionRow[]; loading: boolean }) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Screen</th>
              <th>Section</th>
              <th>Views</th>
              <th>Unique Users</th>
              <th>Avg Dwell</th>
              <th>Total Dwell</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="empty-state"><p>Loading…</p></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><p>No section dwell yet — add useTrackSectionDwell to client components.</p></div></td></tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.screen}|${r.section}`}>
                  <td>{r.screen}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.section}</td>
                  <td>{formatNumber(r.views)}</td>
                  <td>{formatNumber(r.unique_users)}</td>
                  <td>{formatDuration(r.avg_dwell_ms)}</td>
                  <td>{formatDuration(r.total_dwell_ms)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FunnelTab({
  steps,
  onStepsChange,
  result,
  loading,
  onApply
}: {
  steps: string;
  onStepsChange: (s: string) => void;
  result: FunnelStep[];
  loading: boolean;
  onApply: () => void;
}) {
  const max = result.length > 0 ? result[0].users : 0;
  return (
    <div className="table-card" style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Conversion Funnel</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
        Comma-separated event names, in order. Each step counts users who completed all prior steps in this date range.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          value={steps}
          onChange={(e) => onStepsChange(e.target.value)}
          placeholder="app.open, auth.google_login_success, ..."
        />
        <button className="btn btn-primary btn-sm" onClick={onApply} disabled={loading}>Apply</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result.map((s, i) => {
          const pct = max > 0 ? Math.round((s.users / max) * 100) : 0;
          const dropoff = i > 0 && result[i - 1].users > 0
            ? Math.round((1 - s.users / result[i - 1].users) * 100)
            : 0;
          return (
            <div key={s.event}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace' }}>{s.event}</span>
                <span>
                  {formatNumber(s.users)} users · {pct}%
                  {i > 0 && <span style={{ color: dropoff > 0 ? '#FF6B6B' : '#69F0AE', marginLeft: 8 }}>
                    {dropoff > 0 ? `−${dropoff}% drop` : 'no drop'}
                  </span>}
                </span>
              </div>
              <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #FF6B6B, #CC2936)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogTab({
  rows,
  pagination,
  page,
  onPageChange,
  eventName,
  onEventNameChange,
  screen,
  onScreenChange,
  loading
}: {
  rows: AnalyticsEventRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  page: number;
  onPageChange: (p: number) => void;
  eventName: string;
  onEventNameChange: (s: string) => void;
  screen: string;
  onScreenChange: (s: string) => void;
  loading: boolean;
}) {
  return (
    <div className="table-card">
      <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid var(--border)' }}>
        <input
          className="form-input"
          placeholder="Filter by event name (e.g. discover.swipe)"
          value={eventName}
          onChange={(e) => onEventNameChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <input
          className="form-input"
          placeholder="Filter by screen"
          value={screen}
          onChange={(e) => onScreenChange(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Event</th>
              <th>Screen / Section</th>
              <th>User</th>
              <th>Platform</th>
              <th>Duration</th>
              <th>Properties</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="empty-state"><p>Loading…</p></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><p>No events match.</p></div></td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(r.created_at).toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.event_name}</td>
                  <td style={{ fontSize: 12 }}>
                    {r.screen}{r.section ? ` · ${r.section}` : ''}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.user_name ? (
                      <span>{r.user_name}<br /><span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{r.user_email}</span></span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>anonymous</span>
                    )}
                  </td>
                  <td>{r.platform}</td>
                  <td style={{ fontSize: 12 }}>{r.duration_ms ? formatDuration(r.duration_ms) : '—'}</td>
                  <td style={{ fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {Object.keys(r.properties || {}).length > 0 ? JSON.stringify(r.properties) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Page {page} of {pagination.totalPages} · {formatNumber(pagination.total)} events
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹</button>
            <button className="pagination-btn" onClick={() => onPageChange(page + 1)} disabled={page >= pagination.totalPages}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
