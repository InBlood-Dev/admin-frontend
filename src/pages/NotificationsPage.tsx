import { useState, useEffect, useCallback } from 'react';
import { Send, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import notificationService from '../services/notification.service';
import type { BroadcastItem, PaginatedBroadcastsResponse } from '../services/notification.service';
import ErrorModal from '../components/ErrorModal';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    (err instanceof Error ? err.message : 'Something went wrong')
  );
}

const SEGMENTS = [
  { value: 'all', label: 'All Users' },
  { value: 'premium', label: 'Premium Only' },
  { value: 'inactive', label: 'Inactive Users' },
  { value: 'new_users', label: 'New Users (This Week)' },
] as const;

const PAGE_LIMIT = 20;

export default function NotificationsPage() {
  const [tab, setTab] = useState<'send' | 'history'>('send');

  // Send form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // History
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Fetch segment count when segment changes
  useEffect(() => {
    let cancelled = false;
    setSegmentCount(null);
    notificationService.getSegmentCount(segment).then((res) => {
      if (!cancelled) setSegmentCount(res.count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [segment]);

  // Fetch history
  const fetchHistory = useCallback(async (p: number) => {
    setHistoryLoading(true);
    try {
      const res: PaginatedBroadcastsResponse = await notificationService.getBroadcastHistory({ page: p, limit: PAGE_LIMIT });
      setBroadcasts(res.broadcasts);
      setHistoryPagination(res.pagination);
    } catch (err) {
      setError({ title: 'Failed to load history', message: extractErrorMessage(err) });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory(historyPage);
  }, [tab, historyPage, fetchHistory]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      await notificationService.sendBroadcast({ title: title.trim(), body: body.trim(), segment });
      setTitle('');
      setBody('');
      setSegment('all');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError({ title: 'Failed to send notification', message: extractErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  const segmentLabel = (s: string) => SEGMENTS.find((seg) => seg.value === s)?.label ?? s;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const statusBadge = (status: string) => {
    if (status === 'sent') return <span className="badge badge-green">Sent</span>;
    if (status === 'sending') return <span className="badge badge-yellow">Sending</span>;
    return <span className="badge badge-red">Failed</span>;
  };

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Push Notifications</h2>
          <p>Broadcast notifications to users</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'send' ? 'active' : ''}`} onClick={() => setTab('send')}>
          <Send size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Send Broadcast
        </button>
        <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <Bell size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> History
        </button>
      </div>

      {tab === 'send' && (
        <div className="table-card" style={{ maxWidth: 600 }}>
          <div className="table-header"><h3>New Broadcast</h3></div>
          <div style={{ padding: 24 }}>
            <div className="notif-form">
              <div className="form-group">
                <label>Target Segment</label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}{segmentCount !== null && segment === s.value ? ` (${segmentCount.toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>
                {segmentCount !== null && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {segmentCount.toLocaleString()} users in this segment
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  className="form-input"
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="form-group">
                <label>Body</label>
                <textarea
                  className="form-input"
                  placeholder="Notification body..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!title.trim() || !body.trim() || sending}
              >
                <Send size={14} /> {sending ? 'Sending…' : 'Send Notification'}
              </button>
              {sent && <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>Notification sent successfully!</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-card">
          <div className="table-header"><h3>Broadcast History</h3></div>
          <div className="table-wrap">
            {historyLoading ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : broadcasts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                No broadcasts sent yet.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Body</th>
                    <th>Segment</th>
                    <th>Recipients</th>
                    <th>Sent By</th>
                    <th>Sent At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.map((n) => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 500 }}>{n.title}</td>
                      <td style={{ maxWidth: 250, fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</td>
                      <td><span className="badge badge-blue">{segmentLabel(n.segment)}</span></td>
                      <td>{n.recipients_count.toLocaleString()}</td>
                      <td>{n.sent_by?.name ?? '—'}</td>
                      <td>{formatDate(n.sent_at)}</td>
                      <td>{statusBadge(n.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!historyLoading && historyPagination.totalPages > 1 && (
            <div className="pagination" style={{ padding: '12px 16px' }}>
              <span className="pagination-info">
                Page {historyPage} of {historyPagination.totalPages}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setHistoryPage((p) => p - 1)}
                  disabled={historyPage === 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setHistoryPage((p) => p + 1)}
                  disabled={historyPage === historyPagination.totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
