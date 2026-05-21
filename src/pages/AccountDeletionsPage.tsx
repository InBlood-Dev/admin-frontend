import { useState, useEffect, useCallback } from 'react';
import accountDeletionService, {
  type BulkDeletionResult,
} from '../services/accountDeletion.service';
import type {
  AdminAccountDeletion,
  PaginatedAccountDeletionsResponse,
} from '../types';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import Modal from '../components/Modal';

const PAGE_LIMIT = 20;

type StatusFilter = 'pending' | 'deleted' | 'all';

function extractErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { errors?: { message: string }[]; message?: string } };
  };
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: AdminAccountDeletion['status']) {
  if (status === 'pending_deletion')
    return <span className="badge badge-yellow">Pending</span>;
  return <span className="badge badge-red">Deleted</span>;
}

function sourceBadge(source: AdminAccountDeletion['source']) {
  if (!source) return null;
  const label = source === 'user' ? 'User' : source === 'admin' ? 'Admin' : 'Cron';
  return <span className="badge badge-muted">{label}</span>;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 16 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 160 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 60 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function AccountDeletionsPage() {
  const [requests, setRequests] = useState<AdminAccountDeletion[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // single-item confirms
  const [confirmApprove, setConfirmApprove] = useState<AdminAccountDeletion | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminAccountDeletion | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<AdminAccountDeletion | null>(null);

  // bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkDeletionResult | null>(null);
  const [bulkResultAction, setBulkResultAction] = useState<'approved' | 'rejected'>('approved');

  const fetchRequests = useCallback(async (p: number, status: StatusFilter) => {
    setLoading(true);
    try {
      const result: PaginatedAccountDeletionsResponse =
        await accountDeletionService.listRequests({
          page: p,
          limit: PAGE_LIMIT,
          status,
          sort_by: 'deletion_requested_at',
          sort_order: 'desc',
        });
      setRequests(result.requests);
      setPagination(result.pagination);
    } catch (err) {
      setError({
        title: 'Failed to load deletion requests',
        message: extractErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(page, statusFilter);
  }, [page, statusFilter, fetchRequests]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter]);

  function removeRow(userId: string) {
    setRequests((prev) => prev.filter((r) => r.user_id !== userId));
  }

  // ─── Single-item actions ────────────────────────────────────────────────
  async function handleApprove() {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      await accountDeletionService.approve(confirmApprove.user_id);
      removeRow(confirmApprove.user_id);
      setConfirmApprove(null);
    } catch (err) {
      setConfirmApprove(null);
      setError({
        title: 'Failed to finalize deletion',
        message: extractErrorMessage(err),
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await accountDeletionService.reject(rejectTarget.user_id, rejectReason || undefined);
      removeRow(rejectTarget.user_id);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setRejectTarget(null);
      setRejectReason('');
      setError({
        title: 'Failed to reject deletion',
        message: extractErrorMessage(err),
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRestore() {
    if (!confirmRestore) return;
    setActionLoading(true);
    try {
      await accountDeletionService.restore(confirmRestore.user_id);
      removeRow(confirmRestore.user_id);
      setConfirmRestore(null);
    } catch (err) {
      setConfirmRestore(null);
      setError({ title: 'Failed to restore account', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Bulk helpers ───────────────────────────────────────────────────────
  const selectablePending = requests.filter((r) => r.status === 'pending_deletion');
  const allVisibleSelected =
    selectablePending.length > 0 && selectablePending.every((r) => selectedIds.has(r.user_id));
  const someSelected = selectablePending.some((r) => selectedIds.has(r.user_id));
  const selectedPendingCount = selectablePending.filter((r) => selectedIds.has(r.user_id)).length;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectablePending.map((r) => r.user_id)));
    }
  }

  function toggleSelect(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleBulkApprove() {
    setBulkConfirmAction(null);
    setActionLoading(true);
    try {
      const result = await accountDeletionService.bulkApprove([...selectedIds]);
      setBulkResultAction('approved');
      setBulkResult(result);
      const failedIds = new Set(result.failures.map((f) => f.user_id));
      setRequests((prev) =>
        prev.filter((r) => !selectedIds.has(r.user_id) || failedIds.has(r.user_id))
      );
      setSelectedIds(new Set());
    } catch (err) {
      setError({ title: 'Bulk approve failed', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkReject() {
    setBulkConfirmAction(null);
    setActionLoading(true);
    try {
      const result = await accountDeletionService.bulkReject([...selectedIds], bulkRejectReason || undefined);
      setBulkResultAction('rejected');
      setBulkResult(result);
      const failedIds = new Set(result.failures.map((f) => f.user_id));
      setRequests((prev) =>
        prev.filter((r) => !selectedIds.has(r.user_id) || failedIds.has(r.user_id))
      );
      setSelectedIds(new Set());
      setBulkRejectReason('');
    } catch (err) {
      setError({ title: 'Bulk reject failed', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  function pageNumbers() {
    const total = pagination.totalPages;
    const current = page;
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  }

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Account Deletion Requests</h2>
          <p>
            {loading
              ? 'Loading…'
              : `${pagination.total} ${
                  statusFilter === 'pending'
                    ? 'pending'
                    : statusFilter === 'deleted'
                    ? 'deleted'
                    : ''
                } request(s)`}
          </p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Requests</h3>
          <div className="table-header-actions">
            {(['pending', 'deleted', 'all'] as const).map((s) => {
              const label = s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1);
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  className={`btn btn-sm${isActive ? ' btn-primary' : ' btn-ghost'}`}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  style={{ minWidth: 76 }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {statusFilter === 'pending' && (
          <div className="bulk-action-bar">
            <button
              className="btn btn-ghost btn-sm"
              onClick={toggleSelectAll}
              disabled={actionLoading || selectablePending.length === 0}
            >
              {allVisibleSelected
                ? 'Deselect page'
                : `Select visible (${selectablePending.length})`}
            </button>
            {selectedIds.size > 0 && (
              <>
                <span className="bulk-action-count" style={{ marginLeft: 4 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setBulkConfirmAction('approve')}
                  disabled={actionLoading}
                >
                  Accept ({selectedPendingCount})
                </button>
                <button
                  className="btn btn-green btn-sm"
                  onClick={() => setBulkConfirmAction('reject')}
                  disabled={actionLoading}
                >
                  Reject &amp; Restore ({selectedPendingCount})
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={actionLoading}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {statusFilter === 'pending' && (
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="bulk-checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allVisibleSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={selectablePending.length === 0}
                    />
                  </th>
                )}
                <th>User</th>
                <th>Email</th>
                <th>Requested</th>
                <th>Scheduled / Finalized</th>
                <th>Days left</th>
                <th>Source</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={statusFilter === 'pending' ? 9 : 8}>
                    <div className="empty-state">
                      <p>No deletion requests found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const isPending = r.status === 'pending_deletion';
                  return (
                    <tr key={r.id} className={selectedIds.has(r.user_id) ? 'row-selected' : ''}>
                      {statusFilter === 'pending' && (
                        <td style={{ textAlign: 'center' }}>
                          {isPending ? (
                            <input
                              type="checkbox"
                              className="bulk-checkbox"
                              checked={selectedIds.has(r.user_id)}
                              onChange={() => toggleSelect(r.user_id)}
                            />
                          ) : null}
                        </td>
                      )}
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{r.name?.charAt(0) ?? '?'}</div>
                          <span className="user-cell-name">{r.name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.email ?? '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.requested_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isPending ? formatDate(r.scheduled_for) : formatDate(r.finalized_at)}
                      </td>
                      <td>{isPending ? (r.days_remaining ?? '—') : '—'}</td>
                      <td>{sourceBadge(r.source)}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>
                        <div className="action-group">
                          {isPending ? (
                            <>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => setConfirmApprove(r)}
                                disabled={actionLoading}
                              >
                                Accept
                              </button>
                              <button
                                className="btn btn-green btn-sm"
                                onClick={() => {
                                  setRejectTarget(r);
                                  setRejectReason('');
                                }}
                                disabled={actionLoading}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-green btn-sm"
                              onClick={() => setConfirmRestore(r)}
                              disabled={actionLoading}
                            >
                              Restore account
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {(page - 1) * PAGE_LIMIT + 1}–
              {Math.min(page * PAGE_LIMIT, pagination.total)} of {pagination.total}
            </span>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                &lsaquo;
              </button>
              {pageNumbers().map((n, i) =>
                n === '...' ? (
                  <span key={`e${i}`} className="pagination-btn" style={{ pointerEvents: 'none' }}>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    className={`pagination-btn${page === n ? ' active' : ''}`}
                    onClick={() => setPage(n as number)}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages}
              >
                &rsaquo;
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmApprove}
        title="Finalize account deletion"
        message={`Immediately finalize deletion for ${confirmApprove?.name ?? 'this user'}? The account will be anonymized and cannot be recovered by the user.`}
        confirmLabel="Accept & delete"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />

      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        title="Reject deletion & restore account"
        width={420}
      >
        <div className="notif-form">
          <div className="form-group">
            <label>Reason (optional, shared with user)</label>
            <textarea
              className="form-input reject-reason-textarea"
              placeholder="e.g. Looks like this was accidental — reach out to support if you want to delete."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button className="btn btn-green" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <span className="btn-spinner" /> : null}
              Restore account
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmRestore}
        title="Restore deleted account"
        message={`Restore ${confirmRestore?.name ?? 'this account'}? Profile fields (bio, interests, location) are not archived and will be empty until the user refills them. If the user has re-registered with the same Google/Apple credentials, restore will fail.`}
        confirmLabel="Restore"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmModal
        isOpen={bulkConfirmAction === 'approve'}
        title="Bulk finalize deletions"
        message={`Immediately finalize deletion for ${selectedIds.size} account(s)? This cannot be undone by users.`}
        confirmLabel="Accept all"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleBulkApprove}
        onCancel={() => setBulkConfirmAction(null)}
      />

      <Modal
        open={bulkConfirmAction === 'reject'}
        onClose={() => {
          setBulkConfirmAction(null);
          setBulkRejectReason('');
        }}
        title={`Reject & restore ${selectedIds.size} account(s)`}
        width={420}
      >
        <div className="notif-form">
          <div className="form-group">
            <label>Reason (optional, shared with users)</label>
            <textarea
              className="form-input reject-reason-textarea"
              placeholder="Reason that applies to all selected users"
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setBulkConfirmAction(null);
                setBulkRejectReason('');
              }}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button className="btn btn-green" onClick={handleBulkReject} disabled={actionLoading}>
              {actionLoading ? <span className="btn-spinner" /> : null}
              Restore all
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!bulkResult}
        onClose={() => setBulkResult(null)}
        title="Bulk action result"
        width={480}
      >
        {bulkResult && (
          <div className="bulk-result-modal">
            <div
              className={`bulk-result-summary ${
                bulkResult.failed === 0
                  ? 'bulk-result-success'
                  : bulkResult.succeeded === 0
                  ? 'bulk-result-error'
                  : 'bulk-result-partial'
              }`}
            >
              {bulkResult.failed === 0
                ? `All ${bulkResult.total} request(s) ${bulkResultAction} successfully`
                : bulkResult.succeeded === 0
                ? `All ${bulkResult.total} request(s) failed`
                : `${bulkResult.succeeded} of ${bulkResult.total} ${bulkResultAction} successfully`}
            </div>
            {bulkResult.failures.length > 0 && (
              <div className="bulk-result-failures">
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Failed ({bulkResult.failed}):
                </p>
                <ul className="bulk-result-failure-list">
                  {bulkResult.failures.map((f) => (
                    <li key={f.user_id}>
                      <span className="bulk-result-userid">{f.user_id}</span>
                      <span className="bulk-result-error-msg">{f.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setBulkResult(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

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
