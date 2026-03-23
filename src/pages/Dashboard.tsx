import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Heart, MessageSquare, Crown, ShieldAlert, BadgeCheck, IndianRupee,
  UserPlus, Clapperboard, TrendingUp, MapPin, ChevronDown, ChevronLeft, ChevronRight,
  Globe, Smartphone, Tablet, Calendar, X,
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
  DateRange, PremiumComparison,
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

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// ══════════════════════════════════════════════════════════════════════════════
// DATE RANGE PICKER
// ══════════════════════════════════════════════════════════════════════════════

interface PresetRange { label: string; from: Date; to: Date }

function getPresets(): PresetRange[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const d90 = new Date(today); d90.setDate(today.getDate() - 89);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: yesterday, to: yesterday },
    { label: 'Last 7 days', from: d7, to: today },
    { label: 'Last 30 days', from: d30, to: today },
    { label: 'Last 90 days', from: d90, to: today },
    { label: 'This Month', from: thisMonthStart, to: today },
    { label: 'Last Month', from: lastMonthStart, to: lastMonthEnd },
    { label: 'This Year', from: thisYearStart, to: today },
  ];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const t = day.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function CalendarMonth({ year, month, from, to, hovered, onSelect, onHover }: {
  year: number; month: number; from: Date | null; to: Date | null; hovered: Date | null;
  onSelect: (d: Date) => void; onHover: (d: Date | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const effectiveTo = to || hovered;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div className="cal-cell empty" key={`e${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isFrom = isSameDay(date, from);
    const isTo = isSameDay(date, effectiveTo);
    const inRange = isInRange(date, from, effectiveTo);
    const isToday = isSameDay(date, today);
    const isFuture = date > today;

    let cls = 'cal-cell';
    if (isFrom || isTo) cls += ' selected';
    if (inRange && !isFrom && !isTo) cls += ' in-range';
    if (isToday) cls += ' today';
    if (isFuture) cls += ' disabled';
    if (isFrom && effectiveTo && !isSameDay(from, effectiveTo)) cls += ' range-start';
    if (isTo && from && !isSameDay(from, effectiveTo)) cls += ' range-end';

    cells.push(
      <button
        className={cls}
        key={d}
        disabled={isFuture}
        onClick={() => onSelect(date)}
        onMouseEnter={() => onHover(date)}
        onMouseLeave={() => onHover(null)}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="cal-month">
      <div className="cal-month-title">{monthNames[month]} {year}</div>
      <div className="cal-weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => <div key={w}>{w}</div>)}
      </div>
      <div className="cal-grid">{cells}</div>
    </div>
  );
}

function DateRangePicker({ value, onChange }: {
  value: DateRange; onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickFrom, setPickFrom] = useState<Date | null>(value.from ? new Date(value.from) : null);
  const [pickTo, setPickTo] = useState<Date | null>(value.to ? new Date(value.to) : null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Two calendar months: current view
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1);

  const secondMonth = viewMonth + 1 > 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth + 1 > 11 ? viewYear + 1 : viewYear;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function handleSelect(d: Date) {
    if (!selectingEnd) {
      setPickFrom(d);
      setPickTo(null);
      setSelectingEnd(true);
    } else {
      if (d < pickFrom!) {
        setPickFrom(d);
        setPickTo(pickFrom);
      } else {
        setPickTo(d);
      }
      setSelectingEnd(false);
    }
  }

  function apply() {
    if (pickFrom && pickTo) {
      onChange({ from: toYMD(pickFrom), to: toYMD(pickTo) });
      setOpen(false);
    } else if (pickFrom) {
      onChange({ from: toYMD(pickFrom), to: toYMD(pickFrom) });
      setOpen(false);
    }
  }

  function clear() {
    setPickFrom(null);
    setPickTo(null);
    setSelectingEnd(false);
    onChange({ from: null, to: null });
    setOpen(false);
  }

  function applyPreset(p: PresetRange) {
    setPickFrom(p.from);
    setPickTo(p.to);
    onChange({ from: toYMD(p.from), to: toYMD(p.to) });
    setOpen(false);
  }

  const hasRange = value.from && value.to;
  const presets = getPresets();

  const triggerLabel = hasRange
    ? `${formatDateShort(new Date(value.from!))} — ${formatDateShort(new Date(value.to!))}`
    : 'All Time';

  return (
    <div className="date-range-picker" ref={ref}>
      <button className="drp-trigger" onClick={() => setOpen(!open)}>
        <Calendar size={14} />
        <span>{triggerLabel}</span>
        {hasRange && (
          <span className="drp-clear" onClick={(e) => { e.stopPropagation(); clear(); }}>
            <X size={12} />
          </span>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="drp-popup">
          {/* Presets sidebar */}
          <div className="drp-presets">
            <div className="drp-presets-title">Quick Select</div>
            {presets.map(p => (
              <button key={p.label} className="drp-preset-btn" onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar area */}
          <div className="drp-calendars">
            <div className="drp-nav">
              <button onClick={prevMonth}><ChevronLeft size={16} /></button>
              <button onClick={nextMonth}><ChevronRight size={16} /></button>
            </div>

            <div className="drp-months">
              <CalendarMonth
                year={viewYear} month={viewMonth}
                from={pickFrom} to={pickTo} hovered={selectingEnd ? hovered : null}
                onSelect={handleSelect} onHover={setHovered}
              />
              <CalendarMonth
                year={secondYear} month={secondMonth}
                from={pickFrom} to={pickTo} hovered={selectingEnd ? hovered : null}
                onSelect={handleSelect} onHover={setHovered}
              />
            </div>

            {/* Footer */}
            <div className="drp-footer">
              <div className="drp-selection">
                {pickFrom ? formatDateShort(pickFrom) : '—'}
                <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>to</span>
                {pickTo ? formatDateShort(pickTo) : '—'}
              </div>
              <div className="drp-actions">
                <button className="drp-btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
                <button className="drp-btn-apply" onClick={apply} disabled={!pickFrom}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section tabs ────────────────────────────────────────────────────────────

type DashboardSection = 'overview' | 'demographics' | 'premium' | 'engagement';

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

  const [loading, setLoading] = useState(true);
  const [demographicsLoading, setDemographicsLoading] = useState(false);
  const [demographicsLoaded, setDemographicsLoaded] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumLoaded, setPremiumLoaded] = useState(false);
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

  // ── Load overview on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetchOverview(dateRange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy-load tabs ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeSection === 'demographics') fetchDemographics(dateRange);
    if (activeSection === 'premium') fetchPremium(dateRange);
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date range change: refetch active section ──────────────────────────
  function handleDateRangeChange(newRange: DateRange) {
    setDateRange(newRange);
    // Reset loaded flags so data re-fetches
    setDemographicsLoaded(false);
    setPremiumLoaded(false);

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
          <p>Welcome back. Here's what's happening with InBlood.</p>
        </div>
        <div className="dashboard-header-controls">
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
                <div className="platform-detail"><span>Account Status</span><span className="platform-badge not-configured">Not configured</span></div>
              </div>
            </div>
            <div className="platform-card">
              <div className="platform-card-icon" style={{ background: 'var(--green-soft)' }}><Smartphone size={22} color="var(--green)" /></div>
              <div className="platform-card-info"><h4>Android App</h4><p className="platform-status live">Live</p></div>
              <div className="platform-card-details">
                <div className="platform-detail"><span>Analytics</span><span className="platform-badge not-configured">Not set up</span></div>
                <div className="platform-detail"><span>Tracking</span><span className="platform-badge not-configured">Not integrated</span></div>
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
                <div className="tracking-detail"><span>Account</span><span className="platform-badge not-configured">Needs setup</span></div>
              </div>
            </div>
            <div className="tracking-card">
              <div className="tracking-card-header"><div className="tracking-logo clarity">MC</div><div><h4>Microsoft Clarity</h4><span className="tracking-type">Session Replay & Heatmaps</span></div></div>
              <div className="tracking-card-body">
                <div className="tracking-detail"><span>Platform</span><span>Website</span></div>
                <div className="tracking-detail"><span>Features</span><span>Session recording, Heatmaps, User behavior</span></div>
                <div className="tracking-detail"><span>Integration</span><span className="platform-badge configured">Integrated</span></div>
                <div className="tracking-detail"><span>Account</span><span className="platform-badge not-configured">Needs setup</span></div>
              </div>
            </div>
          </div>
          <div className="engagement-actions"><div className="chart-card"><div className="chart-card-header"><h3>Setup Required</h3></div>
            <div className="action-items">
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--accent)' }} /><div><strong>Create PostHog account</strong><p>Set <code>NEXT_PUBLIC_POSTHOG_KEY</code> and <code>NEXT_PUBLIC_POSTHOG_HOST</code> env vars</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--accent)' }} /><div><strong>Create Microsoft Clarity account</strong><p>Set <code>NEXT_PUBLIC_CLARITY_PROJECT_ID</code> env var</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--yellow)' }} /><div><strong>Add analytics to Android app</strong><p>Integrate PostHog React Native SDK or Firebase Analytics in mobile app</p></div></div>
              <div className="action-item"><div className="action-dot" style={{ background: 'var(--text-muted)' }} /><div><strong>iOS deployment</strong><p>Deploy to App Store and integrate analytics tracking</p></div></div>
            </div>
          </div></div>
        </div>
      )}

      <ErrorModal isOpen={!!error} title={error?.title ?? 'Error'} message={error?.message ?? ''} onClose={() => setError(null)} actionLabel="OK" />
    </div>
  );
}
