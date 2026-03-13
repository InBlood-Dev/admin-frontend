import { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, XCircle, Gift, Search } from 'lucide-react';
import subscriptionService from '../services/subscription.service';
import userService from '../services/user.service';
import type {
  AdminSubscriptionItem,
  AdminTransaction,
  AdminUserListItem,
  PaginatedSubscriptionsResponse,
  PaginatedTransactionsResponse,
  RevenueByPlan,
} from '../types';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import Modal from '../components/Modal';

const PAGE_LIMIT = 20;

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    'Something went wrong. Please try again.'
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function subStatusBadge(status: AdminSubscriptionItem['status']) {
  if (status === 'active') return <span className="badge badge-green">Active</span>;
  if (status === 'cancelled') return <span className="badge badge-yellow">Cancelled</span>;
  if (status === 'pending') return <span className="badge badge-muted">Pending</span>;
  return <span className="badge badge-muted">Expired</span>;
}

function txnStatusBadge(status: AdminTransaction['status']) {
  if (status === 'success') return <span className="badge badge-green">Success</span>;
  if (status === 'failed') return <span className="badge badge-red">Failed</span>;
  if (status === 'dropped') return <span className="badge badge-yellow">Dropped</span>;
  return <span className="badge badge-muted">Created</span>;
}

function planLabel(plan: string | null) {
  if (!plan) return '—';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function SkeletonSubRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 150 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 70 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 110 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 110 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 70 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 100 }} /></td>
        </tr>
      ))}
    </>
  );
}

function SkeletonTxnRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 100 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 70 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 100 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 70 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function SubscriptionsPage() {
  const [tab, setTab] = useState<'subscriptions' | 'transactions' | 'failed'>('subscriptions');

  // ── Subscriptions state ──────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [subsPagination, setSubsPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [subsPage, setSubsPage] = useState(1);
  const [subsStatusFilter, setSubsStatusFilter] = useState('');
  const [subsPlanFilter, setSubsPlanFilter] = useState('');
  const [subsLoading, setSubsLoading] = useState(false);

  // ── Transactions state ───────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [txnsPagination, setTxnsPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [txnsPage, setTxnsPage] = useState(1);
  const [txnsStatusFilter, setTxnsStatusFilter] = useState('');
  const [txnsLoading, setTxnsLoading] = useState(false);

  // ── Revenue state ────────────────────────────────────────────────────────
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);

  // ── Action / modal state ─────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<AdminSubscriptionItem | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<AdminSubscriptionItem | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // ── Grant modal state ────────────────────────────────────────────────────
  const [grantModal, setGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlan, setGrantPlan] = useState<'monthly' | 'annual'>('monthly');
  const [grantLoading, setGrantLoading] = useState(false);

  // ── User search for grant modal ────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUserListItem[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch subscriptions ──────────────────────────────────────────────────
  const fetchSubscriptions = useCallback(async (p: number, status: string, planType: string) => {
    setSubsLoading(true);
    try {
      const params: Parameters<typeof subscriptionService.listSubscriptions>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (status) params.status = status as AdminSubscriptionItem['status'];
      if (planType) params.plan_type = planType as 'monthly' | 'annual';

      const result: PaginatedSubscriptionsResponse = await subscriptionService.listSubscriptions(params);
      setSubscriptions(result.subscriptions);
      setSubsPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load subscriptions', message: extractErrorMessage(err) });
    } finally {
      setSubsLoading(false);
    }
  }, []);

  // ── Fetch transactions ───────────────────────────────────────────────────
  const fetchTransactions = useCallback(async (p: number, status: string) => {
    setTxnsLoading(true);
    try {
      const params: Parameters<typeof subscriptionService.listTransactions>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (status) params.status = status as 'created' | 'success' | 'failed' | 'dropped' | 'failed_dropped';

      const result: PaginatedTransactionsResponse = await subscriptionService.listTransactions(params);
      setTransactions(result.transactions);
      setTxnsPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load transactions', message: extractErrorMessage(err) });
    } finally {
      setTxnsLoading(false);
    }
  }, []);

  // ── Fetch revenue by plan ────────────────────────────────────────────────
  const fetchRevenue = useCallback(async () => {
    try {
      const result = await subscriptionService.getRevenueByPlan();
      setRevenueByPlan(result);
    } catch {
      // Revenue cards failing is non-critical; silently ignore
    }
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSubscriptions(subsPage, subsStatusFilter, subsPlanFilter);
  }, [subsPage, subsStatusFilter, subsPlanFilter, fetchSubscriptions]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  // Fetch transactions when tab, page, or filter changes
  useEffect(() => {
    if (tab === 'transactions') {
      fetchTransactions(txnsPage, txnsStatusFilter);
    } else if (tab === 'failed') {
      fetchTransactions(1, 'failed_dropped');
    }
  }, [tab, txnsPage, txnsStatusFilter, fetchTransactions]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!confirmCancel) return;
    setActionLoading(true);
    try {
      const updated = await subscriptionService.cancelSubscription(confirmCancel.id);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setConfirmCancel(null);
    } catch (err) {
      setConfirmCancel(null);
      setError({ title: 'Failed to cancel subscription', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setActionLoading(true);
    try {
      const updated = await subscriptionService.revokeSubscription(confirmRevoke.id);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setConfirmRevoke(null);
    } catch (err) {
      setConfirmRevoke(null);
      setError({ title: 'Failed to revoke subscription', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGrant() {
    if (!grantUserId.trim()) return;
    setGrantLoading(true);
    try {
      await userService.grantSubscription(grantUserId.trim(), grantPlan);
      setGrantModal(false);
      setGrantUserId('');
      setGrantPlan('monthly');
      setUserSearch('');
      setUserResults([]);
      setSelectedUser(null);
      setSubsPage(1);
      fetchSubscriptions(1, subsStatusFilter, subsPlanFilter);
    } catch (err) {
      setGrantModal(false);
      setError({ title: 'Failed to grant premium', message: extractErrorMessage(err) });
    } finally {
      setGrantLoading(false);
    }
  }

  function closeGrantModal() {
    setGrantModal(false);
    setGrantUserId('');
    setGrantPlan('monthly');
    setUserSearch('');
    setUserResults([]);
    setSelectedUser(null);
    setShowUserDropdown(false);
  }

  function handleUserSearch(value: string) {
    setUserSearch(value);
    setSelectedUser(null);
    setGrantUserId('');
    if (userSearchDebounce.current) clearTimeout(userSearchDebounce.current);
    if (!value.trim()) {
      setUserResults([]);
      setShowUserDropdown(false);
      return;
    }
    userSearchDebounce.current = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const result = await userService.listUsers({ search: value.trim(), limit: 8 });
        setUserResults(result.users);
        setShowUserDropdown(true);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
  }

  function selectUser(user: AdminUserListItem) {
    setSelectedUser(user);
    setGrantUserId(user.id);
    setUserSearch(user.name);
    setShowUserDropdown(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Pagination helper ─────────────────────────────────────────────────────
  function pageNumbers(totalPages: number, current: number) {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i);
      if (current < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalRevenue = revenueByPlan.reduce((sum, r) => sum + r.total_amount, 0);

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Premium & Payments</h2>
          <p>
            {subsLoading
              ? 'Loading…'
              : `${subsPagination.total} subscriptions · ₹${totalRevenue.toLocaleString('en-IN')} revenue`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setGrantModal(true)}>
          <Gift size={14} /> Grant Premium
        </button>
      </div>

      {/* Revenue breakdown */}
      {revenueByPlan.length > 0 && (
        <div
          className="stats-grid"
          style={{ gridTemplateColumns: `repeat(${Math.min(revenueByPlan.length, 4)}, 1fr)`, marginBottom: 22 }}
        >
          {revenueByPlan.map((r) => (
            <div className="stat-card" key={r.plan_type}>
              <div className="stat-card-header"><span>{planLabel(r.plan_type)}</span></div>
              <div className="stat-value">₹{(r.total_amount / 1000).toFixed(1)}K</div>
              <div className="stat-change">{r.count} payments</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'subscriptions' ? ' active' : ''}`}
          onClick={() => setTab('subscriptions')}
        >
          Subscriptions ({subsPagination.total})
        </button>
        <button
          className={`tab-btn${tab === 'transactions' ? ' active' : ''}`}
          onClick={() => setTab('transactions')}
        >
          All Transactions
        </button>
        <button
          className={`tab-btn${tab === 'failed' ? ' active' : ''}`}
          onClick={() => setTab('failed')}
        >
          Failed / Dropped
        </button>
      </div>

      {/* ── Subscriptions Tab ───────────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="table-card">
          <div className="table-header">
            <h3>Subscriptions</h3>
            <div className="table-header-actions">
              <select
                className="filter-select"
                value={subsPlanFilter}
                onChange={(e) => { setSubsPlanFilter(e.target.value); setSubsPage(1); }}
              >
                <option value="">All Plans</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
              <select
                className="filter-select"
                value={subsStatusFilter}
                onChange={(e) => { setSubsStatusFilter(e.target.value); setSubsPage(1); }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Started</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subsLoading ? (
                  <SkeletonSubRows />
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state"><p>No subscriptions found.</p></div>
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{(s.user?.name ?? '?').charAt(0)}</div>
                          <div className="user-cell-info">
                            <span className="user-cell-name">{s.user?.name ?? 'Deleted User'}</span>
                            {s.user?.id && (
                              <span
                                className="user-cell-sub"
                                style={{ fontFamily: 'monospace', fontSize: 10 }}
                              >
                                {s.user.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{planLabel(s.plan_type)}</td>
                      <td style={{ fontWeight: 600 }}>
                        {s.amount > 0 ? `₹${s.amount.toLocaleString('en-IN')}` : 'Granted'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.started_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.expires_at)}</td>
                      <td>{subStatusBadge(s.status)}</td>
                      <td>
                        <div className="action-group">
                          {s.status === 'active' && (
                            <>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setConfirmCancel(s)}
                                disabled={actionLoading}
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setConfirmRevoke(s)}
                                disabled={actionLoading}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          {s.status === 'cancelled' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setConfirmRevoke(s)}
                              disabled={actionLoading}
                              title="Force-expire cancelled subscription"
                            >
                              Revoke
                            </button>
                          )}
                          {(s.status === 'expired' || s.status === 'pending') && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.status}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!subsLoading && subsPagination.totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(subsPage - 1) * PAGE_LIMIT + 1}–{Math.min(subsPage * PAGE_LIMIT, subsPagination.total)} of {subsPagination.total}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setSubsPage((p) => p - 1)}
                  disabled={subsPage === 1}
                >&lsaquo;</button>
                {pageNumbers(subsPagination.totalPages, subsPage).map((n, i) =>
                  n === '...' ? (
                    <span key={`e${i}`} className="pagination-btn" style={{ pointerEvents: 'none' }}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={`pagination-btn${subsPage === n ? ' active' : ''}`}
                      onClick={() => setSubsPage(n as number)}
                    >{n}</button>
                  ),
                )}
                <button
                  className="pagination-btn"
                  onClick={() => setSubsPage((p) => p + 1)}
                  disabled={subsPage === subsPagination.totalPages}
                >&rsaquo;</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transactions / Failed Tab ────────────────────────────────────────── */}
      {(tab === 'transactions' || tab === 'failed') && (
        <div className="table-card">
          <div className="table-header">
            <h3>{tab === 'failed' ? 'Failed & Dropped Payments' : 'All Transactions'}</h3>
            {tab === 'transactions' && (
              <div className="table-header-actions">
                <select
                  className="filter-select"
                  value={txnsStatusFilter}
                  onChange={(e) => { setTxnsStatusFilter(e.target.value); setTxnsPage(1); }}
                >
                  <option value="">All Status</option>
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
                <tr>
                  <th>Order ID</th>
                  <th>CF Order ID</th>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {txnsLoading ? (
                  <SkeletonTxnRows />
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state"><p>No transactions found.</p></div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {t.order_id}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                        {t.cf_order_id ?? '—'}
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{(t.user?.name ?? '?').charAt(0)}</div>
                          <span className="user-cell-name">{t.user?.name ?? 'Deleted User'}</span>
                        </div>
                      </td>
                      <td>{planLabel(t.plan_type)}</td>
                      <td style={{ fontWeight: 600 }}>₹{t.amount.toLocaleString('en-IN')}</td>
                      <td>{t.payment_method ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.created_at)}</td>
                      <td>{txnStatusBadge(t.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!txnsLoading && txnsPagination.totalPages > 1 && tab === 'transactions' && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {(txnsPage - 1) * PAGE_LIMIT + 1}–{Math.min(txnsPage * PAGE_LIMIT, txnsPagination.total)} of {txnsPagination.total}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setTxnsPage((p) => p - 1)}
                  disabled={txnsPage === 1}
                >&lsaquo;</button>
                {pageNumbers(txnsPagination.totalPages, txnsPage).map((n, i) =>
                  n === '...' ? (
                    <span key={`e${i}`} className="pagination-btn" style={{ pointerEvents: 'none' }}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={`pagination-btn${txnsPage === n ? ' active' : ''}`}
                      onClick={() => setTxnsPage(n as number)}
                    >{n}</button>
                  ),
                )}
                <button
                  className="pagination-btn"
                  onClick={() => setTxnsPage((p) => p + 1)}
                  disabled={txnsPage === txnsPagination.totalPages}
                >&rsaquo;</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cancel Confirm Modal ─────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!confirmCancel}
        title="Cancel Subscription"
        message={`Cancel ${confirmCancel?.user?.name ?? 'this user'}'s subscription? They will keep premium access until ${formatDate(confirmCancel?.expires_at ?? null)}.`}
        confirmLabel="Cancel Subscription"
        confirmVariant="primary"
        isLoading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(null)}
      />

      {/* ── Revoke Confirm Modal ─────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!confirmRevoke}
        title="Revoke Premium"
        message={`Revoke premium access for ${confirmRevoke?.user?.name ?? 'this user'} immediately? Their subscription will be disabled right now.`}
        confirmLabel="Revoke"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(null)}
      />

      {/* ── Grant Premium Modal ──────────────────────────────────────────────── */}
      <Modal
        open={grantModal}
        onClose={closeGrantModal}
        title="Grant Premium Access"
        width={420}
      >
        <div className="notif-form">
          <div className="form-group">
            <label>User</label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  onFocus={() => { if (userResults.length > 0 && !selectedUser) setShowUserDropdown(true); }}
                  style={{ paddingLeft: 32 }}
                />
                {userSearchLoading && (
                  <span className="btn-spinner" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
                )}
              </div>
              {showUserDropdown && userResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border, #333)',
                  borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,.4)',
                }}>
                  {userResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => selectUser(u)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        borderBottom: '1px solid var(--border, #292939)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover, #2a2a3e)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {u.primary_photo_url ? (
                        <img src={u.primary_photo_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#aaa' }}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                      </div>
                      {u.is_premium && <span style={{ fontSize: 10, background: '#f59e0b33', color: '#f59e0b', padding: '2px 6px', borderRadius: 4 }}>Premium</span>}
                    </div>
                  ))}
                </div>
              )}
              {showUserDropdown && userResults.length === 0 && userSearch.trim() && !userSearchLoading && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border, #333)',
                  borderRadius: 8, marginTop: 4, padding: '12px', textAlign: 'center',
                  color: '#888', fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,.4)',
                }}>
                  No users found
                </div>
              )}
            </div>
            {selectedUser && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
                ID: {selectedUser.id}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Duration</label>
            <select
              className="filter-select"
              style={{ width: '100%' }}
              value={grantPlan}
              onChange={(e) => setGrantPlan(e.target.value as 'monthly' | 'annual')}
            >
              <option value="monthly">1 Month</option>
              <option value="annual">1 Year</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              onClick={closeGrantModal}
              disabled={grantLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGrant}
              disabled={!grantUserId.trim() || grantLoading}
            >
              {grantLoading ? <span className="btn-spinner" /> : <Crown size={14} />}
              Grant Access
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Error Modal ──────────────────────────────────────────────────────── */}
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
