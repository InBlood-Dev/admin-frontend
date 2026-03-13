import { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { notifications as initialNotifs } from '../data/mock';
import type { Notification } from '../types';

export default function NotificationsPage() {
  const [data, setData] = useState<Notification[]>(initialNotifs);
  const [tab, setTab] = useState<'send' | 'history'>('send');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<Notification['segment']>('all');
  const [sent, setSent] = useState(false);

  const sendNotification = () => {
    if (!title.trim() || !body.trim()) return;

    const segmentCounts: Record<string, number> = {
      all: 24831, premium: 1892, inactive: 5400, new_users: 1247,
    };

    const newNotif: Notification = {
      id: `n${data.length + 1}`,
      title: title.trim(),
      body: body.trim(),
      segment,
      sent_at: new Date().toISOString(),
      sent_by: 'Admin',
      recipients_count: segmentCounts[segment],
      status: 'sent',
    };

    setData(prev => [newNotif, ...prev]);
    setTitle('');
    setBody('');
    setSegment('all');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const segmentLabel = (s: string) => {
    if (s === 'all') return 'All Users';
    if (s === 'premium') return 'Premium Only';
    if (s === 'inactive') return 'Inactive Users';
    return 'New Users';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
          <Bell size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> History ({data.length})
        </button>
      </div>

      {tab === 'send' && (
        <div className="table-card" style={{ maxWidth: 600 }}>
          <div className="table-header"><h3>New Broadcast</h3></div>
          <div style={{ padding: 24 }}>
            <div className="notif-form">
              <div className="form-group">
                <label>Target Segment</label>
                <select className="filter-select" style={{ width: '100%' }} value={segment} onChange={e => setSegment(e.target.value as Notification['segment'])}>
                  <option value="all">All Users (24,831)</option>
                  <option value="premium">Premium Users (1,892)</option>
                  <option value="inactive">Inactive Users (5,400)</option>
                  <option value="new_users">New Users - This Week (1,247)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input className="form-input" placeholder="Notification title..." value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Body</label>
                <textarea className="form-input" placeholder="Notification body..." value={body} onChange={e => setBody(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={sendNotification} disabled={!title.trim() || !body.trim()}>
                <Send size={14} /> Send Notification
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
                {data.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 500 }}>{n.title}</td>
                    <td style={{ maxWidth: 250, fontSize: 12, color: 'var(--text-secondary)' }}>{n.body}</td>
                    <td><span className="badge badge-blue">{segmentLabel(n.segment)}</span></td>
                    <td>{n.recipients_count.toLocaleString()}</td>
                    <td>{n.sent_by}</td>
                    <td>{formatDate(n.sent_at)}</td>
                    <td><span className="badge badge-green">{n.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
