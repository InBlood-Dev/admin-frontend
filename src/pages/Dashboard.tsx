import { useState, useEffect, useCallback } from 'react';
import {
  Users, Heart, MessageSquare, Crown, ShieldAlert, BadgeCheck, IndianRupee, UserPlus, Clapperboard, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../services/dashboard.service';
import ErrorModal from '../components/ErrorModal';
import type { DashboardStats, UserGrowthPoint, SignupsPoint, RevenuePoint, RevenueByPlan } from '../types';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    (err instanceof Error ? err.message : 'Something went wrong')
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthPoint[]>([]);
  const [signupsData, setSignupsData] = useState<SignupsPoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, growthRes, signupsRes, revenueRes, revByPlanRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getUserGrowth(),
        dashboardService.getSignups(),
        dashboardService.getRevenue(),
        dashboardService.getRevenueByPlan(),
      ]);
      setStats(statsRes);
      setUserGrowthData(growthRes);
      setSignupsData(signupsRes);
      setRevenueData(revenueRes);
      setRevenueByPlan(revByPlanRes);
    } catch (err) {
      setError({ title: 'Failed to load dashboard', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Stat cards config ───────────────────────────────────────────────────
  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'var(--blue)', bg: 'var(--blue-soft)', change: `+${stats.new_users_today} today` },
        { label: 'Active Today', value: stats.active_today.toLocaleString(), icon: UserPlus, color: 'var(--green)', bg: 'var(--green-soft)', change: `${stats.active_this_week.toLocaleString()} this week` },
        { label: 'Active This Month', value: stats.active_this_month.toLocaleString(), icon: TrendingUp, color: 'var(--purple)', bg: 'var(--purple-soft)', change: stats.total_users ? `${((stats.active_this_month / stats.total_users) * 100).toFixed(1)}% of total` : '—' },
        { label: 'Total Matches', value: stats.total_matches.toLocaleString(), icon: Heart, color: 'var(--accent)', bg: 'var(--accent-soft)', change: '' },
        { label: 'Messages Sent', value: stats.total_messages >= 1000 ? (stats.total_messages / 1000).toFixed(0) + 'K' : stats.total_messages.toString(), icon: MessageSquare, color: 'var(--purple)', bg: 'var(--purple-soft)', change: '' },
        { label: 'Premium Users', value: stats.premium_users.toLocaleString(), icon: Crown, color: 'var(--yellow)', bg: 'var(--yellow-soft)', change: stats.total_users ? `${((stats.premium_users / stats.total_users) * 100).toFixed(1)}% conversion` : '—' },
        { label: 'MRR', value: '₹' + (stats.mrr >= 1000 ? (stats.mrr / 1000).toFixed(1) + 'K' : stats.mrr.toString()), icon: IndianRupee, color: 'var(--green)', bg: 'var(--green-soft)', change: '' },
        { label: 'Active Stories', value: stats.stories_active.toString(), icon: Clapperboard, color: 'var(--blue)', bg: 'var(--blue-soft)', change: 'Last 24 hours' },
      ]
    : [];

  const maxUsers = userGrowthData.length ? Math.max(...userGrowthData.map(d => d.users)) : 1;
  const maxRevenue = revenueData.length ? Math.max(...revenueData.map(d => d.revenue)) : 1;
  const maxSignups = signupsData.length ? Math.max(...signupsData.map(d => d.signups)) : 1;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back. Here's what's happening with InBlood.</p>
        </div>
      </div>

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
          : statCards.map((s, i) => (
              <div className="stat-card" key={s.label} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="stat-card-header">
                  <span>{s.label}</span>
                  <div className="stat-icon" style={{ background: s.bg }}>
                    <s.icon size={16} color={s.color} />
                  </div>
                </div>
                <div className="stat-value">{s.value}</div>
                {s.change && <div className="stat-change">{s.change}</div>}
              </div>
            ))}
      </div>

      {/* Moderation queue */}
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
            <div className="chart-card">
              <h3>User Growth</h3>
              {userGrowthData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 16 }}>No data available</p>
              ) : (
                <div className="chart-bars">
                  {userGrowthData.map(d => (
                    <div className="chart-bar-group" key={`${d.month}-${d.year}`}>
                      <div className="chart-bar-value">{d.users >= 1000 ? (d.users / 1000).toFixed(1) + 'K' : d.users}</div>
                      <div className="chart-bar" style={{ height: `${(d.users / maxUsers) * 100}%`, background: 'var(--accent)', opacity: 0.6 + (d.users / maxUsers) * 0.4 }} />
                      <div className="chart-bar-label">{d.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="chart-card">
              <h3>New Signups (This Week)</h3>
              {signupsData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 16 }}>No data available</p>
              ) : (
                <div className="chart-bars">
                  {signupsData.map(d => (
                    <div className="chart-bar-group" key={d.date}>
                      <div className="chart-bar-value">{d.signups}</div>
                      <div className="chart-bar" style={{ height: `${(d.signups / maxSignups) * 100}%`, background: 'var(--blue)', opacity: 0.6 + (d.signups / maxSignups) * 0.4 }} />
                      <div className="chart-bar-label">{d.day}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <h3>Monthly Revenue</h3>
              {revenueData.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 16 }}>No data available</p>
              ) : (
                <div className="chart-bars">
                  {revenueData.map(d => (
                    <div className="chart-bar-group" key={`${d.month}-${d.year}`}>
                      <div className="chart-bar-value">₹{d.revenue >= 1000 ? (d.revenue / 1000).toFixed(0) + 'K' : d.revenue}</div>
                      <div className="chart-bar" style={{ height: `${(d.revenue / maxRevenue) * 100}%`, background: 'var(--green)', opacity: 0.6 + (d.revenue / maxRevenue) * 0.4 }} />
                      <div className="chart-bar-label">{d.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="chart-card">
              <h3>Revenue by Plan</h3>
              {revenueByPlan.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 16 }}>No data available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {revenueByPlan.map(r => {
                    const maxAmt = Math.max(...revenueByPlan.map(x => x.total_amount));
                    return (
                      <div key={r.plan_type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{r.plan_type}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            ₹{r.total_amount >= 1000 ? (r.total_amount / 1000).toFixed(0) + 'K' : r.total_amount} ({r.count})
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(r.total_amount / maxAmt) * 100}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
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
