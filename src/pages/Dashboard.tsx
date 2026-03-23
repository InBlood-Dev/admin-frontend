import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Heart, MessageSquare, Crown, ShieldAlert, BadgeCheck, IndianRupee,
  UserPlus, Clapperboard, TrendingUp, MapPin, ChevronDown, Globe, Smartphone, Tablet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  Legend, Treemap,
} from 'recharts';
import dashboardService from '../services/dashboard.service';
import ErrorModal from '../components/ErrorModal';
import type {
  DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan,
  GenderPoint, AgeRangePoint, LocationDistribution, OrientationPoint, DemographicsSummary,
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

const CHART_COLORS = ['#E53935', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b'];
const GENDER_COLORS: Record<string, string> = { Man: '#2196f3', Woman: '#E53935', 'Non-Binary': '#9c27b0', Other: '#ff9800', Unknown: '#607d8b' };

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
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ── Animated stat card ──────────────────────────────────────────────────────

function AnimatedStatCard({ label, target, icon: Icon, color, bg, change, prefix = '', suffix = '', delay = 0 }: {
  label: string; target: number; icon: React.ElementType; color: string; bg: string;
  change?: string; prefix?: string; suffix?: string; delay?: number;
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
      <div className="stat-value">{prefix}{formatNum(animVal)}{suffix}</div>
      {change && <div className="stat-change">{change}</div>}
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, prefix = '' }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string; prefix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {prefix}{formatNum(p.value)}</p>
      ))}
    </div>
  );
}

// ── Custom pie label ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = (innerRadius || 0) + ((outerRadius || 0) - (innerRadius || 0)) * 0.5;
  const x = (cx || 0) + radius * Math.cos(-(midAngle || 0) * RADIAN);
  const y = (cy || 0) + radius * Math.sin(-(midAngle || 0) * RADIAN);
  return (
    <text x={x} y={y} fill="#f0f0f0" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
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

type DashboardSection = 'overview' | 'demographics' | 'engagement';

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [locationView, setLocationView] = useState<'states' | 'cities'>('states');

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

  const [loading, setLoading] = useState(true);
  const [demographicsLoading, setDemographicsLoading] = useState(false);
  const [demographicsLoaded, setDemographicsLoaded] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // ── Fetch core overview data ────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      dashboardService.getStats(),
      dashboardService.getUserGrowth(),
      dashboardService.getSignups(),
      dashboardService.getRevenue(),
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

  // ── Fetch demographics data (lazy, only when tab activated) ─────────────
  const fetchDemographics = useCallback(async () => {
    if (demographicsLoaded) return;
    setDemographicsLoading(true);

    const results = await Promise.allSettled([
      dashboardService.getGenderDistribution(),
      dashboardService.getAgeDistribution(),
      dashboardService.getLocationDistribution(),
      dashboardService.getOrientationDistribution(),
      dashboardService.getDemographicsSummary(),
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

  // ── Load overview on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // ── Lazy-load demographics when tab switches ───────────────────────────
  useEffect(() => {
    if (activeSection === 'demographics') {
      fetchDemographics();
    }
  }, [activeSection, fetchDemographics]);

  // ── Pie data for gender ─────────────────────────────────────────────────
  const genderPieData = genderData.map(g => ({ name: g.gender, value: g.count }));
  const orientationPieData = orientationData.map(o => ({ name: o.orientation, value: o.count }));

  // ── Radial bar for revenue by plan ────────────────────────────────────
  const maxPlanRevenue = revenueByPlan.length ? Math.max(...revenueByPlan.map(r => r.total_amount)) : 1;
  const radialPlanData = revenueByPlan.map((r, i) => ({
    name: r.plan_type,
    value: r.total_amount,
    count: r.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    percentage: Math.round((r.total_amount / maxPlanRevenue) * 100),
  }));

  // ── Treemap for location ──────────────────────────────────────────────
  const locationItems = locationView === 'states' ? locationData.states : locationData.cities;
  const treemapData = locationItems.map((l, i) => ({
    name: l.name,
    size: l.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // ── Sections ──────────────────────────────────────────────────────────

  const sections: { key: DashboardSection; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'demographics', label: 'Demographics', icon: Users },
    { key: 'engagement', label: 'Engagement', icon: Globe },
  ];

  return (
    <div className="dashboard-root animate-in">
      {/* Header */}
      <div className="page-top dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back. Here's what's happening with InBlood.</p>
        </div>
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

      {/* ═══ OVERVIEW SECTION ═══ */}
      {activeSection === 'overview' && (
        <div className="dashboard-section animate-in">
          {/* Stat cards */}
          <div className="stats-grid">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
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
                  <AnimatedStatCard label="Active Today" target={stats.active_today} icon={UserPlus} color="var(--green)" bg="var(--green-soft)" change={`${stats.active_this_week.toLocaleString()} this week`} delay={0.05} />
                  <AnimatedStatCard label="Active This Month" target={stats.active_this_month} icon={TrendingUp} color="var(--purple)" bg="var(--purple-soft)" change={stats.total_users ? `${((stats.active_this_month / stats.total_users) * 100).toFixed(1)}% of total` : '—'} delay={0.1} />
                  <AnimatedStatCard label="Total Matches" target={stats.total_matches} icon={Heart} color="var(--accent)" bg="var(--accent-soft)" delay={0.15} />
                  <AnimatedStatCard label="Messages Sent" target={stats.total_messages} icon={MessageSquare} color="var(--purple)" bg="var(--purple-soft)" delay={0.2} />
                  <AnimatedStatCard label="Premium Users" target={stats.premium_users} icon={Crown} color="var(--yellow)" bg="var(--yellow-soft)" change={stats.total_users ? `${((stats.premium_users / stats.total_users) * 100).toFixed(1)}% conversion` : '—'} delay={0.25} />
                  <AnimatedStatCard label="MRR" target={stats.mrr} icon={IndianRupee} color="var(--green)" bg="var(--green-soft)" prefix="₹" delay={0.3} />
                  <AnimatedStatCard label="Active Stories" target={stats.stories_active} icon={Clapperboard} color="var(--blue)" bg="var(--blue-soft)" change="Last 24 hours" delay={0.35} />
                </>
              )}
          </div>

          {/* Moderation quick actions */}
          {!loading && stats && (
            <div className="quick-actions">
              <div className="quick-action-card" onClick={() => navigate('/reports')}>
                <div className="quick-action-icon" style={{ background: 'var(--accent-soft)' }}>
                  <ShieldAlert size={17} color="var(--accent)" />
                </div>
                <div className="quick-action-text">
                  <h4>Review Reports</h4>
                  <p>{stats.pending_reports} pending reports</p>
                </div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/verifications')}>
                <div className="quick-action-icon" style={{ background: 'var(--blue-soft)' }}>
                  <BadgeCheck size={17} color="var(--blue)" />
                </div>
                <div className="quick-action-text">
                  <h4>Verify Users</h4>
                  <p>{stats.pending_verifications} pending</p>
                </div>
              </div>
              <div className="quick-action-card" onClick={() => navigate('/stories')}>
                <div className="quick-action-icon" style={{ background: 'var(--purple-soft)' }}>
                  <Clapperboard size={17} color="var(--purple)" />
                </div>
                <div className="quick-action-text">
                  <h4>Moderate Stories</h4>
                  <p>{stats.stories_active} active stories</p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          {!loading && (
            <>
              <div className="charts-row">
                {/* User Growth - Area Chart */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>User Growth</h3>
                    <span className="chart-badge">6 months</span>
                  </div>
                  {userGrowthData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradientUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#E53935" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#E53935" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="users" stroke="#E53935" strokeWidth={2.5} fill="url(#gradientUsers)" animationDuration={1500} animationEasing="ease-out" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* New Signups - Bar Chart */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>New Signups</h3>
                    <span className="chart-badge">This week</span>
                  </div>
                  {signupsData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={signupsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="signups" fill="#2196f3" radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                            {signupsData.map((_, i) => (
                              <Cell key={i} fill={`rgba(33, 150, 243, ${0.5 + (i / signupsData.length) * 0.5})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="charts-row">
                {/* Monthly Revenue - Area Chart */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Monthly Revenue</h3>
                    <span className="chart-badge">6 months</span>
                  </div>
                  {revenueData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4caf50" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#4caf50" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + formatNum(v)} />
                          <Tooltip content={<ChartTooltip prefix="₹" />} />
                          <Area type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2.5} fill="url(#gradientRevenue)" animationDuration={1500} animationEasing="ease-out" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Revenue by Plan - Radial Bar */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Revenue by Plan</h3>
                    <span className="chart-badge">All time</span>
                  </div>
                  {revenueByPlan.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={220}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialPlanData} startAngle={180} endAngle={0}>
                          <RadialBar dataKey="value" animationDuration={1400} animationEasing="ease-out" cornerRadius={6} background={{ fill: '#1c1c1c' }} label={{ position: 'insideStart', fill: '#f0f0f0', fontSize: 10, formatter: (v: unknown) => '₹' + formatNum(Number(v) || 0) }} />
                          <Legend iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11, textTransform: 'capitalize' }}>{value}</span>} />
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="chart-tooltip">
                                <p style={{ textTransform: 'capitalize', fontWeight: 600 }}>{d.name}</p>
                                <p>Revenue: ₹{formatNum(d.value)}</p>
                                <p>Transactions: {d.count}</p>
                              </div>
                            );
                          }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
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
              <div className="charts-row">
                <div className="chart-card chart-card-wide skeleton-card">
                  <div className="skeleton" style={{ width: 150, height: 16 }} />
                  <div className="skeleton" style={{ width: '100%', height: 240, marginTop: 16, borderRadius: 8 }} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Gender & Orientation */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Gender Distribution</h3>
                    <span className="chart-badge">{genderData.reduce((s, g) => s + g.count, 0)} users</span>
                  </div>
                  {genderData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container chart-container-with-legend">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={genderPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            labelLine={false}
                            label={renderPieLabel}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {genderPieData.map((entry, i) => (
                              <Cell key={i} fill={GENDER_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="chart-tooltip">
                                <p style={{ fontWeight: 600 }}>{payload[0].name}</p>
                                <p>{formatNum(payload[0].value as number)} users</p>
                              </div>
                            );
                          }} />
                          <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Sexual Orientation</h3>
                    <span className="chart-badge">{orientationData.reduce((s, o) => s + o.count, 0)} users</span>
                  </div>
                  {orientationData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container chart-container-with-legend">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={orientationPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            labelLine={false}
                            label={renderPieLabel}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {orientationPieData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="chart-tooltip">
                                <p style={{ fontWeight: 600 }}>{payload[0].name}</p>
                                <p>{formatNum(payload[0].value as number)} users</p>
                              </div>
                            );
                          }} />
                          <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Age Distribution */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header">
                    <h3>Age Distribution</h3>
                    <span className="chart-badge">{ageData.reduce((s, a) => s + a.count, 0)} users</span>
                  </div>
                  {ageData.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={ageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis dataKey="range" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="count" name="Users" radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                            {ageData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Gender x Age breakdown */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header">
                    <h3>Gender by Age Group</h3>
                    <span className="chart-badge">Cross-tab</span>
                  </div>
                  {demoSummary.gender_by_age.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={demoSummary.gender_by_age} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis dataKey="age_group" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                          <Bar dataKey="Man" fill="#2196f3" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Woman" fill="#E53935" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Non-Binary" fill="#9c27b0" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Other" fill="#ff9800" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="charts-row">
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Location Distribution</h3>
                    <FilterDropdown
                      value={locationView}
                      onChange={(v) => setLocationView(v as 'states' | 'cities')}
                      options={[{ value: 'states', label: 'States' }, { value: 'cities', label: 'Cities' }]}
                      label="View"
                    />
                  </div>
                  {locationItems.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <Treemap
                          data={treemapData}
                          dataKey="size"
                          aspectRatio={4 / 3}
                          stroke="#0B0B0B"
                          animationDuration={1000}
                          content={({ x, y, width, height, name, value }: { x: number; y: number; width: number; height: number; name: string; value: number }) => {
                            if (width < 40 || height < 30) return <rect x={x} y={y} width={width} height={height} fill={treemapData.find(d => d.name === name)?.fill || '#333'} stroke="#0B0B0B" strokeWidth={2} rx={4} />;
                            return (
                              <g>
                                <rect x={x} y={y} width={width} height={height} fill={treemapData.find(d => d.name === name)?.fill || '#333'} stroke="#0B0B0B" strokeWidth={2} rx={4} />
                                <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
                                <text x={x + width / 2} y={y + height / 2 + 9} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>{formatNum(value)}</text>
                              </g>
                            );
                          }}
                        />
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top locations bar chart */}
                <div className="chart-card">
                  <div className="chart-card-header">
                    <h3>Top {locationView === 'states' ? 'States' : 'Cities'}</h3>
                    <span className="chart-badge"><MapPin size={12} /> Top 10</span>
                  </div>
                  {locationItems.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container location-bars-container">
                      {locationItems.slice(0, 10).map((loc, i) => {
                        const maxCount = locationItems[0]?.count || 1;
                        return (
                          <div className="location-bar-row" key={loc.name}>
                            <span className="location-bar-rank">{i + 1}</span>
                            <span className="location-bar-name">{loc.name}</span>
                            <div className="location-bar-track">
                              <div
                                className="location-bar-fill"
                                style={{
                                  width: `${(loc.count / maxCount) * 100}%`,
                                  background: CHART_COLORS[i % CHART_COLORS.length],
                                  animationDelay: `${i * 0.08}s`,
                                }}
                              />
                            </div>
                            <span className="location-bar-value">{formatNum(loc.count)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Gender by State */}
              <div className="charts-row">
                <div className="chart-card chart-card-wide">
                  <div className="chart-card-header">
                    <h3>Gender by State</h3>
                    <span className="chart-badge">Top 10 states</span>
                  </div>
                  {demoSummary.gender_by_state.length === 0 ? (
                    <p className="chart-empty">No data available</p>
                  ) : (
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={demoSummary.gender_by_state} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="state" type="category" tick={{ fill: '#ccc', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: '#ccc', fontSize: 11 }}>{value}</span>} />
                          <Bar dataKey="Man" fill="#2196f3" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Woman" fill="#E53935" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Non-Binary" fill="#9c27b0" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} />
                          <Bar dataKey="Other" fill="#ff9800" radius={[0, 4, 4, 0]} stackId="a" animationDuration={1200} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ ENGAGEMENT SECTION ═══ */}
      {activeSection === 'engagement' && (
        <div className="dashboard-section animate-in">
          {/* Platform cards */}
          <div className="section-heading">
            <h3>Platform Engagement</h3>
            <p>User activity across different platforms</p>
          </div>

          <div className="platform-grid">
            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--blue-soft)' }}>
                <Globe size={22} color="var(--blue)" />
              </div>
              <div className="platform-card-info">
                <h4>Website</h4>
                <p className="platform-status live">Live</p>
              </div>
              <div className="platform-card-details">
                <div className="platform-detail">
                  <span>Analytics</span>
                  <span className="platform-badge configured">PostHog</span>
                </div>
                <div className="platform-detail">
                  <span>Session Replay</span>
                  <span className="platform-badge configured">Clarity</span>
                </div>
                <div className="platform-detail">
                  <span>Account Status</span>
                  <span className="platform-badge not-configured">Not configured</span>
                </div>
              </div>
            </div>

            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--green-soft)' }}>
                <Smartphone size={22} color="var(--green)" />
              </div>
              <div className="platform-card-info">
                <h4>Android App</h4>
                <p className="platform-status live">Live</p>
              </div>
              <div className="platform-card-details">
                <div className="platform-detail">
                  <span>Analytics</span>
                  <span className="platform-badge not-configured">Not set up</span>
                </div>
                <div className="platform-detail">
                  <span>Tracking</span>
                  <span className="platform-badge not-configured">Not integrated</span>
                </div>
              </div>
            </div>

            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--purple-soft)' }}>
                <Tablet size={22} color="var(--purple)" />
              </div>
              <div className="platform-card-info">
                <h4>iOS App</h4>
                <p className="platform-status upcoming">Upcoming</p>
              </div>
              <div className="platform-card-details">
                <div className="platform-detail">
                  <span>Status</span>
                  <span className="platform-badge not-configured">Not deployed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking info */}
          <div className="section-heading" style={{ marginTop: 32 }}>
            <h3>User Behavior Tracking</h3>
            <p>Analytics and session recording integrations</p>
          </div>

          <div className="tracking-grid">
            <div className="tracking-card">
              <div className="tracking-card-header">
                <div className="tracking-logo posthog">PH</div>
                <div>
                  <h4>PostHog</h4>
                  <span className="tracking-type">Product Analytics</span>
                </div>
              </div>
              <div className="tracking-card-body">
                <div className="tracking-detail"><span>Platform</span><span>Website</span></div>
                <div className="tracking-detail"><span>Features</span><span>Events, Page views, User identification</span></div>
                <div className="tracking-detail"><span>Integration</span><span className="platform-badge configured">Integrated</span></div>
                <div className="tracking-detail"><span>Account</span><span className="platform-badge not-configured">Needs setup</span></div>
              </div>
            </div>

            <div className="tracking-card">
              <div className="tracking-card-header">
                <div className="tracking-logo clarity">MC</div>
                <div>
                  <h4>Microsoft Clarity</h4>
                  <span className="tracking-type">Session Replay & Heatmaps</span>
                </div>
              </div>
              <div className="tracking-card-body">
                <div className="tracking-detail"><span>Platform</span><span>Website</span></div>
                <div className="tracking-detail"><span>Features</span><span>Session recording, Heatmaps, User behavior</span></div>
                <div className="tracking-detail"><span>Integration</span><span className="platform-badge configured">Integrated</span></div>
                <div className="tracking-detail"><span>Account</span><span className="platform-badge not-configured">Needs setup</span></div>
              </div>
            </div>
          </div>

          {/* Action items */}
          <div className="engagement-actions">
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Setup Required</h3>
              </div>
              <div className="action-items">
                <div className="action-item">
                  <div className="action-dot" style={{ background: 'var(--accent)' }} />
                  <div>
                    <strong>Create PostHog account</strong>
                    <p>Set <code>NEXT_PUBLIC_POSTHOG_KEY</code> and <code>NEXT_PUBLIC_POSTHOG_HOST</code> env vars</p>
                  </div>
                </div>
                <div className="action-item">
                  <div className="action-dot" style={{ background: 'var(--accent)' }} />
                  <div>
                    <strong>Create Microsoft Clarity account</strong>
                    <p>Set <code>NEXT_PUBLIC_CLARITY_PROJECT_ID</code> env var</p>
                  </div>
                </div>
                <div className="action-item">
                  <div className="action-dot" style={{ background: 'var(--yellow)' }} />
                  <div>
                    <strong>Add analytics to Android app</strong>
                    <p>Integrate PostHog React Native SDK or Firebase Analytics in mobile app</p>
                  </div>
                </div>
                <div className="action-item">
                  <div className="action-dot" style={{ background: 'var(--text-muted)' }} />
                  <div>
                    <strong>iOS deployment</strong>
                    <p>Deploy to App Store and integrate analytics tracking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
