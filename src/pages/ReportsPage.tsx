import { useState, useEffect, useCallback } from 'react';
import { Ban, Trash2, ShieldAlert } from 'lucide-react';
import reportService from '../services/report.service';
import type { BulkReportActionResult } from '../services/report.service';
import type { AdminReport, PaginatedReportsResponse } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';
import Modal from '../components/Modal';

const PAGE_LIMIT = 20;

const REPORT_TYPE_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  fake_profile: 'Fake Profile',
  inappropriate_content: 'Inappropriate',
  solicitation: 'Solicitation',
  underage: 'Underage',
  other: 'Other',
};

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

function statusBadge(status: AdminReport['status']) {
  if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
  if (status === 'reviewed') return <span className="badge badge-blue">Reviewed</span>;
  if (status === 'dismissed') return <span className="badge badge-muted">Dismissed</span>;
  return <span className="badge badge-green">Actioned</span>;
}

function reportTypeBadge(type: string | null) {
  if (!type) return <span className="badge badge-muted">Unknown</span>;
  const label = REPORT_TYPE_LABELS[type] ?? type;
  if (type === 'harassment' || type === 'underage') return <span className="badge badge-red">{label}</span>;
  if (type === 'spam') return <span className="badge badge-yellow">{label}</span>;
  if (type === 'fake_profile') return <span className="badge badge-purple">{label}</span>;
  if (type === 'inappropriate_content') return <span className="badge badge-blue">{label}</span>;
  return <span className="badge badge-muted">{label}</span>;
}

type ConfirmState =
  | { type: 'dismiss'; report: AdminReport }
  | { type: 'ban'; report: AdminReport }
  | { type: 'delete_content'; report: AdminReport }
  | { type: 'warn'; report: AdminReport }
  | null;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 16 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 140 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 100 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 80 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 120 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<'review' | 'dismiss' | 'ban' | 'warn' | 'delete_content' | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkReportActionResult | null>(null);
  const [bulkResultAction, setBulkResultAction] = useState<string>('');

  const fetchReports = useCallback(async (p: number, status: string, report_type: string) => {
    setLoading(true);
    try {
      const params: Parameters<typeof reportService.listReports>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
      };
      if (status) params.status = status as AdminReport['status'];
      if (report_type) params.report_type = report_type;

      const result: PaginatedReportsResponse = await reportService.listReports(params);
      setReports(result.reports);
      setPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load reports', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(page, statusFilter, typeFilter);
  }, [page, statusFilter, typeFilter, fetchReports]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, typeFilter]);

  // Selectable = pending or reviewed (open reports)
  const selectableReports = reports.filter((r) => r.status === 'pending' || r.status === 'reviewed');
  const allSelected = selectableReports.length > 0 && selectableReports.every((r) => selectedIds.has(r.id));
  const someSelected = selectableReports.some((r) => selectedIds.has(r.id));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableReports.map((r) => r.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(kind: 'review' | 'dismiss' | 'ban' | 'warn' | 'delete_content') {
    setBulkConfirm(null);
    setActionLoading(true);
    try {
      const ids = [...selectedIds];
      let result: BulkReportActionResult;
      let label = '';
      if (kind === 'review') {
        result = await reportService.bulkReviewReports(ids);
        label = 'reviewed';
      } else if (kind === 'dismiss') {
        result = await reportService.bulkDismissReports(ids);
        label = 'dismissed';
      } else if (kind === 'ban') {
        result = await reportService.bulkActionReports(ids, 'ban_user');
        label = 'actioned (ban)';
      } else if (kind === 'warn') {
        result = await reportService.bulkActionReports(ids, 'warn');
        label = 'actioned (warn)';
      } else {
        result = await reportService.bulkActionReports(ids, 'delete_content');
        label = 'actioned (content deleted)';
      }
      setBulkResultAction(label);
      setBulkResult(result);

      // Refresh from server to reflect new statuses
      await fetchReports(page, statusFilter, typeFilter);
      setSelectedIds(new Set());
    } catch (err) {
      setError({ title: `Bulk ${kind} failed`, message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  const handleFilterChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };

  function updateReportInList(updated: AdminReport) {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleReview(report: AdminReport) {
    setActionLoading(true);
    try {
      const updated = await reportService.reviewReport(report.id);
      updateReportInList(updated);
    } catch (err) {
      setError({ title: 'Failed to review report', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirm) return;
    setActionLoading(true);
    try {
      let updated: AdminReport;
      if (confirm.type === 'dismiss') {
        updated = await reportService.dismissReport(confirm.report.id);
      } else if (confirm.type === 'ban') {
        updated = await reportService.actionReport(confirm.report.id, 'ban_user');
      } else if (confirm.type === 'delete_content') {
        updated = await reportService.actionReport(confirm.report.id, 'delete_content');
      } else {
        updated = await reportService.actionReport(confirm.report.id, 'warn');
      }
      updateReportInList(updated);
      setConfirm(null);
    } catch (err) {
      setConfirm(null);
      setError({ title: 'Action failed', message: extractErrorMessage(err) });
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

  const confirmName =
    confirm?.type === 'ban' || confirm?.type === 'warn' || confirm?.type === 'dismiss' || confirm?.type === 'delete_content'
      ? confirm.report.reported_user?.name ?? 'this user'
      : '';

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Content Moderation</h2>
          <p>{loading ? 'Loading…' : `${pagination.total} total reports`}</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>User Reports</h3>
          <div className="table-header-actions">
            <select
              className="filter-select"
              value={typeFilter}
              onChange={handleFilterChange(setTypeFilter)}
            >
              <option value="">All Types</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="fake_profile">Fake Profile</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="solicitation">Solicitation</option>
              <option value="underage">Underage</option>
              <option value="other">Other</option>
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="actioned">Actioned</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-action-count">{selectedIds.size} selected</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setBulkConfirm('review')} disabled={actionLoading}>
              Review
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setBulkConfirm('ban')} disabled={actionLoading}>
              Ban Users
            </button>
            <button className="btn btn-sm btn-yellow" onClick={() => setBulkConfirm('delete_content')} disabled={actionLoading}>
              Delete Content
            </button>
            <button className="btn btn-sm btn-green" onClick={() => setBulkConfirm('warn')} disabled={actionLoading}>
              Warn
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setBulkConfirm('dismiss')} disabled={actionLoading}>
              Dismiss
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())} disabled={actionLoading}>
              Clear
            </button>
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
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll}
                    disabled={selectableReports.length === 0}
                  />
                </th>
                <th>Reporter</th>
                <th>Reported User</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state"><p>No reports found.</p></div>
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const isSelectable = r.status === 'pending' || r.status === 'reviewed';
                  return (
                  <tr key={r.id} className={selectedIds.has(r.id) ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      {isSelectable && (
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      )}
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{r.reporter?.name?.charAt(0) ?? '?'}</div>
                        <span className="user-cell-name">{r.reporter?.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div
                          className="user-avatar"
                          style={
                            r.reported_user?.is_banned
                              ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                              : undefined
                          }
                        >
                          {r.reported_user?.name?.charAt(0) ?? '?'}
                        </div>
                        <div className="user-cell-info">
                          <span className="user-cell-name">
                            {r.reported_user?.name ?? 'Unknown'}
                            {r.reported_user?.is_banned && (
                              <span className="badge badge-red" style={{ marginLeft: 4 }}>Banned</span>
                            )}
                          </span>
                          {r.description && (
                            <span
                              className="user-cell-sub"
                              style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                            >
                              {r.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{reportTypeBadge(r.report_type)}</td>
                    <td
                      style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={r.reason ?? ''}
                    >
                      {r.reason ?? '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                    <td>
                      {statusBadge(r.status)}
                      {r.action_taken && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.action_taken}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="action-group">
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleReview(r)}
                              disabled={actionLoading}
                            >
                              Review
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setConfirm({ type: 'ban', report: r })}
                              disabled={actionLoading || !!r.reported_user?.is_banned}
                              title="Ban User"
                            >
                              <Ban size={13} />
                            </button>
                            {r.reported_message_id && (
                              <button
                                className="btn btn-sm btn-yellow"
                                onClick={() => setConfirm({ type: 'delete_content', report: r })}
                                disabled={actionLoading}
                                title="Delete Message"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setConfirm({ type: 'dismiss', report: r })}
                              disabled={actionLoading}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {r.status === 'reviewed' && (
                          <>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setConfirm({ type: 'ban', report: r })}
                              disabled={actionLoading || !!r.reported_user?.is_banned}
                            >
                              <Ban size={13} /> Ban
                            </button>
                            <button
                              className="btn btn-green btn-sm"
                              onClick={() => setConfirm({ type: 'warn', report: r })}
                              disabled={actionLoading}
                            >
                              <ShieldAlert size={13} /> Warn
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setConfirm({ type: 'dismiss', report: r })}
                              disabled={actionLoading}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {(r.status === 'actioned' || r.status === 'dismissed') && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Closed</span>
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

      <ConfirmModal
        isOpen={confirm?.type === 'dismiss'}
        title="Dismiss Report"
        message="Dismiss this report? This action cannot be undone."
        confirmLabel="Dismiss"
        confirmVariant="primary"
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        isOpen={confirm?.type === 'ban'}
        title="Ban User"
        message={`Ban ${confirmName}? They will lose access to the app and be hidden from discovery.`}
        confirmLabel="Ban User"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        isOpen={confirm?.type === 'delete_content'}
        title="Delete Message"
        message="Delete the reported message? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        isOpen={confirm?.type === 'warn'}
        title="Issue Warning"
        message={`Issue a warning for the report against ${confirmName}? The report will be marked as actioned.`}
        confirmLabel="Issue Warning"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmModal
        isOpen={bulkConfirm === 'review'}
        title="Bulk Review Reports"
        message={`Mark ${selectedIds.size} report(s) as reviewed?`}
        confirmLabel="Review All"
        confirmVariant="primary"
        isLoading={actionLoading}
        onConfirm={() => runBulk('review')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'dismiss'}
        title="Bulk Dismiss Reports"
        message={`Dismiss ${selectedIds.size} report(s)? This cannot be undone.`}
        confirmLabel="Dismiss All"
        confirmVariant="primary"
        isLoading={actionLoading}
        onConfirm={() => runBulk('dismiss')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'ban'}
        title="Bulk Ban Users"
        message={`Ban the reported users from ${selectedIds.size} report(s)? They will lose access and be hidden from discovery.`}
        confirmLabel="Ban All"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={() => runBulk('ban')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'delete_content'}
        title="Bulk Delete Content"
        message={`Delete the reported messages from ${selectedIds.size} report(s)? This cannot be undone. Reports without an associated message will fail.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={() => runBulk('delete_content')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'warn'}
        title="Bulk Issue Warnings"
        message={`Issue warnings for ${selectedIds.size} report(s)? Reports will be marked as actioned.`}
        confirmLabel="Warn All"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={() => runBulk('warn')}
        onCancel={() => setBulkConfirm(null)}
      />

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
                ? `All ${bulkResult.total} report(s) ${bulkResultAction} successfully`
                : bulkResult.succeeded === 0
                ? `All ${bulkResult.total} report(s) failed`
                : `${bulkResult.succeeded} of ${bulkResult.total} ${bulkResultAction} successfully`}
            </div>
            {bulkResult.failures.length > 0 && (
              <div className="bulk-result-failures">
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Failed ({bulkResult.failed}):</p>
                <ul className="bulk-result-failure-list">
                  {bulkResult.failures.map((f) => (
                    <li key={f.id}>
                      <span className="bulk-result-userid">{f.id}</span>
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
