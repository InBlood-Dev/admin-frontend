import { useState, useEffect, useCallback } from 'react';
import verificationService from '../services/verification.service';
import userService from '../services/user.service';
import type { BulkActionResult } from '../services/user.service';
import type { AdminVerification, PaginatedVerificationsResponse } from '../types';
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: AdminVerification['status']) {
  if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
  if (status === 'approved') return <span className="badge badge-green">Approved</span>;
  return <span className="badge badge-red">Rejected</span>;
}

function PhotoThumb({
  url,
  label,
  onClick,
}: {
  url: string | null;
  label: string;
  onClick?: () => void;
}) {
  if (!url) {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: 'var(--bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={label}
      onClick={onClick}
      style={{
        width: 48,
        height: 48,
        borderRadius: 6,
        objectFit: 'cover',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--border)',
      }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 16 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 160 }} /></td>
          <td><div className="skeleton" style={{ width: 48, height: 48, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ width: 48, height: 48, borderRadius: 6 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 110 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<AdminVerification | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null);
  const [bulkResultAction, setBulkResultAction] = useState<'approved' | 'rejected'>('approved');

  const fetchVerifications = useCallback(async (p: number, status: string) => {
    setLoading(true);
    try {
      const params: Parameters<typeof verificationService.listVerifications>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (status) params.status = status as AdminVerification['status'];

      const result: PaginatedVerificationsResponse = await verificationService.listVerifications(params);
      setVerifications(result.verifications);
      setPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load verification requests', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerifications(page, statusFilter);
  }, [page, statusFilter, fetchVerifications]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  function updateVerification(userId: string, patch: Partial<AdminVerification>) {
    setVerifications((prev) =>
      prev.map((v) => (v.user_id === userId ? { ...v, ...patch } : v)),
    );
  }

  async function handleApprove() {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      await userService.forceVerifyUser(confirmApprove.user_id);
      updateVerification(confirmApprove.user_id, { status: 'approved', reviewed_at: new Date().toISOString() });
      setConfirmApprove(null);
    } catch (err) {
      setConfirmApprove(null);
      setError({ title: 'Failed to approve verification', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      await userService.rejectVerification(rejectTarget.user_id, rejectReason || 'No reason provided');
      updateVerification(rejectTarget.user_id, {
        status: 'rejected',
        rejection_reason: rejectReason || 'No reason provided',
        reviewed_at: new Date().toISOString(),
      });
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setRejectTarget(null);
      setRejectReason('');
      setError({ title: 'Failed to reject verification', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Selection helpers ───────────────────────────────────────────────
  const [allRecordsSelected, setAllRecordsSelected] = useState(false);
  const pendingVerifications = verifications.filter((v) => v.status === 'pending');
  const allPendingSelected = pendingVerifications.length > 0 && pendingVerifications.every((v) => selectedIds.has(v.user_id));
  const somePendingSelected = pendingVerifications.some((v) => selectedIds.has(v.user_id));
  const showSelectAllBanner = allPendingSelected && !allRecordsSelected && pagination.total > pendingVerifications.length;

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
      setAllRecordsSelected(false);
    } else {
      setSelectedIds(new Set(pendingVerifications.map((v) => v.user_id)));
    }
  }

  function toggleSelect(userId: string) {
    setAllRecordsSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSelectAllRecords() {
    try {
      const res = await verificationService.listVerifications({
        page: 1,
        limit: pagination.total,
        status: 'pending' as AdminVerification['status'],
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setSelectedIds(new Set(res.verifications.filter((v) => v.status === 'pending').map((v) => v.user_id)));
      setAllRecordsSelected(true);
    } catch (err) {
      setError({ title: 'Failed to select all', message: extractErrorMessage(err) });
    }
  }

  // Clear selection on page/filter change
  useEffect(() => {
    setSelectedIds(new Set());
    setAllRecordsSelected(false);
  }, [page, statusFilter]);

  // ─── Bulk action handlers ──────────────────────────────────────────
  async function handleBulkApprove() {
    setBulkConfirmAction(null);
    setActionLoading(true);
    try {
      const result = await userService.bulkVerifyUsers([...selectedIds]);
      setBulkResultAction('approved');
      setBulkResult(result);

      // Update local state for succeeded items
      const failedIds = new Set(result.failures.map((f) => f.user_id));
      setVerifications((prev) =>
        prev.map((v) =>
          selectedIds.has(v.user_id) && !failedIds.has(v.user_id)
            ? { ...v, status: 'approved' as const, reviewed_at: new Date().toISOString() }
            : v
        ),
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
      const reason = bulkRejectReason || 'No reason provided';
      const result = await userService.bulkRejectVerifications([...selectedIds], reason);
      setBulkResultAction('rejected');
      setBulkResult(result);

      const failedIds = new Set(result.failures.map((f) => f.user_id));
      setVerifications((prev) =>
        prev.map((v) =>
          selectedIds.has(v.user_id) && !failedIds.has(v.user_id)
            ? { ...v, status: 'rejected' as const, rejection_reason: reason, reviewed_at: new Date().toISOString() }
            : v
        ),
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

  const pendingCount = verifications.filter((v) => v.status === 'pending').length;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Verification Queue</h2>
          <p>
            {loading
              ? 'Loading…'
              : statusFilter === '' || statusFilter === 'pending'
              ? `${pagination.total} ${statusFilter === 'pending' ? 'pending' : 'total'} verification requests`
              : `${pagination.total} ${statusFilter} verification requests`}
          </p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>
            Verification Requests
            {!loading && !statusFilter && pendingCount > 0 && (
              <span className="badge badge-yellow" style={{ marginLeft: 8 }}>{pendingCount} pending</span>
            )}
          </h3>
          <div className="table-header-actions">
            <select className="filter-select" value={statusFilter} onChange={handleFilterChange}>
              <option value="">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-action-count">
              {allRecordsSelected ? `All ${selectedIds.size}` : selectedIds.size} selected
            </span>
            <button
              className="btn btn-green btn-sm"
              onClick={() => setBulkConfirmAction('approve')}
              disabled={actionLoading}
            >
              Approve Selected
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setBulkConfirmAction('reject')}
              disabled={actionLoading}
            >
              Reject Selected
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSelectedIds(new Set()); setAllRecordsSelected(false); }}
              disabled={actionLoading}
            >
              Clear
            </button>
          </div>
        )}

        {showSelectAllBanner && (
          <div className="select-all-banner">
            All {pendingVerifications.length} pending items on this page are selected.{' '}
            <button onClick={handleSelectAllRecords}>Select all {pagination.total} pending records</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="bulk-checkbox"
                    checked={allPendingSelected}
                    ref={(el) => { if (el) el.indeterminate = somePendingSelected && !allPendingSelected; }}
                    onChange={toggleSelectAll}
                    disabled={pendingVerifications.length === 0}
                  />
                </th>
                <th>User</th>
                <th>Email</th>
                <th>Selfie</th>
                <th>Profile Photo</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state"><p>No verification requests found.</p></div>
                  </td>
                </tr>
              ) : (
                verifications.map((v) => (
                  <tr key={v.id} className={selectedIds.has(v.user_id) ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      {v.status === 'pending' ? (
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={selectedIds.has(v.user_id)}
                          onChange={() => toggleSelect(v.user_id)}
                        />
                      ) : null}
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{v.user_name?.charAt(0) ?? '?'}</div>
                        <span className="user-cell-name">{v.user_name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {v.user_email ?? '—'}
                    </td>
                    <td>
                      <PhotoThumb
                        url={v.selfie_url}
                        label="Selfie"
                        onClick={v.selfie_url ? () => setLightboxUrl(v.selfie_url) : undefined}
                      />
                    </td>
                    <td>
                      <PhotoThumb
                        url={v.primary_photo_url}
                        label="Photo"
                        onClick={v.primary_photo_url ? () => setLightboxUrl(v.primary_photo_url) : undefined}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(v.created_at)}</td>
                    <td>
                      {statusBadge(v.status)}
                      {v.rejection_reason && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, maxWidth: 140 }}>
                          {v.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="action-group">
                        {v.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-green btn-sm"
                              onClick={() => setConfirmApprove(v)}
                              disabled={actionLoading}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setRejectTarget(v); setRejectReason(''); }}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {v.status !== 'pending' && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {v.status === 'approved' ? 'Verified' : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, pagination.total)} of {pagination.total}
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
                  <span key={`e${i}`} className="pagination-btn" style={{ pointerEvents: 'none' }}>…</span>
                ) : (
                  <button
                    key={n}
                    className={`pagination-btn${page === n ? ' active' : ''}`}
                    onClick={() => setPage(n as number)}
                  >
                    {n}
                  </button>
                ),
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

      {/* Approve confirm */}
      <ConfirmModal
        isOpen={!!confirmApprove}
        title="Approve Verification"
        message={`Approve verification for ${confirmApprove?.user_name ?? 'this user'}? Their profile will be marked as verified.`}
        confirmLabel="Approve"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />

      {/* Reject modal with reason */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        title="Reject Verification"
        width={420}
      >
        <div className="notif-form">
          <div className="form-group">
            <label>Reason for rejection</label>
            <textarea
              className="form-input reject-reason-textarea"
              placeholder="e.g. Face not clearly visible, photo doesn't match..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setRejectTarget(null); setRejectReason(''); }}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? <span className="btn-spinner" /> : null}
              Reject Verification
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk approve confirm */}
      <ConfirmModal
        isOpen={bulkConfirmAction === 'approve'}
        title="Bulk Approve Verifications"
        message={`Approve ${selectedIds.size} verification(s)? Their profiles will be marked as verified.`}
        confirmLabel="Approve All"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleBulkApprove}
        onCancel={() => setBulkConfirmAction(null)}
      />

      {/* Bulk reject modal with reason */}
      <Modal
        open={bulkConfirmAction === 'reject'}
        onClose={() => { setBulkConfirmAction(null); setBulkRejectReason(''); }}
        title={`Reject ${selectedIds.size} Verification(s)`}
        width={420}
      >
        <div className="notif-form">
          <div className="form-group">
            <label>Reason for rejection (applied to all)</label>
            <textarea
              className="form-input reject-reason-textarea"
              placeholder="e.g. Face not clearly visible, photo doesn't match..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setBulkConfirmAction(null); setBulkRejectReason(''); }}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleBulkReject}
              disabled={actionLoading}
            >
              {actionLoading ? <span className="btn-spinner" /> : null}
              Reject All
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk result modal */}
      <Modal
        open={!!bulkResult}
        onClose={() => setBulkResult(null)}
        title="Bulk Action Result"
        width={480}
      >
        {bulkResult && (
          <div className="bulk-result-modal">
            <div className={`bulk-result-summary ${bulkResult.failed === 0 ? 'bulk-result-success' : bulkResult.succeeded === 0 ? 'bulk-result-error' : 'bulk-result-partial'}`}>
              {bulkResult.failed === 0
                ? `All ${bulkResult.total} verification(s) ${bulkResultAction} successfully`
                : bulkResult.succeeded === 0
                ? `All ${bulkResult.total} verification(s) failed`
                : `${bulkResult.succeeded} of ${bulkResult.total} ${bulkResultAction} successfully`}
            </div>
            {bulkResult.failures.length > 0 && (
              <div className="bulk-result-failures">
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Failed ({bulkResult.failed}):</p>
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
              <button className="btn btn-ghost" onClick={() => setBulkResult(null)}>Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <img
            className="lightbox-img"
            src={lightboxUrl}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
          />
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
