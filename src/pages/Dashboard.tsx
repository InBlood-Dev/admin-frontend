import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Heart, MessageSquare, Crown, ShieldAlert, BadgeCheck, IndianRupee,
  UserPlus, Clapperboard, TrendingUp, MapPin, ChevronDown,
  Globe, Smartphone, Tablet, BarChart3, Eye, Clock, Monitor, Link, Activity,
  Download, MousePointerClick, Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  Legend, Treemap,
} from 'recharts';
import dashboardService from '../services/dashboard.service';
import ErrorModal from '../components/ErrorModal';
import ExportModal from '../components/ExportModal';
import DateRangePicker from '../components/DateRangePicker';
import type {
  DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan,
  GenderPoint, AgeRangePoint, LocationDistribution, OrientationPoint, DemographicsSummary,
  DateRange, PremiumComparison,
  AnalyticsOverview, DailyTrendPoint, DailySessionPoint, TopPage, TopEvent, ReferrerPoint, DevicePoint,
  PlayInstallStats, SearchConsoleOverview, SearchQueryRow, SearchPageRow, SearchDailyPoint,
  UptimeStats, UptimePoint,
} from '../types';

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    (err instanceof Error ? err.message : 'Something went wrong')
  );
}

// Glowy/vibrant palette
const CHART_COLORS = [
  '#FF4D4D', // vivid red
  '#4D9FFF', // vivid blue
  '#4DFF88', // vivid green
  '#FFB74D', // vivid amber
  '#CF6EFF', // vivid purple
  '#4DE8E0', // vivid cyan
  '#FF6E40', // vivid orange
  '#90A4AE', // steel
];

// Gradient pairs: [bright top, deeper bottom]
const CHART_GRADIENTS: [string, string][] = [
  ['#FF6B6B', '#CC2936'], // red
  ['#64B5F6', '#1565C0'], // blue
  ['#69F0AE', '#2E7D32'], // green
  ['#FFCC80', '#E65100'], // amber
  ['#CE93D8', '#7B1FA2'], // purple
  ['#80DEEA', '#00838F'], // cyan
  ['#FFAB91', '#D84315'], // orange
  ['#B0BEC5', '#546E7A'], // steel
];

const GENDER_COLORS: Record<string, string> = { Man: '#4D9FFF', Woman: '#FF4D4D', 'Non-Binary': '#CF6EFF', Other: '#FFB74D', Unknown: '#90A4AE' };
const GENDER_GRADIENTS: Record<string, [string, string]> = {
  Man: ['#64B5F6', '#1565C0'],
  Woman: ['#FF6B6B', '#CC2936'],
  'Non-Binary': ['#CE93D8', '#7B1FA2'],
  Other: ['#FFCC80', '#E65100'],
  Unknown: ['#B0BEC5', '#546E7A'],
};

// SVG gradient defs shared across all charts
function ChartGradientDefs() {
  return (
    <defs>
      {CHART_GRADIENTS.map(([top, bottom], i) => (
        <linearGradient key={`cg${i}`} id={`chartGrad${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} stopOpacity={1} />
          <stop offset="100%" stopColor={bottom} stopOpacity={0.85} />
        </linearGradient>
      ))}
      {Object.entries(GENDER_GRADIENTS).map(([key, [top, bottom]]) => (
        <linearGradient key={`gg-${key}`} id={`genderGrad-${key.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} stopOpacity={1} />
          <stop offset="100%" stopColor={bottom} stopOpacity={0.85} />
        </linearGradient>
      ))}
      {/* Premium vs Free */}
      <linearGradient id="gradPremiumBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFCC80" stopOpacity={1} />
        <stop offset="100%" stopColor="#E65100" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gradFreeBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#64B5F6" stopOpacity={1} />
        <stop offset="100%" stopColor="#1565C0" stopOpacity={0.85} />
      </linearGradient>
    </defs>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// ── Animated counter hook ───────────────────────────────────────────────────

function useAnimatedValue(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── Animated stat card ──────────────────────────────────────────────────────

function AnimatedStatCard({ label, target, icon: Icon, color, bg, change, prefix = '', delay = 0 }: {
  label: string; target: number; icon: React.ElementType; color: string; bg: string;
  change?: string; prefix?: string; delay?: number;
}) {
  const animVal = useAnimatedValue(target);
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-card-header">
        <span>{label}</span>
        <div className="stat-icon" style={{ background: bg }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="stat-value">{prefix}{formatNum(animVal)}</div>
      {change && <div className="stat-change">{change}</div>}
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────

// Resolve gradient URLs to actual colors for tooltip text
function resolveColor(color: string, index: number): string {
  if (color && !color.startsWith('url(')) return color;
  // Fallback to chart color based on index
  return CHART_COLORS[index % CHART_COLORS.length];
}

const BAR_CURSOR = { fill: 'rgba(255, 255, 255, 0.04)' };

function ChartTooltip({ active, payload, label, prefix = '' }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string; prefix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: resolveColor(p.color, i) }} />
          <span className="chart-tooltip-name">{p.name}</span>
          <span className="chart-tooltip-val">{prefix}{formatNum(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, percent, name } = props;
  if (!percent || percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  // Label outside the pie with a small offset
  const radius = (outerRadius || 0) + 18;
  const x = (cx || 0) + radius * Math.cos(-(midAngle || 0) * RADIAN);
  const y = (cy || 0) + radius * Math.sin(-(midAngle || 0) * RADIAN);
  const pct = `${(percent * 100).toFixed(0)}%`;
  const anchor = x > (cx || 0) ? 'start' : 'end';
  return (
    <text x={x} y={y} fill="#ccc" textAnchor={anchor} dominantBaseline="central" fontSize={10} fontWeight={500}>
      {percent >= 0.08 ? `${name}, ${pct}` : pct}
    </text>
  );
}

// ── Dropdown filter ─────────────────────────────────────────────────────────

function FilterDropdown({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button className="filter-dropdown-trigger" onClick={() => setOpen(!open)}>
        <span>{label}: {selected?.label}</span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          {options.map(o => (
            <button
              key={o.value}
              className={`filter-dropdown-item ${o.value === value ? 'active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Section tabs ────────────────────────────────────────────────────────────

type DashboardSection = 'overview' | 'demographics' | 'premium' | 'analytics' | 'engagement';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [locationView, setLocationView] = useState<'states' | 'cities'>('states');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  // ── Core data ───────────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthPoint[]>([]);
  const [signupsData, setSignupsData] = useState<SignupsPoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);

  // ── Demographic data ────────────────────────────────────────────────────
  const [genderData, setGenderData] = useState<GenderPoint[]>([]);
  const [ageData, setAgeData] = useState<AgeRangePoint[]>([]);
  const [locationData, setLocationData] = useState<LocationDistribution>({ states: [], cities: [] });
  const [orientationData, setOrientationData] = useState<OrientationPoint[]>([]);
  const [demoSummary, setDemoSummary] = useState<DemographicsSummary>({ gender_by_age: [], gender_by_state: [] });

  // ── Premium comparison data ─────────────────────────────────────────────
  const [premiumData, setPremiumData] = useState<PremiumComparison | null>(null);

  // ── PostHog analytics data ─────────────────────────────────────────────
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [dailyTrends, setDailyTrends] = useState<DailyTrendPoint[]>([]);
  const [dailySessions, setDailySessions] = useState<DailySessionPoint[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [referrers, setReferrers] = useState<ReferrerPoint[]>([]);
  const [devices, setDevices] = useState<DevicePoint[]>([]);

  // ── External analytics (Play, Search Console, Uptime) ─────────────────
  const [playInstalls, setPlayInstalls] = useState<PlayInstallStats | null>(null);
  const [searchOverview, setSearchOverview] = useState<SearchConsoleOverview | null>(null);
  const [searchQueries, setSearchQueries] = useState<SearchQueryRow[]>([]);
  const [searchPages, setSearchPages] = useState<SearchPageRow[]>([]);
  const [searchTrends, setSearchTrends] = useState<SearchDailyPoint[]>([]);
  const [uptimeStats, setUptimeStats] = useState<UptimeStats | null>(null);
  const [uptimeTimeline, setUptimeTimeline] = useState<UptimePoint[]>([]);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [demographicsLoading, setDemographicsLoading] = useState(false);
  const [demographicsLoaded, setDemographicsLoaded] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumLoaded, setPremiumLoaded] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // ── Fetch core overview data ────────────────────────────────────────────
  const fetchOverview = useCallback(async (range: DateRange) => {
    setLoading(true);
    const results = await Promise.allSettled([
      dashboardService.getStats(range),
      dashboardService.getUserGrowth(range),
      dashboardService.getSignups(range),
      dashboardService.getRevenue(range),
      dashboardService.getRevenueByPlan(),
    ]);

    const [statsRes, growthRes, signupsRes, revenueRes, revByPlanRes] = results;

    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    else setError({ title: 'Failed to load stats', message: extractErrorMessage(statsRes.reason) });

    if (growthRes.status === 'fulfilled') setUserGrowthData(growthRes.value);
    if (signupsRes.status === 'fulfilled') setSignupsData(signupsRes.value);
    if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value);
    if (revByPlanRes.status === 'fulfilled') setRevenueByPlan(revByPlanRes.value);

    setLoading(false);
  }, []);

  // ── Fetch demographics data ─────────────────────────────────────────────
  const fetchDemographics = useCallback(async (range: DateRange, force = false) => {
    if (demographicsLoaded && !force) return;
    setDemographicsLoading(true);

    const results = await Promise.allSettled([
      dashboardService.getGenderDistribution(range),
      dashboardService.getAgeDistribution(range),
      dashboardService.getLocationDistribution(range),
      dashboardService.getOrientationDistribution(range),
      dashboardService.getDemographicsSummary(range),
    ]);

    const [genderRes, ageRes, locRes, orientRes, demoRes] = results;
    if (genderRes.status === 'fulfilled') setGenderData(genderRes.value);
    if (ageRes.status === 'fulfilled') setAgeData(ageRes.value);
    if (locRes.status === 'fulfilled') setLocationData(locRes.value);
    if (orientRes.status === 'fulfilled') setOrientationData(orientRes.value);
    if (demoRes.status === 'fulfilled') setDemoSummary(demoRes.value);

    setDemographicsLoaded(true);
    setDemographicsLoading(false);
  }, [demographicsLoaded]);

  // ── Fetch premium comparison ────────────────────────────────────────────
  const fetchPremium = useCallback(async (range: DateRange, force = false) => {
    if (premiumLoaded && !force) return;
    setPremiumLoading(true);

    try {
      const result = await dashboardService.getPremiumComparison(range);
      setPremiumData(result);
    } catch (err) {
      setError({ title: 'Failed to load premium comparison', message: extractErrorMessage(err) });
    }

    setPremiumLoaded(true);
    setPremiumLoading(false);
  }, [premiumLoaded]);

  // ── Fetch PostHog analytics ────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (range: DateRange, force = false) => {
    if (analyticsLoaded && !force) return;
    setAnalyticsLoading(true);

    const results = await Promise.allSettled([
      dashboardService.getAnalyticsOverview(range),
      dashboardService.getAnalyticsDailyTrends(range),
      dashboardService.getAnalyticsDailySessions(range),
      dashboardService.getAnalyticsTopPages(range),
      dashboardService.getAnalyticsTopEvents(range),
      dashboardService.getAnalyticsReferrers(range),
      dashboardService.getAnalyticsDevices(range),
      dashboardService.getPlayInstalls(range),
      dashboardService.getSearchOverview(range),
      dashboardService.getSearchQueries(range),
      dashboardService.getSearchPages(range),
      dashboardService.getSearchTrends(range),
      dashboardService.getUptimeStats(),
      dashboardService.getUptimeTimeline(),
    ]);

    const [
      overviewRes, trendsRes, sessionsRes, pagesRes, eventsRes, refRes, devRes,
      playRes, scOverviewRes, scQueriesRes, scPagesRes, scTrendsRes, uptimeRes, uptimeTlRes,
    ] = results;
    if (overviewRes.status === 'fulfilled') setAnalyticsOverview(overviewRes.value);
    if (trendsRes.status === 'fulfilled') setDailyTrends(trendsRes.value);
    if (sessionsRes.status === 'fulfilled') setDailySessions(sessionsRes.value);
    if (pagesRes.status === 'fulfilled') setTopPages(pagesRes.value);
    if (eventsRes.status === 'fulfilled') setTopEvents(eventsRes.value);
    if (refRes.status === 'fulfilled') setReferrers(refRes.value);
    if (devRes.status === 'fulfilled') setDevices(devRes.value);
    if (playRes.status === 'fulfilled') setPlayInstalls(playRes.value);
    if (scOverviewRes.status === 'fulfilled') setSearchOverview(scOverviewRes.value);
    if (scQueriesRes.status === 'fulfilled') setSearchQueries(scQueriesRes.value);
    if (scPagesRes.status === 'fulfilled') setSearchPages(scPagesRes.value);
    if (scTrendsRes.status === 'fulfilled') setSearchTrends(scTrendsRes.value);
    if (uptimeRes.status === 'fulfilled') setUptimeStats(uptimeRes.value);
    if (uptimeTlRes.status === 'fulfilled') setUptimeTimeline(uptimeTlRes.value);

    setAnalyticsLoaded(true);
    setAnalyticsLoading(false);
  }, [analyticsLoaded]);

  // ── Load overview on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchOverview(dateRange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy-load tabs ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeSection === 'demographics') fetchDemographics(dateRange);
    if (activeSection === 'premium') fetchPremium(dateRange);
    if (activeSection === 'analytics') fetchAnalytics(dateRange);
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date range change: refetch active section ──────────────────────────
  function handleDateRangeChange(newRange: DateRange) {
    setDateRange(newRange);
    // Reset loaded flags so data re-fetches
    setDemographicsLoaded(false);
    setPremiumLoaded(false);
    setAnalyticsLoaded(false);

    // Refetch current section
    fetchOverview(newRange);
    if (activeSection === 'demographics') {
      setDemographicsLoading(true);
      // Small delay to let state update
      setTimeout(() => {
        fetchDemographics(newRange, true);
      }, 0);
    }
    if (activeSection === 'premium') {
      setPremiumLoading(true);
      setTimeout(() => {
        fetchPremium(newRange, true);
      }, 0);
    }
    if (activeSection === 'analytics') {
      setAnalyticsLoading(true);
      setTimeout(() => {
        fetchAnalytics(newRange, true);
      }, 0);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const genderPieData = genderData.map(g => ({ name: g.gender, value: g.count }));
  const orientationPieData = orientationData.map(o => ({ name: o.orientation, value: o.count }));

  const maxPlanRevenue = revenueByPlan.length ? Math.max(...revenueByPlan.map(r => r.total_amount)) : 1;
  const radialPlanData = revenueByPlan.map((r, i) => ({
    name: r.plan_type, value: r.total_amount, count: r.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    percentage: Math.round((r.total_amount / maxPlanRevenue) * 100),
  }));

  const locationItems = locationView === 'states' ? locationData.states : locationData.cities;
  const treemapData = locationItems.map((l, i) => ({
    name: l.name, size: l.count, fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const sections: { key: DashboardSection; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'demographics', label: 'Demographics', icon: Users },
    { key: 'premium', label: 'Premium vs Free', icon: Crown },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'engagement', label: 'Engagement', icon: Globe },
  ];

  return (
    <div className="dashboard-root animate-in">
      {/* Shared SVG gradient definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <ChartGradientDefs />
      </svg>

      {/* Header */}
      <div className="page-top dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back. Here's what's happening with inBlood.</p>
        </div>
        <div className="dashboard-header-controls">
          <button
            className="btn btn-ghost export-trigger-btn"
            onClick={() => setExportModalOpen(true)}
            title="Export dashboard data"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          <div className="dashboard-tabs">
            {sections.map(s => (
              <button
                key={s.key}
                className={`dashboard-tab ${activeSection === s.key ? 'active' : ''}`}
                onClick={() => setActiveSection(s.key)}
              >
                <s.icon size={14} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ OVERVIEW SECTION ═══ */}
      {activeSection === 'overview' && (
        <div className="dashboard-section animate-in">
          <div className="stats-grid">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div className="stat-card skeleton-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="stat-card-header">
                      <span className="skeleton" style={{ width: 80, height: 14 }} />
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    </div>
                    <div className="skeleton" style={{ width: 60, height: 28, marginTop: 8 }} />
                    <div className="skeleton" style={{ width: 100, height: 12, marginTop: 8 }} />
                  </div>
                ))
              : stats && (
                <>
                  <AnimatedStatCard label="Total Users" target={stats.total_users} icon={Users} color="var(--blue)" bg="var(--blue-soft)" change={`+${stats.new_users_today} today`} delay={0} />
                  <AnimatedStatCard label="Currently Active" target={stats.currently_active} icon={Globe} color="var(--green)" bg="var(--green-soft)" change="Right now" delay={0.05} />
                  <AnimatedStatCard label="Active Today" target={stats.active_today} icon={UserPlus} color="var(--green)" bg="var(--green-soft)" change={`${stats.active_this_week.toLocaleString()} this week`} delay={0.1} />
                  <AnimatedStatCard label="Active This Month" target={stats.active_this_month} icon={TrendingUp} color="var(--purple)" bg="var(--purple-soft)" change={stats.total_users ? `${((stats.active_this_month / stats.total_users) * 100).toFixed(1)}% of total` : '—'} delay={0.15} />
                  <AnimatedStatCard label="Total Matches" target={stats.total_matches} icon={Heart} color="var(--accent)" bg="var(--accent-soft)" delay={0.2} />
                  <AnimatedStatCard label="Messages Sent" target={stats.total_messages} icon={MessageSquare} color="var(--purple)" bg="var(--purple-soft)" delay={0.25} />
                  <AnimatedStatCard label="Premium Users" target={stats.premium_users} icon={Crown} color="var(--yellow)" bg="var(--yellow-soft)" change={stats.total_users ? `${((stats.premium_users / stats.total_users) * 100).toFixed(1)}% conversion` : '—'} delay={0.3} />
                  <AnimatedStatCard label="MRR" target={stats.mrr} icon={IndianRupee} color="var(--green)" bg="var(--green-soft)" prefix="₹" delay={0.35} />
                  <AnimatedStatCard label="Active Stories" target={stats.stories_active} icon={Clapperboard} color="var(--blue)" bg="var(--blue-soft)" change="Last 24 hours" delay={0.4} />
                </>
              )}
          </div>

          {!loading && stats && (
            <div className="quick-actions">
              <div className="quick-action-card" onClick={() => navigate('/reports')}>
                <div className="quick-action-icon" style={{ background: 'var(--accent-soft)' }}><ShieldAlert size={17} color="var(--accent)" /></div>
                <div className="quick-action-text"><h4>Review Reports</h4><p>{stats.pending_reports} pending reports</p></div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/verifications')}>
                <div className="quick-action-icon" style={{ background: 'var(--blue-soft)' }}><BadgeCheck size={17} color="var(--blue)" /></div>
                <div className="quick-action-text"><h4>Verify Users</h4><p>{stats.pending_verifications} pending</p></div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/stories')}>
                <div className="quick-action-icon" style={{ background: 'var(--purple-soft)' }}><Clapperboard size={17} color="var(--purple)" /></div>
                <div className="quick-action-text"><h4>Moderate Stories</h4><p>{stats.stories_active} active stories</p></div>
              </div>
            </div>
          )}

          {!loading && (
            <>
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>User Growth</h3><span className="chart-badge">{dateRange.from ? 'Filtered' : '6 months'}</span></div>
                  {userGrowthData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs><linearGradient id="gradientUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.35} /><stop offset="100%" stopColor="#CC2936" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} /><Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="users" stroke="#FF6B6B" strokeWidth={2.5} fill="url(#gradientUsers)" animationDuration={1500} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>New Signups</h3><span className="chart-badge">{dateRange.from ? 'Filtered' : 'This week'}</span></div>
                  {signupsData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={220}>
                      <BarChart data={signupsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} cursor={BAR_CURSOR} />
                        <Bar dataKey="signups" fill="url(#chartGrad1)" radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                          {signupsData.map((_, i) => <Cell key={i} fill={`url(#chartGrad1)`} fillOpacity={0.55 + (i / signupsData.length) * 0.45} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Monthly Revenue</h3><span className="chart-badge">{dateRange.from ? 'Filtered' : '6 months'}</span></div>
                  {revenueData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs><linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#69F0AE" stopOpacity={0.35} /><stop offset="100%" stopColor="#2E7D32" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + formatNum(v)} /><Tooltip content={<ChartTooltip prefix="₹" />} />
                        <Area type="monotone" dataKey="revenue" stroke="#69F0AE" strokeWidth={2.5} fill="url(#gradientRevenue)" animationDuration={1500} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Revenue by Plan</h3><span className="chart-badge">All time</span></div>
                  {revenueByPlan.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={220}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialPlanData} startAngle={180} endAngle={0}>
                        <RadialBar dataKey="value" animationDuration={1400} animationEasing="ease-out" cornerRadius={6} background={{ fill: '#1c1c1c' }} label={{ position: 'insideStart', fill: '#f0f0f0', fontSize: 10, formatter: (v: unknown) => '₹' + formatNum(Number(v) || 0) }} />
                        <Legend iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11, textTransform: 'capitalize' }}>{value}</span>} />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return <div className="chart-tooltip"><p style={{ textTransform: 'capitalize', fontWeight: 600 }}>{d.name}</p><p>Revenue: ₹{formatNum(d.value)}</p><p>Transactions: {d.count}</p></div>;
                        }} />
                      </RadialBarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ DEMOGRAPHICS SECTION ═══ */}
      {activeSection === 'demographics' && (
        <div className="dashboard-section animate-in">
          {demographicsLoading ? (
            <>
              <div className="charts-row">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div className="chart-card skeleton-card" key={`a${i}`}>
                    <div className="skeleton" style={{ width: 120, height: 16 }} />
                    <div className="skeleton" style={{ width: '100%', height: 240, marginTop: 16, borderRadius: 8 }} />
                  </div>
                ))}
              </div>
              <div className="charts-row"><div className="chart-card chart-card-wide skeleton-card"><div className="skeleton" style={{ width: 150, height: 16 }} /><div className="skeleton" style={{ width: '100%', height: 240, marginTop: 16, borderRadius: 8 }} /></div></div>
            </>
          ) : (
            <>
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Gender Distribution</h3><span className="chart-badge">{genderData.reduce((s, g) => s + g.count, 0)} users</span></div>
                  {genderData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container chart-container-with-legend"><ResponsiveContainer width="100%" height={260}><PieChart>
                      <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="#0B0B0B" strokeWidth={2} labelLine={{ stroke: '#555', strokeWidth: 1 }} label={renderPieLabel} animationDuration={1200} animationEasing="ease-out">
                        {genderPieData.map((entry, i) => <Cell key={i} fill={`url(#genderGrad-${entry.name.replace(/\s/g, '-')})`} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><p style={{ fontWeight: 600 }}>{payload[0].name}</p><p>{formatNum(payload[0].value as number)} users</p></div>; }} />
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                    </PieChart></ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Sexual Orientation</h3><span className="chart-badge">{orientationData.reduce((s, o) => s + o.count, 0)} users</span></div>
                  {orientationData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container chart-container-with-legend"><ResponsiveContainer width="100%" height={260}><PieChart>
                      <Pie data={orientationPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="#0B0B0B" strokeWidth={2} labelLine={{ stroke: '#555', strokeWidth: 1 }} label={renderPieLabel} animationDuration={1200} animationEasing="ease-out">
                        {orientationPieData.map((_, i) => <Cell key={i} fill={`url(#chartGrad${i % CHART_GRADIENTS.length})`} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><p style={{ fontWeight: 600 }}>{payload[0].name}</p><p>{formatNum(payload[0].value as number)} users</p></div>; }} />
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                    </PieChart></ResponsiveContainer></div>
                  )}
                </div>
              </div>
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Age Distribution</h3><span className="chart-badge">{ageData.reduce((s, a) => s + a.count, 0)} users</span></div>
                  {ageData.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="range" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} cursor={BAR_CURSOR} />
                        <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                          {ageData.map((_, i) => <Cell key={i} fill={`url(#chartGrad${i % CHART_GRADIENTS.length})`} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Gender by Age Group</h3><span className="chart-badge">Cross-tab</span></div>
                  {demoSummary.gender_by_age.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={280}>
                      <BarChart data={demoSummary.gender_by_age} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="age_group" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} cursor={BAR_CURSOR} />
                        <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        <Bar dataKey="Man" fill="url(#genderGrad-Man)" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Woman" fill="url(#genderGrad-Woman)" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Non-Binary" fill="url(#genderGrad-Non-Binary)" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Other" fill="url(#genderGrad-Other)" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Location Distribution</h3>
                    <FilterDropdown value={locationView} onChange={(v) => setLocationView(v as 'states' | 'cities')} options={[{ value: 'states', label: 'States' }, { value: 'cities', label: 'Cities' }]} label="View" />
                  </div>
                  {locationItems.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={300}>
                      <Treemap data={treemapData} dataKey="size" aspectRatio={4 / 3} stroke="#0B0B0B" animationDuration={1000}
                        content={({ x, y, width, height, name, value }: { x: number; y: number; width: number; height: number; name: string; value: number }) => {
                          if (width < 40 || height < 30) return <rect x={x} y={y} width={width} height={height} fill={treemapData.find(d => d.name === name)?.fill || '#333'} stroke="#0B0B0B" strokeWidth={2} rx={4} />;
                          return <g><rect x={x} y={y} width={width} height={height} fill={treemapData.find(d => d.name === name)?.fill || '#333'} stroke="#0B0B0B" strokeWidth={2} rx={4} /><text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 3, strokeLinejoin: 'round' } as React.CSSProperties}>{name}</text><text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={10} fontWeight={600} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2.5, strokeLinejoin: 'round' } as React.CSSProperties}>{formatNum(value)}</text></g>;
                        }}
                      />
                    </ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Top {locationView === 'states' ? 'States' : 'Cities'}</h3><span className="chart-badge"><MapPin size={12} /> Top 10</span></div>
                  {locationItems.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container location-bars-container">
                      {locationItems.slice(0, 10).map((loc, i) => {
                        const maxCount = locationItems[0]?.count || 1;
                        return <div className="location-bar-row" key={loc.name}><span className="location-bar-rank">{i + 1}</span><span className="location-bar-name">{loc.name}</span><div className="location-bar-track"><div className="location-bar-fill" style={{ width: `${(loc.count / maxCount) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], animationDelay: `${i * 0.08}s` }} /></div><span className="location-bar-value">{formatNum(loc.count)}</span></div>;
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Gender by State</h3><span className="chart-badge">Top 10 states</span></div>
                  {demoSummary.gender_by_state.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={300}>
                      <BarChart data={demoSummary.gender_by_state} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} /><XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis dataKey="state" type="category" tick={{ fill: '#ccc', fontSize: 11 }} axisLine={false} tickLine={false} width={80} /><Tooltip content={<ChartTooltip />} cursor={BAR_CURSOR} />
                        <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        <Bar dataKey="Man" fill="url(#genderGrad-Man)" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Woman" fill="url(#genderGrad-Woman)" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Non-Binary" fill="url(#genderGrad-Non-Binary)" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} /><Bar dataKey="Other" fill="url(#genderGrad-Other)" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ PREMIUM VS FREE SECTION ═══ */}
      {activeSection === 'premium' && (
        <div className="dashboard-section animate-in">
          {premiumLoading ? (
            <>
              <div className="stats-grid">{Array.from({ length: 6 }).map((_, i) => <div className="stat-card skeleton-card" key={i}><div className="skeleton" style={{ width: 80, height: 14 }} /><div className="skeleton" style={{ width: 60, height: 28, marginTop: 12 }} /></div>)}</div>
              <div className="charts-row">{Array.from({ length: 2 }).map((_, i) => <div className="chart-card skeleton-card" key={i}><div className="skeleton" style={{ width: 120, height: 16 }} /><div className="skeleton" style={{ width: '100%', height: 220, marginTop: 16, borderRadius: 8 }} /></div>)}</div>
            </>
          ) : premiumData ? (
            <>
              {/* Side-by-side stat comparison */}
              <div className="premium-comparison-header">
                <div className="premium-side">
                  <div className="premium-side-label"><Crown size={14} /> Premium Users</div>
                  <div className="premium-side-value">{formatNum(premiumData.stats.premium.total)}</div>
                </div>
                <div className="premium-vs">VS</div>
                <div className="premium-side free">
                  <div className="premium-side-label"><Users size={14} /> Free Users</div>
                  <div className="premium-side-value">{formatNum(premiumData.stats.free.total)}</div>
                </div>
              </div>

              {/* Comparison stat cards */}
              <div className="premium-stats-grid">
                {[
                  { label: 'Active Today', pVal: premiumData.stats.premium.active_today, fVal: premiumData.stats.free.active_today },
                  { label: 'Active This Week', pVal: premiumData.stats.premium.active_this_week, fVal: premiumData.stats.free.active_this_week },
                  { label: 'Active This Month', pVal: premiumData.stats.premium.active_this_month, fVal: premiumData.stats.free.active_this_month },
                  { label: 'Matches', pVal: premiumData.stats.premium.matches, fVal: premiumData.stats.free.matches },
                ].map(item => (
                  <div className="premium-compare-card" key={item.label}>
                    <div className="premium-compare-label">{item.label}</div>
                    <div className="premium-compare-values">
                      <div className="premium-compare-val premium">
                        <span className="premium-compare-num">{formatNum(item.pVal)}</span>
                        <span className="premium-compare-tag">Premium</span>
                      </div>
                      <div className="premium-compare-bar">
                        <div className="premium-bar-fill premium-fill" style={{ width: `${item.pVal + item.fVal > 0 ? (item.pVal / (item.pVal + item.fVal)) * 100 : 50}%` }} />
                        <div className="premium-bar-fill free-fill" style={{ width: `${item.pVal + item.fVal > 0 ? (item.fVal / (item.pVal + item.fVal)) * 100 : 50}%` }} />
                      </div>
                      <div className="premium-compare-val free">
                        <span className="premium-compare-num">{formatNum(item.fVal)}</span>
                        <span className="premium-compare-tag">Free</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Growth comparison chart */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>User Growth: Premium vs Free</h3><span className="chart-badge">Monthly</span></div>
                  {premiumData.growth.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={premiumData.growth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradPremium" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFCC80" stopOpacity={0.35} /><stop offset="100%" stopColor="#E65100" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradFree" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64B5F6" stopOpacity={0.35} /><stop offset="100%" stopColor="#1565C0" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" /><XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} /><Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        <Area type="monotone" dataKey="premium" name="Premium" stroke="#FFCC80" strokeWidth={2.5} fill="url(#gradPremium)" animationDuration={1500} />
                        <Area type="monotone" dataKey="free" name="Free" stroke="#64B5F6" strokeWidth={2.5} fill="url(#gradFree)" animationDuration={1500} />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>

              {/* Age comparison */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Age Distribution: Premium vs Free</h3><span className="chart-badge">Comparison</span></div>
                  {premiumData.age.length === 0 ? <p className="chart-empty">No data available</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={280}>
                      <BarChart data={premiumData.age} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="range" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} cursor={BAR_CURSOR} />
                        <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        <Bar dataKey="premium" name="Premium" fill="url(#gradPremiumBar)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                        <Bar dataKey="free" name="Free" fill="url(#gradFreeBar)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>

              {/* Gender comparison */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Premium - Gender</h3><span className="chart-badge">{premiumData.gender.premium.reduce((s, g) => s + g.count, 0)} users</span></div>
                  {premiumData.gender.premium.length === 0 ? <p className="chart-empty">No data</p> : (
                    <div className="chart-container chart-container-with-legend"><ResponsiveContainer width="100%" height={240}><PieChart>
                      <Pie data={premiumData.gender.premium.map(g => ({ name: g.gender, value: g.count }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" stroke="#0B0B0B" strokeWidth={2} labelLine={{ stroke: '#555', strokeWidth: 1 }} label={renderPieLabel} animationDuration={1200}>
                        {premiumData.gender.premium.map((g, i) => <Cell key={i} fill={`url(#genderGrad-${g.gender.replace(/\s/g, '-')})`} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                    </PieChart></ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Free - Gender</h3><span className="chart-badge">{premiumData.gender.free.reduce((s, g) => s + g.count, 0)} users</span></div>
                  {premiumData.gender.free.length === 0 ? <p className="chart-empty">No data</p> : (
                    <div className="chart-container chart-container-with-legend"><ResponsiveContainer width="100%" height={240}><PieChart>
                      <Pie data={premiumData.gender.free.map(g => ({ name: g.gender, value: g.count }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" stroke="#0B0B0B" strokeWidth={2} labelLine={{ stroke: '#555', strokeWidth: 1 }} label={renderPieLabel} animationDuration={1200}>
                        {premiumData.gender.free.map((g, i) => <Cell key={i} fill={`url(#genderGrad-${g.gender.replace(/\s/g, '-')})`} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                    </PieChart></ResponsiveContainer></div>
                  )}
                </div>
              </div>
            </>
          ) : <p className="chart-empty">Failed to load premium comparison data</p>}
        </div>
      )}

      {/* ═══ ANALYTICS SECTION (PostHog) ═══ */}
      {activeSection === 'analytics' && (
        <div className="dashboard-section animate-in">
          {analyticsLoading ? (
            <>
              <div className="stats-grid">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div className="stat-card skeleton-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="stat-card-header">
                      <span className="skeleton" style={{ width: 80, height: 14 }} />
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    </div>
                    <div className="skeleton" style={{ width: 100, height: 28, marginTop: 8 }} />
                  </div>
                ))}
              </div>
              <div className="charts-row" style={{ marginTop: 24 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="chart-card skeleton-card" key={i} style={{ animationDelay: `${i * 0.05}s`, minHeight: 260 }} />
                ))}
              </div>
            </>
          ) : analyticsOverview ? (
            <>
              {/* ─── PLATFORM OVERVIEW ─── */}
              <div className="section-heading"><h3>Platform Overview</h3><p>Google Play, Search Console, and uptime metrics</p></div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-header"><span>Active Installs (Play)</span><div className="stat-icon" style={{ background: 'var(--green-soft)' }}><Smartphone size={18} color="var(--green)" /></div></div>
                  <div className="stat-value">{formatNum(playInstalls?.active_installs || 0)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>New Installs</span><div className="stat-icon" style={{ background: 'var(--blue-soft)' }}><Download size={18} color="var(--blue)" /></div></div>
                  <div className="stat-value">{formatNum(playInstalls?.total_installs || 0)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Search Clicks</span><div className="stat-icon" style={{ background: 'var(--purple-soft)' }}><MousePointerClick size={18} color="var(--purple)" /></div></div>
                  <div className="stat-value">{formatNum(searchOverview?.clicks || 0)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Search Impressions</span><div className="stat-icon" style={{ background: 'var(--yellow-soft)' }}><Eye size={18} color="var(--yellow)" /></div></div>
                  <div className="stat-value">{formatNum(searchOverview?.impressions || 0)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Avg Search Position</span><div className="stat-icon" style={{ background: 'var(--blue-soft)' }}><Search size={18} color="var(--blue)" /></div></div>
                  <div className="stat-value">{searchOverview?.position ? searchOverview.position.toFixed(1) : '—'}</div>
                </div>
                {(() => {
                  const pct = uptimeStats?.uptime_percentage;
                  const hasData = pct !== null && pct !== undefined;
                  const bg = !hasData ? 'var(--bg-card)' : pct >= 99 ? 'var(--green-soft)' : pct >= 95 ? 'var(--yellow-soft)' : 'var(--red-soft)';
                  const color = !hasData ? 'var(--text-muted)' : pct >= 99 ? 'var(--green)' : pct >= 95 ? 'var(--yellow)' : '#FF4D4D';
                  return (
                    <div className="stat-card">
                      <div className="stat-card-header"><span>Uptime (24h)</span><div className="stat-icon" style={{ background: bg }}><Activity size={18} color={color} /></div></div>
                      <div className="stat-value">{hasData ? `${pct.toFixed(2)}%` : '—'}</div>
                    </div>
                  );
                })()}
                <div className="stat-card">
                  <div className="stat-card-header"><span>Avg Response Time</span><div className="stat-icon" style={{ background: 'var(--green-soft)' }}><Clock size={18} color="var(--green)" /></div></div>
                  <div className="stat-value">{uptimeStats?.avg_response_ms != null ? `${uptimeStats.avg_response_ms}ms` : '—'}</div>
                </div>
              </div>

              {/* Daily Play installs + Search trends */}
              <div className="charts-row" style={{ marginTop: 24 }}>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Daily App Installs</h3><span className="chart-badge">{playInstalls?.daily_installs?.length || 0} days</span></div>
                  {!playInstalls?.daily_installs?.length ? <p className="chart-empty">No data — verify Play Console API is configured</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={playInstalls.daily_installs} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="installs" name="Installs" stroke="#4DFF88" fill="url(#chartGrad2)" strokeWidth={2} animationDuration={1200} />
                        <Area type="monotone" dataKey="uninstalls" name="Uninstalls" stroke="#FF4D4D" fill="url(#chartGrad0)" fillOpacity={0.3} strokeWidth={2} animationDuration={1200} />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Search Console Trends</h3><span className="chart-badge">{searchTrends.length} days</span></div>
                  {searchTrends.length === 0 ? <p className="chart-empty">No data — verify Search Console API is configured</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={searchTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#FFB74D" fill="url(#chartGrad3)" fillOpacity={0.25} strokeWidth={2} animationDuration={1200} />
                        <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#CF6EFF" fill="url(#chartGrad4)" strokeWidth={2} animationDuration={1200} />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>

              {/* Top search queries + pages */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Top Search Queries</h3><span className="chart-badge">{searchQueries.length} queries</span></div>
                  {searchQueries.length === 0 ? <p className="chart-empty">No query data</p> : (
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>Pos</th></tr></thead>
                        <tbody>
                          {searchQueries.map((q, i) => (
                            <tr key={i}>
                              <td className="analytics-event-name" title={q.query}>{q.query}</td>
                              <td>{formatNum(q.clicks)}</td>
                              <td>{formatNum(q.impressions)}</td>
                              <td>{q.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Top Search Pages</h3><span className="chart-badge">{searchPages.length} pages</span></div>
                  {searchPages.length === 0 ? <p className="chart-empty">No page data</p> : (
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead><tr><th>Page</th><th>Clicks</th><th>Impressions</th><th>Pos</th></tr></thead>
                        <tbody>
                          {searchPages.map((p, i) => (
                            <tr key={i}>
                              <td className="analytics-url" title={p.page}>{(() => { try { return new URL(p.page).pathname || '/'; } catch { return p.page; } })()}</td>
                              <td>{formatNum(p.clicks)}</td>
                              <td>{formatNum(p.impressions)}</td>
                              <td>{p.position.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Uptime timeline */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Uptime Timeline (24h)</h3><span className="chart-badge">{uptimeStats?.total_pings || 0} pings · {uptimeStats?.downtime_count || 0} failures</span></div>
                  {uptimeTimeline.length === 0 ? <p className="chart-empty">No uptime data yet — collecting...</p> : (
                    <div className="uptime-bar">
                      {uptimeTimeline.map((p, i) => (
                        <div
                          key={i}
                          className={`uptime-segment uptime-${p.status}`}
                          title={`${new Date(p.hour).toLocaleString()} — ${p.uptime_pct === null ? 'no data' : `${p.uptime_pct}% uptime`}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── POSTHOG ACTIVITY ─── */}
              <div className="section-heading" style={{ marginTop: 32 }}><h3>PostHog Activity</h3><p>Product analytics from website + app</p></div>

              {/* Overview stat cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-header"><span>Total Events</span><div className="stat-icon" style={{ background: 'var(--blue-soft)' }}><Activity size={18} color="var(--blue)" /></div></div>
                  <div className="stat-value">{formatNum(analyticsOverview.total_events)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Unique Users</span><div className="stat-icon" style={{ background: 'var(--green-soft)' }}><Users size={18} color="var(--green)" /></div></div>
                  <div className="stat-value">{formatNum(analyticsOverview.unique_users)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Page Views</span><div className="stat-icon" style={{ background: 'var(--purple-soft)' }}><Eye size={18} color="var(--purple)" /></div></div>
                  <div className="stat-value">{formatNum(analyticsOverview.page_views)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Screen Views (App)</span><div className="stat-icon" style={{ background: 'var(--yellow-soft)' }}><Smartphone size={18} color="var(--yellow)" /></div></div>
                  <div className="stat-value">{formatNum(analyticsOverview.screen_views)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Total Sessions</span><div className="stat-icon" style={{ background: 'var(--blue-soft)' }}><Globe size={18} color="var(--blue)" /></div></div>
                  <div className="stat-value">{formatNum(analyticsOverview.total_sessions)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Avg. Session Duration</span><div className="stat-icon" style={{ background: 'var(--green-soft)' }}><Clock size={18} color="var(--green)" /></div></div>
                  <div className="stat-value">{analyticsOverview.avg_duration_seconds < 60 ? `${analyticsOverview.avg_duration_seconds}s` : `${Math.floor(analyticsOverview.avg_duration_seconds / 60)}m ${analyticsOverview.avg_duration_seconds % 60}s`}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-header"><span>Pages / Session</span><div className="stat-icon" style={{ background: 'var(--purple-soft)' }}><Eye size={18} color="var(--purple)" /></div></div>
                  <div className="stat-value">{analyticsOverview.avg_pageviews_per_session}</div>
                </div>
              </div>

              {/* Daily trends chart */}
              <div className="charts-row" style={{ marginTop: 24 }}>
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Daily Page Views & Users</h3><span className="chart-badge">Last {dailyTrends.length} days</span></div>
                  {dailyTrends.length === 0 ? <p className="chart-empty">No data yet — events will appear after your first visitors</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Area type="monotone" dataKey="page_views" name="Page Views" stroke="#CF6EFF" fill="url(#chartGrad4)" fillOpacity={0.3} strokeWidth={2} animationDuration={1200} />
                        <Area type="monotone" dataKey="users" name="Users" stroke="#4DFF88" fill="url(#chartGrad2)" fillOpacity={0.2} strokeWidth={2} animationDuration={1200} />
                      </AreaChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>

              {/* Sessions chart */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header"><h3>Daily Sessions & Avg. Duration</h3></div>
                  {dailySessions.length === 0 ? <p className="chart-empty">No session data</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dailySessions} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                        <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} formatter={(value, name) => { const v = Number(value) || 0; return name === 'Avg Duration' ? [`${Math.floor(v / 60)}m ${v % 60}s`, name] : [v, name]; }} />
                        <Bar dataKey="sessions" name="Sessions" fill="url(#chartGrad1)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                        <Bar dataKey="avg_duration" name="Avg Duration" fill="url(#chartGrad5)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>

              {/* Top pages & top events */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Top Pages</h3><span className="chart-badge">{topPages.length} pages</span></div>
                  {topPages.length === 0 ? <p className="chart-empty">No page view data</p> : (
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead>
                        <tbody>
                          {topPages.map((p, i) => (
                            <tr key={i}>
                              <td className="analytics-url" title={p.url}>{p.url ? new URL(p.url).pathname : '/'}</td>
                              <td>{formatNum(p.views)}</td>
                              <td>{formatNum(p.unique_visitors)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Top Events</h3><span className="chart-badge">{topEvents.length} events</span></div>
                  {topEvents.length === 0 ? <p className="chart-empty">No event data</p> : (
                    <div className="analytics-table-container">
                      <table className="analytics-table">
                        <thead><tr><th>Event</th><th>Count</th><th>Users</th></tr></thead>
                        <tbody>
                          {topEvents.map((e, i) => (
                            <tr key={i}>
                              <td className="analytics-event-name">{e.event}</td>
                              <td>{formatNum(e.count)}</td>
                              <td>{formatNum(e.unique_users)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Referrers & devices */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Referrers</h3></div>
                  {referrers.length === 0 ? <p className="chart-empty">No referrer data</p> : (
                    <div className="chart-container"><ResponsiveContainer width="100%" height={260}>
                      <BarChart data={referrers} layout="vertical" margin={{ top: 10, right: 10, left: 80, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} />
                        <YAxis type="category" dataKey="referrer" tick={{ fill: '#aaa', fontSize: 11 }} width={80} tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + '...' : v} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                        <Bar dataKey="count" name="Visits" fill="url(#chartGrad0)" radius={[0, 4, 4, 0]} animationDuration={1200} />
                      </BarChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
                <div className="chart-card">
                  <div className="chart-card-header"><h3>Devices</h3></div>
                  {devices.length === 0 ? <p className="chart-empty">No device data</p> : (
                    <div className="chart-container chart-container-with-legend"><ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={devices.map(d => ({ name: d.device, value: d.count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" stroke="#0B0B0B" strokeWidth={2} labelLine={{ stroke: '#555', strokeWidth: 1 }} label={renderPieLabel} animationDuration={1200}>
                          {devices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer></div>
                  )}
                </div>
              </div>
            </>
          ) : <p className="chart-empty">Failed to load analytics data. Make sure PostHog Personal API Key is configured.</p>}
        </div>
      )}

      {/* ═══ ENGAGEMENT SECTION ═══ */}
      {activeSection === 'engagement' && (
        <div className="dashboard-section animate-in">
          <div className="section-heading"><h3>Platform Engagement</h3><p>User activity across different platforms</p></div>
          <div className="platform-grid">
            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--blue-soft)' }}><Globe size={22} color="var(--blue)" /></div>
              <div className="platform-card-info"><h4>Website</h4><p className="platform-status live">Live</p></div>
              <div className="platform-card-details">
                <div className="platform-detail"><span>Analytics</span><span className="platform-badge configured">PostHog</span></div>
                <div className="platform-detail"><span>Session Replay</span><span className="platform-badge configured">Clarity</span></div>
                <div className="platform-detail"><span>Account Status</span><span className="platform-badge configured">Configured</span></div>
              </div>
            </div>
            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--green-soft)' }}><Smartphone size={22} color="var(--green)" /></div>
              <div className="platform-card-info"><h4>Android App</h4><p className="platform-status live">Live</p></div>
              <div className="platform-card-details">
                <div className="platform-detail"><span>Analytics</span><span className="platform-badge configured">PostHog + Clarity</span></div>
                <div className="platform-detail"><span>Tracking</span><span className="platform-badge configured">Integrated</span></div>
              </div>
            </div>
            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--purple-soft)' }}><Tablet size={22} color="var(--purple)" /></div>
              <div className="platform-card-info"><h4>iOS App</h4><p className="platform-status upcoming">Upcoming</p></div>
              <div className="platform-card-details"><div className="platform-detail"><span>Status</span><span className="platform-badge not-configured">Not deployed</span></div></div>
            </div>
          </div>
          <div className="section-heading" style={{ marginTop: 32 }}><h3>User Behavior Tracking</h3><p>Analytics and session recording integrations</p></div>
          <div className="tracking-grid">
            <div className="tracking-card">
              <div className="tracking-card-header"><div className="tracking-logo posthog">PH</div><div><h4>PostHog</h4><span className="tracking-type">Product Analytics</span></div></div>
              <div className="tracking-card-body">
                <div className="tracking-detail"><span>Platform</span><span>Website</span></div>
                <div className="tracking-detail"><span>Features</span><span>Events, Page views, User identification</span></div>
                <div className="tracking-detail"><span>Integration</span><span className="platform-badge configured">Integrated</span></div>
                <div className="tracking-detail"><span>Account</span><span className="platform-badge configured">Configured</span></div>
              </div>
            </div>
            <div className="tracking-card">
              <div className="tracking-card-header"><div className="tracking-logo clarity">MC</div><div><h4>Microsoft Clarity</h4><span className="tracking-type">Session Replay & Heatmaps</span></div></div>
              <div className="tracking-card-body">
                <div className="tracking-detail"><span>Platform</span><span>Website</span></div>
                <div className="tracking-detail"><span>Features</span><span>Session recording, Heatmaps, User behavior</span></div>
                <div className="tracking-detail"><span>Integration</span><span className="platform-badge configured">Integrated</span></div>
                <div className="tracking-detail"><span>Account</span><span className="platform-badge configured">Configured</span></div>
              </div>
            </div>
          </div>
          <div className="engagement-actions"><div className="chart-card"><div className="chart-card-header"><h3>Setup Required</h3></div>
            <div className="action-items">
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--green)' }} /><div><strong>Create PostHog account</strong><p>Configured — Project ID 368943 (US Cloud)</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--green)' }} /><div><strong>Create Microsoft Clarity account</strong><p>Configured — Project ID w6giyz4fgc</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--green)' }} /><div><strong>Add analytics to Android app</strong><p>PostHog + Clarity integrated in React Native app</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--text-muted)' }} /><div><strong>iOS deployment</strong><p>Deploy to App Store and integrate analytics tracking</p></div></div>
            </div>
          </div></div>
        </div>
      )}

      <ErrorModal isOpen={!!error} title={error?.title ?? 'Error'} message={error?.message ?? ''} onClose={() => setError(null)} actionLabel="OK" />
      <ExportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} currentDateRange={dateRange} />
    </div>
  );
}
