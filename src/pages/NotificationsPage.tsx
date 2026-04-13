import { useState, useEffect, useCallback } from 'react';
import { Send, Bell, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import notificationService from '../services/notification.service';
import type {
  BroadcastItem,
  PaginatedBroadcastsResponse,
  ScheduledNotificationItem,
  PaginatedScheduledResponse,
} from '../services/notification.service';
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
  const [tab, setTab] = useState<'send' | 'history' | 'scheduled'>('send');

  // Send form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState('all');
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // History
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scheduled
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotificationItem[]>([]);
  const [scheduledPagination, setScheduledPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [scheduledPage, setScheduledPage] = useState(1);
  const [scheduledLoading, setScheduledLoading] = useState(false);

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

  // Fetch scheduled notifications
  const fetchScheduled = useCallback(async (p: number) => {
    setScheduledLoading(true);
    try {
      const res: PaginatedScheduledResponse = await notificationService.getScheduledNotifications({ page: p, limit: PAGE_LIMIT });
      setScheduledNotifications(res.notifications);
      setScheduledPagination(res.pagination);
    } catch (err) {
      setError({ title: 'Failed to load scheduled notifications', message: extractErrorMessage(err) });
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'scheduled') fetchScheduled(scheduledPage);
  }, [tab, scheduledPage, fetchScheduled]);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;

    if (scheduleMode) {
      if (!scheduledAt) return;
      setSending(true);
      try {
        await notificationService.scheduleNotification({
          title: title.trim(),
          body: body.trim(),
          segment,
          scheduled_at: new Date(scheduledAt).toISOString(),
        });
        setTitle('');
        setBody('');
        setSegment('all');
        setScheduledAt('');
        setScheduleMode(false);
        setSuccessMessage('Notification scheduled successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError({ title: 'Failed to schedule notification', message: extractErrorMessage(err) });
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    try {
      await notificationService.sendBroadcast({ title: title.trim(), body: body.trim(), segment });
      setTitle('');
      setBody('');
      setSegment('all');
      setSuccessMessage('Notification sent successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError({ title: 'Failed to send notification', message: extractErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  async function handleCancelScheduled(id: string) {
    if (!window.confirm('Are you sure you want to cancel this scheduled notification?')) return;
    try {
      await notificationService.cancelScheduledNotification(id);
      fetchScheduled(scheduledPage);
    } catch (err) {
      setError({ title: 'Failed to cancel notification', message: extractErrorMessage(err) });
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
    if (status === 'scheduled') return <span className="badge badge-blue">Scheduled</span>;
    if (status === 'cancelled') return <span className="badge badge-gray">Cancelled</span>;
    return <span className="badge badge-red">Failed</span>;
  };

  // Minimum datetime for the scheduler (2 minutes from now, in local time)
  // Note: datetime-local inputs expect local time, not UTC — toISOString() would be wrong here
  const getMinDatetime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
        <button className={`tab-btn ${tab === 'scheduled' ? 'active' : ''}`} onClick={() => setTab('scheduled')}>
          <Clock size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Scheduled
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

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="schedule-toggle"
                  checked={scheduleMode}
                  onChange={(e) => {
                    setScheduleMode(e.target.checked);
                    if (!e.target.checked) setScheduledAt('');
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="schedule-toggle" style={{ margin: 0, cursor: 'pointer' }}>
                  Schedule for later
                </label>
              </div>

              {scheduleMode && (
                <div className="form-group">
                  <label>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={getMinDatetime()}
                  />
                  {scheduledAt && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Will be sent on {formatDate(new Date(scheduledAt).toISOString())}
                    </p>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!title.trim() || !body.trim() || sending || (scheduleMode && !scheduledAt)}
              >
                {scheduleMode ? (
                  <><Clock size={14} /> {sending ? 'Scheduling...' : 'Schedule Notification'}</>
                ) : (
                  <><Send size={14} /> {sending ? 'Sending...' : 'Send Now'}</>
                )}
              </button>
              {successMessage && (
                <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                  {successMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="table-card">
          <div className="table-header"><h3>Scheduled Notifications</h3></div>
          <div className="table-wrap">
            {scheduledLoading ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : scheduledNotifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                No scheduled notifications yet.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Body</th>
                    <th>Segment</th>
                    <th>Scheduled For</th>
                    <th>Created By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledNotifications.map((n) => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 500 }}>{n.title}</td>
                      <td style={{ maxWidth: 250, fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</td>
                      <td><span className="badge badge-blue">{segmentLabel(n.segment)}</span></td>
                      <td>{formatDate(n.scheduled_at)}</td>
                      <td>{n.created_by?.name ?? '—'}</td>
                      <td>{statusBadge(n.status)}</td>
                      <td>
                        {n.status === 'scheduled' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => handleCancelScheduled(n.id)}
                            title="Cancel scheduled notification"
                          >
                            <X size={12} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!scheduledLoading && scheduledPagination.totalPages > 1 && (
            <div className="pagination" style={{ padding: '12px 16px' }}>
              <span className="pagination-info">
                Page {scheduledPage} of {scheduledPagination.totalPages}
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setScheduledPage((p) => p - 1)}
                  disabled={scheduledPage === 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setScheduledPage((p) => p + 1)}
                  disabled={scheduledPage === scheduledPagination.totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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
