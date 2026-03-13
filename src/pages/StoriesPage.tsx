import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Image, Video, CheckCircle } from 'lucide-react';
import storyService from '../services/story.service';
import type { AdminStory, PaginatedStoriesResponse } from '../types';
import ConfirmModal from '../components/ConfirmModal';
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
              <div className="story-card-media">
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
