import {
  Users, Heart, MessageSquare, Crown, ShieldAlert, BadgeCheck, IndianRupee, UserPlus, Clapperboard, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardStats, userGrowthData, revenueData, signupsData, revenueByPlan } from '../data/mock';

export default function Dashboard() {
  const navigate = useNavigate();
  const s = dashboardStats;

  const stats = [
    { label: 'Total Users', value: s.total_users.toLocaleString(), icon: Users, color: 'var(--blue)', bg: 'var(--blue-soft)', change: `+${s.new_users_today} today` },
    { label: 'Active Today', value: s.active_today.toLocaleString(), icon: UserPlus, color: 'var(--green)', bg: 'var(--green-soft)', change: `${s.active_this_week.toLocaleString()} this week` },
    { label: 'Active This Month', value: s.active_this_month.toLocaleString(), icon: TrendingUp, color: 'var(--purple)', bg: 'var(--purple-soft)', change: `${((s.active_this_month / s.total_users) * 100).toFixed(1)}% of total` },
    { label: 'Total Matches', value: s.total_matches.toLocaleString(), icon: Heart, color: 'var(--accent)', bg: 'var(--accent-soft)', change: '+342 this week' },
    { label: 'Messages Sent', value: (s.total_messages / 1000).toFixed(0) + 'K', icon: MessageSquare, color: 'var(--purple)', bg: 'var(--purple-soft)', change: '+8.2K today' },
    { label: 'Premium Users', value: s.premium_users.toLocaleString(), icon: Crown, color: 'var(--yellow)', bg: 'var(--yellow-soft)', change: '7.6% conversion' },
    { label: 'MRR', value: '₹' + (s.mrr / 1000).toFixed(1) + 'K', icon: IndianRupee, color: 'var(--green)', bg: 'var(--green-soft)', change: '+11% vs last month' },
    { label: 'Active Stories', value: s.stories_active.toString(), icon: Clapperboard, color: 'var(--blue)', bg: 'var(--blue-soft)', change: 'Last 24 hours' },
  ];

  const maxUsers = Math.max(...userGrowthData.map(d => d.users));
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
  const maxSignups = Math.max(...signupsData.map(d => d.signups));

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back. Here's what's happening with InBlood.</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div className="stat-card" key={s.label} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="stat-card-header">
              <span>{s.label}</span>
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={16} color={s.color} />
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-change">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Moderation queue */}
      <div className="quick-actions">
        <div className="quick-action-card" onClick={() => navigate('/reports')}>
          <div className="quick-action-icon" style={{ background: 'var(--accent-soft)' }}>
            <ShieldAlert size={17} color="var(--accent)" />
          </div>
          <div className="quick-action-text">
            <h4>Review Reports</h4>
            <p>{dashboardStats.pending_reports} pending reports</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/verifications')}>
          <div className="quick-action-icon" style={{ background: 'var(--blue-soft)' }}>
            <BadgeCheck size={17} color="var(--blue)" />
          </div>
          <div className="quick-action-text">
            <h4>Verify Users</h4>
            <p>{dashboardStats.pending_verifications} pending</p>
          </div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/stories')}>
          <div className="quick-action-icon" style={{ background: 'var(--purple-soft)' }}>
            <Clapperboard size={17} color="var(--purple)" />
          </div>
          <div className="quick-action-text">
            <h4>Moderate Stories</h4>
            <p>{dashboardStats.stories_active} active stories</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>User Growth</h3>
          <div className="chart-bars">
            {userGrowthData.map(d => (
              <div className="chart-bar-group" key={d.month}>
                <div className="chart-bar-value">{(d.users / 1000).toFixed(1)}K</div>
                <div className="chart-bar" style={{ height: `${(d.users / maxUsers) * 100}%`, background: 'var(--accent)', opacity: 0.6 + (d.users / maxUsers) * 0.4 }} />
                <div className="chart-bar-label">{d.month}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <h3>New Signups (This Week)</h3>
          <div className="chart-bars">
            {signupsData.map(d => (
              <div className="chart-bar-group" key={d.day}>
                <div className="chart-bar-value">{d.signups}</div>
                <div className="chart-bar" style={{ height: `${(d.signups / maxSignups) * 100}%`, background: 'var(--blue)', opacity: 0.6 + (d.signups / maxSignups) * 0.4 }} />
                <div className="chart-bar-label">{d.day}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h3>Monthly Revenue</h3>
          <div className="chart-bars">
            {revenueData.map(d => (
              <div className="chart-bar-group" key={d.month}>
                <div className="chart-bar-value">₹{(d.revenue / 1000).toFixed(0)}K</div>
                <div className="chart-bar" style={{ height: `${(d.revenue / maxRevenue) * 100}%`, background: 'var(--green)', opacity: 0.6 + (d.revenue / maxRevenue) * 0.4 }} />
                <div className="chart-bar-label">{d.month}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <h3>Revenue by Plan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {revenueByPlan.map(r => {
              const maxAmt = Math.max(...revenueByPlan.map(x => x.amount));
              return (
                <div key={r.plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{r.plan}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>₹{(r.amount / 1000).toFixed(0)}K ({r.count})</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(r.amount / maxAmt) * 100}%`, background: 'var(--green)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
