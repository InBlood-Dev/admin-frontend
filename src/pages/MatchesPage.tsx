import { useState, useEffect, useCallback } from 'react';
import matchService from '../services/match.service';
import type { AdminMatch, PaginatedAdminMatchesResponse } from '../types';
import ErrorModal from '../components/ErrorModal';

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

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton skeleton-cell" style={{ width: 140 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 140 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 70 }} /></td>
          <td><div className="skeleton skeleton-cell" style={{ width: 130 }} /></td>
        </tr>
      ))}
    </>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const fetchMatches = useCallback(async (p: number, status: string) => {
    setLoading(true);
    try {
      const params: Parameters<typeof matchService.listMatches>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'matched_at',
        sort_order: 'desc',
      };
      if (status) params.status = status as 'active' | 'inactive';

      const result: PaginatedAdminMatchesResponse = await matchService.listMatches(params);
      setMatches(result.matches);
      setPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load matches', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(page, statusFilter);
  }, [page, statusFilter, fetchMatches]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

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
          <h2>Matches</h2>
          <p>
            {loading
              ? 'Loading…'
              : `${pagination.total} ${statusFilter ? statusFilter : 'total'} matches`}
          </p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>All Matches</h3>
          <div className="table-header-actions">
            <select className="filter-select" value={statusFilter} onChange={handleFilterChange}>
              <option value="">All Matches</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User A</th>
                <th>User B</th>
                <th>Matched At</th>
                <th>Status</th>
                <th>Unmatched At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : matches.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state"><p>No matches found.</p></div>
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{m.user_a.name.charAt(0)}</div>
                        <span className="user-cell-name">{m.user_a.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{m.user_b.name.charAt(0)}</div>
                        <span className="user-cell-name">{m.user_b.name}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.matched_at)}</td>
                    <td>
                      {m.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-muted">Inactive</span>
                      }
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.unmatched_at)}</td>
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
