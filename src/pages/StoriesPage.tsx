import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Image, Video, CheckCircle } from 'lucide-react';
import storyService from '../services/story.service';
import type { BulkStoryActionResult } from '../services/story.service';
import type { AdminStory, PaginatedStoriesResponse } from '../types';
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

function formatTime(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="story-card">
          <div className="story-card-media" style={{ background: 'var(--bg-input)' }} />
          <div className="story-card-info">
            <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function StoriesPage() {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [mediaFilter, setMediaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminStory | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<AdminStory | null>(null);
  const [confirmClear, setConfirmClear] = useState<AdminStory | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<'delete' | 'restore' | 'clear' | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkStoryActionResult | null>(null);
  const [bulkResultAction, setBulkResultAction] = useState<'deleted' | 'restored' | 'cleared'>('deleted');

  const fetchStories = useCallback(async (p: number, deleted: boolean, mtype: string) => {
    setLoading(true);
    try {
      const params: Parameters<typeof storyService.listStories>[0] = {
        page: p,
        limit: PAGE_LIMIT,
        sort_by: 'created_at',
        sort_order: 'desc',
        show_deleted: deleted,
      };
      if (mtype) params.media_type = mtype as 'image' | 'video';

      const result: PaginatedStoriesResponse = await storyService.listStories(params);
      setStories(result.stories);
      setPagination(result.pagination);
    } catch (err) {
      setError({ title: 'Failed to load stories', message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories(page, showDeleted, mediaFilter);
  }, [page, showDeleted, mediaFilter, fetchStories]);

  // Clear selection when page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, showDeleted, mediaFilter]);

  const selectableStories = showDeleted ? stories.filter((s) => s.is_deleted) : stories.filter((s) => !s.is_deleted);
  const allSelected = selectableStories.length > 0 && selectableStories.every((s) => selectedIds.has(s.id));
  const someSelected = selectableStories.some((s) => selectedIds.has(s.id));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableStories.map((s) => s.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: 'delete' | 'restore' | 'clear') {
    setBulkConfirm(null);
    setActionLoading(true);
    try {
      const ids = [...selectedIds];
      let result: BulkStoryActionResult;
      if (action === 'delete') {
        result = await storyService.bulkDeleteStories(ids);
        setBulkResultAction('deleted');
      } else if (action === 'restore') {
        result = await storyService.bulkRestoreStories(ids);
        setBulkResultAction('restored');
      } else {
        result = await storyService.bulkClearStories(ids);
        setBulkResultAction('cleared');
      }
      setBulkResult(result);

      const failedIds = new Set(result.failures.map((f) => f.id));
      if (action === 'delete') {
        if (showDeleted) {
          setStories((prev) => prev.map((s) => (selectedIds.has(s.id) && !failedIds.has(s.id) ? { ...s, is_deleted: true } : s)));
        } else {
          setStories((prev) => prev.filter((s) => !(selectedIds.has(s.id) && !failedIds.has(s.id))));
          setPagination((p) => ({ ...p, total: Math.max(0, p.total - result.succeeded) }));
        }
      } else if (action === 'restore') {
        setStories((prev) => prev.map((s) => (selectedIds.has(s.id) && !failedIds.has(s.id) ? { ...s, is_deleted: false } : s)));
      }
      setSelectedIds(new Set());
    } catch (err) {
      setError({ title: `Bulk ${action} failed`, message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  const handleFilterChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      const updated = await storyService.deleteStory(confirmDelete.id);
      if (showDeleted) {
        setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        setStories((prev) => prev.filter((s) => s.id !== updated.id));
        setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      }
      setConfirmDelete(null);
    } catch (err) {
      setConfirmDelete(null);
      setError({ title: 'Failed to delete story', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRestore() {
    if (!confirmRestore) return;
    setActionLoading(true);
    try {
      const updated = await storyService.restoreStory(confirmRestore.id);
      setStories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setConfirmRestore(null);
    } catch (err) {
      setConfirmRestore(null);
      setError({ title: 'Failed to restore story', message: extractErrorMessage(err) });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClear() {
    if (!confirmClear) return;
    setActionLoading(true);
    try {
      await storyService.clearStory(confirmClear.id);
      setConfirmClear(null);
    } catch (err) {
      setConfirmClear(null);
      setError({ title: 'Failed to clear story', message: extractErrorMessage(err) });
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
          <h2>Stories Moderation</h2>
          <p>{loading ? 'Loading…' : `${pagination.total} ${showDeleted ? 'stories (including deleted)' : 'active stories'}`}</p>
        </div>
        <div className="table-header-actions">
          <select
            className="filter-select"
            value={showDeleted ? 'deleted' : 'active'}
            onChange={(e) => {
              setShowDeleted(e.target.value === 'deleted');
              setPage(1);
            }}
          >
            <option value="active">Active Stories</option>
            <option value="deleted">Show All (incl. Deleted)</option>
          </select>
          <select
            className="filter-select"
            value={mediaFilter}
            onChange={handleFilterChange(setMediaFilter)}
          >
            <option value="">All Media</option>
            <option value="image">Photos</option>
            <option value="video">Videos</option>
          </select>
        </div>
      </div>

      {selectableStories.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              className="bulk-checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={toggleSelectAll}
            />
            Select all
          </label>
          {selectedIds.size > 0 && (
            <div className="bulk-action-bar" style={{ marginTop: 0 }}>
              <span className="bulk-action-count">{selectedIds.size} selected</span>
              {!showDeleted ? (
                <>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setBulkConfirm('delete')}
                    disabled={actionLoading}
                  >
                    Delete Selected
                  </button>
                  <button
                    className="btn btn-sm btn-green"
                    onClick={() => setBulkConfirm('clear')}
                    disabled={actionLoading}
                  >
                    Clear Selected
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-sm btn-green"
                  onClick={() => setBulkConfirm('restore')}
                  disabled={actionLoading}
                >
                  Restore Selected
                </button>
              )}
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={actionLoading}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="stories-grid"><SkeletonCards /></div>
      ) : stories.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <p>No stories found matching your filters.</p>
        </div>
      ) : (
        <div className="stories-grid">
          {stories.map((s, i) => (
            <div
              className="story-card"
              key={s.id}
              style={{
                animationDelay: `${i * 0.05}s`,
                opacity: s.is_deleted ? 0.55 : 1,
              }}
            >
              <div className="story-card-media" style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  className="bulk-checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleSelect(s.id)}
                  style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}
                />
                {s.thumbnail_url || s.media_url ? (
                  <img
                    src={s.thumbnail_url ?? s.media_url ?? ''}
                    alt="story"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : s.media_type === 'video' ? (
                  <Video size={24} />
                ) : (
                  <Image size={24} />
                )}
                <span className="media-type-badge">
                  {s.media_type === 'video' ? 'Video' : 'Photo'}
                </span>
                {s.is_deleted && (
                  <span className="reported-badge" style={{ background: 'var(--accent)' }}>Deleted</span>
                )}
              </div>
              <div className="story-card-info">
                <div className="story-card-user">
                  <div className="user-avatar">{s.user?.name?.charAt(0) ?? '?'}</div>
                  <span>{s.user?.name ?? 'Unknown'}</span>
                </div>
                <div className="story-card-meta">
                  <span>{formatTime(s.created_at)}</span>
                  <span>{s.view_count} views</span>
                </div>
                <div className="story-card-actions">
                  {!s.is_deleted ? (
                    <>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setConfirmDelete(s)}
                        disabled={actionLoading}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                      <button
                        className="btn btn-sm btn-green"
                        onClick={() => setConfirmClear(s)}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={12} /> Clear
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-sm btn-green"
                      onClick={() => setConfirmRestore(s)}
                      disabled={actionLoading}
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 24 }}>
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

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Delete Story"
        message={`Delete this story by ${confirmDelete?.user?.name ?? 'Unknown'}? It will be hidden from all users.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmModal
        isOpen={!!confirmRestore}
        title="Restore Story"
        message={`Restore this story by ${confirmRestore?.user?.name ?? 'Unknown'}? It will become visible to users again.`}
        confirmLabel="Restore"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleRestore}
        onCancel={() => setConfirmRestore(null)}
      />
      <ConfirmModal
        isOpen={!!confirmClear}
        title="Clear Story"
        message={`Mark all pending reports for this story by ${confirmClear?.user?.name ?? 'Unknown'} as reviewed?`}
        confirmLabel="Clear"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(null)}
      />

      <ConfirmModal
        isOpen={bulkConfirm === 'delete'}
        title="Bulk Delete Stories"
        message={`Delete ${selectedIds.size} story(ies)? They will be hidden from all users.`}
        confirmLabel="Delete All"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={() => runBulk('delete')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'restore'}
        title="Bulk Restore Stories"
        message={`Restore ${selectedIds.size} story(ies)? They will become visible again.`}
        confirmLabel="Restore All"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={() => runBulk('restore')}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmModal
        isOpen={bulkConfirm === 'clear'}
        title="Bulk Clear Stories"
        message={`Mark all pending reports for ${selectedIds.size} story(ies) as reviewed?`}
        confirmLabel="Clear All"
        confirmVariant="green"
        isLoading={actionLoading}
        onConfirm={() => runBulk('clear')}
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
                ? `All ${bulkResult.total} story(ies) ${bulkResultAction} successfully`
                : bulkResult.succeeded === 0
                ? `All ${bulkResult.total} story(ies) failed`
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
