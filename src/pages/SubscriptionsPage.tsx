import { useState, useMemo } from 'react';
import { Crown, XCircle, Gift } from 'lucide-react';
import { subscriptions as initialSubs, transactions as initialTxns, users, revenueByPlan } from '../data/mock';
import type { Subscription, Transaction } from '../types';
import Modal from '../components/Modal';

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>(initialSubs);
  const [txns] = useState<Transaction[]>(initialTxns);
  const [tab, setTab] = useState<'subscriptions' | 'transactions' | 'failed'>('subscriptions');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [txnStatusFilter, setTxnStatusFilter] = useState('all');

  // Grant premium modal
  const [grantModal, setGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantTier, setGrantTier] = useState<'premium' | 'premium_plus'>('premium');
  const [grantPlan, setGrantPlan] = useState<'monthly' | 'annual'>('monthly');

  const filteredSubs = useMemo(() => {
    return subs.filter(s => {
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesPlan = planFilter === 'all' || s.plan === planFilter;
      return matchesStatus && matchesPlan;
    });
  }, [subs, statusFilter, planFilter]);

  const filteredTxns = useMemo(() => {
    if (tab === 'failed') return txns.filter(t => t.payment_status === 'failed' || t.payment_status === 'dropped');
    if (txnStatusFilter === 'all') return txns;
    return txns.filter(t => t.payment_status === txnStatusFilter);
  }, [txns, txnStatusFilter, tab]);

  const cancelSub = (id: string) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
  };

  const revokePremium = (id: string) => {
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  const grantPremium = () => {
    if (!grantUserId) return;
    const user = users.find(u => u.id === grantUserId);
    if (!user) return;
    const amounts: Record<string, number> = { 'premium-monthly': 0, 'premium-annual': 0, 'premium_plus-monthly': 0, 'premium_plus-annual': 0 };
    const now = new Date();
    const expires = new Date(now);
    if (grantPlan === 'monthly') expires.setMonth(expires.getMonth() + 1);
    else expires.setFullYear(expires.getFullYear() + 1);

    const newSub: Subscription = {
      id: `s${subs.length + 1}`,
      user_id: grantUserId,
      user_name: user.name,
      plan: grantPlan,
      tier: grantTier,
      status: 'active',
      amount: amounts[`${grantTier}-${grantPlan}`],
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
    };
    setSubs(prev => [...prev, newSub]);
    setGrantModal(false);
    setGrantUserId('');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const subStatusBadge = (status: string) => {
    if (status === 'active') return <span className="badge badge-green">Active</span>;
    if (status === 'cancelled') return <span className="badge badge-yellow">Cancelled</span>;
    return <span className="badge badge-muted">Expired</span>;
  };

  const txnStatusBadge = (status: string) => {
    if (status === 'success') return <span className="badge badge-green">Success</span>;
    if (status === 'failed') return <span className="badge badge-red">Failed</span>;
    if (status === 'dropped') return <span className="badge badge-yellow">Dropped</span>;
    return <span className="badge badge-muted">Created</span>;
  };

  const tierBadge = (tier: string) => {
    if (tier === 'premium_plus') return <span className="badge badge-purple">Plus</span>;
    return <span className="badge badge-yellow">Premium</span>;
  };

  const activeCount = subs.filter(s => s.status === 'active').length;
  const totalRevenue = subs.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0);
  const failedCount = txns.filter(t => t.payment_status === 'failed' || t.payment_status === 'dropped').length;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Premium & Payments</h2>
          <p>{activeCount} active subscriptions &middot; {failedCount} failed payments</p>
        </div>
        <button className="btn btn-primary" onClick={() => setGrantModal(true)}>
          <Gift size={14} /> Grant Premium
        </button>
      </div>

      {/* Revenue breakdown */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 22 }}>
        {revenueByPlan.map(r => (
          <div className="stat-card" key={r.plan}>
            <div className="stat-card-header"><span>{r.plan}</span></div>
            <div className="stat-value">₹{(r.amount / 1000).toFixed(0)}K</div>
            <div className="stat-change">{r.count} subscribers</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'subscriptions' ? 'active' : ''}`} onClick={() => setTab('subscriptions')}>
          Subscriptions ({subs.length})
        </button>
        <button className={`tab-btn ${tab === 'transactions' ? 'active' : ''}`} onClick={() => setTab('transactions')}>
          All Transactions ({txns.length})
        </button>
        <button className={`tab-btn ${tab === 'failed' ? 'active' : ''}`} onClick={() => setTab('failed')}>
          Failed / Dropped ({failedCount})
        </button>
      </div>

      {tab === 'subscriptions' && (
        <div className="table-card">
          <div className="table-header">
            <h3>Subscriptions</h3>
            <div className="table-header-actions">
              <select className="filter-select" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
                <option value="all">All Plans</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>User</th><th>Plan</th><th>Tier</th><th>Amount</th><th>Started</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredSubs.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{s.user_name.charAt(0)}</div>
                        <div className="user-cell-info">
                          <span className="user-cell-name">{s.user_name}</span>
                          <span className="user-cell-sub">{s.user_id}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{s.plan}</td>
                    <td>{tierBadge(s.tier)}</td>
                    <td style={{ fontWeight: 600 }}>{s.amount > 0 ? `₹${s.amount.toLocaleString()}` : 'Granted'}</td>
                    <td>{formatDate(s.started_at)}</td>
                    <td>{formatDate(s.expires_at)}</td>
                    <td>{subStatusBadge(s.status)}</td>
                    <td>
                      <div className="action-group">
                        {s.status === 'active' && (
                          <>
                            <button className="btn btn-sm btn-ghost" onClick={() => cancelSub(s.id)}>
                              <XCircle size={12} /> Cancel
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => revokePremium(s.id)}>Revoke</button>
                          </>
                        )}
                        {s.status !== 'active' && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.status}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSubs.length === 0 && (
                  <tr><td colSpan={8}><div className="empty-state"><p>No subscriptions found.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'transactions' || tab === 'failed') && (
        <div className="table-card">
          <div className="table-header">
            <h3>{tab === 'failed' ? 'Failed & Dropped Payments' : 'All Transactions'}</h3>
            {tab === 'transactions' && (
              <div className="table-header-actions">
                <select className="filter-select" value={txnStatusFilter} onChange={e => setTxnStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="dropped">Dropped</option>
                  <option value="created">Created</option>
                </select>
              </div>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order ID</th><th>CF Order ID</th><th>User</th><th>Plan</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredTxns.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{t.order_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{t.cf_order_id}</td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{t.user_name.charAt(0)}</div>
                        <span className="user-cell-name">{t.user_name}</span>
                      </div>
                    </td>
                    <td>{t.plan}</td>
                    <td style={{ fontWeight: 600 }}>₹{t.amount}</td>
                    <td>{t.payment_method}</td>
                    <td>{formatDate(t.created_at)}</td>
                    <td>{txnStatusBadge(t.payment_status)}</td>
                  </tr>
                ))}
                {filteredTxns.length === 0 && (
                  <tr><td colSpan={8}><div className="empty-state"><p>No transactions found.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grant Premium Modal */}
      <Modal open={grantModal} onClose={() => setGrantModal(false)} title="Grant Premium Access" width={420}>
        <div className="notif-form">
          <div className="form-group">
            <label>User</label>
            <select className="filter-select" style={{ width: '100%' }} value={grantUserId} onChange={e => setGrantUserId(e.target.value)}>
              <option value="">Select user...</option>
              {users.filter(u => !subs.some(s => s.user_id === u.id && s.status === 'active')).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Tier</label>
            <select className="filter-select" style={{ width: '100%' }} value={grantTier} onChange={e => setGrantTier(e.target.value as 'premium' | 'premium_plus')}>
              <option value="premium">Premium</option>
              <option value="premium_plus">Premium Plus</option>
            </select>
          </div>
          <div className="form-group">
            <label>Duration</label>
            <select className="filter-select" style={{ width: '100%' }} value={grantPlan} onChange={e => setGrantPlan(e.target.value as 'monthly' | 'annual')}>
              <option value="monthly">1 Month</option>
              <option value="annual">1 Year</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={grantPremium} disabled={!grantUserId}>
            <Crown size={14} /> Grant Access
          </button>
        </div>
      </Modal>
    </div>
  );
}
