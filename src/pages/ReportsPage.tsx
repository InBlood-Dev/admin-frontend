import { useState, useMemo } from 'react';
import { Ban, Trash2, Eye } from 'lucide-react';
import { reports as initialReports, users as initialUsers } from '../data/mock';
import type { Report, User } from '../types';
import Modal from '../components/Modal';

export default function ReportsPage() {
  const [data, setData] = useState<Report[]>(initialReports);
  const [usersData, setUsersData] = useState<User[]>(initialUsers);
  const [statusFilter, setStatusFilter] = useState('all');
  const [contentFilter, setContentFilter] = useState('all');
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  const getUserById = (id: string) => usersData.find(u => u.id === id);
  const getUserName = (id: string) => getUserById(id)?.name ?? id;

  const filtered = useMemo(() => {
    return data.filter(r => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesContent = contentFilter === 'all' || r.reported_content_type === contentFilter;
      return matchesStatus && matchesContent;
    });
  }, [data, statusFilter, contentFilter]);

  const updateStatus = (id: string, status: Report['status'], action?: string) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status, action_taken: action || r.action_taken } : r));
  };

  const banUserFromReport = (reportId: string, userId: string) => {
    setUsersData(prev => prev.map(u => u.id === userId ? { ...u, is_banned: true } : u));
    updateStatus(reportId, 'actioned', 'User banned');
  };

  const deleteContent = (reportId: string) => {
    updateStatus(reportId, 'actioned', 'Content deleted');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusBadge = (status: string) => {
    if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
    if (status === 'reviewed') return <span className="badge badge-blue">Reviewed</span>;
    if (status === 'dismissed') return <span className="badge badge-muted">Dismissed</span>;
    return <span className="badge badge-green">Actioned</span>;
  };

  const contentBadge = (type: string) => {
    if (type === 'photo') return <span className="badge badge-blue">Photo</span>;
    if (type === 'story') return <span className="badge badge-purple">Story</span>;
    if (type === 'message') return <span className="badge badge-yellow">Message</span>;
    return <span className="badge badge-muted">Profile</span>;
  };

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Content Moderation</h2>
          <p>{data.filter(r => r.status === 'pending').length} pending reports &middot; {data.length} total</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>User Reports</h3>
          <div className="table-header-actions">
            <select className="filter-select" value={contentFilter} onChange={e => setContentFilter(e.target.value)}>
              <option value="all">All Content</option>
              <option value="profile">Profile</option>
              <option value="photo">Photo</option>
              <option value="story">Story</option>
              <option value="message">Message</option>
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="actioned">Actioned</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Reported User</th>
                <th>Reason</th>
                <th>Content Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const reportedUser = getUserById(r.reported_id);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{getUserName(r.reporter_id).charAt(0)}</div>
                        <span className="user-cell-name">{getUserName(r.reporter_id)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ background: reportedUser?.is_banned ? 'var(--accent-soft)' : undefined, color: reportedUser?.is_banned ? 'var(--accent)' : undefined }}>
                          {getUserName(r.reported_id).charAt(0)}
                        </div>
                        <div className="user-cell-info">
                          <span className="user-cell-name">
                            {getUserName(r.reported_id)}
                            {reportedUser?.is_banned && <span className="badge badge-red" style={{ marginLeft: 4 }}>Banned</span>}
                          </span>
                          <span className="user-cell-sub">{r.description}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.reason}</td>
                    <td>{contentBadge(r.reported_content_type)}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      {statusBadge(r.status)}
                      {r.action_taken && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.action_taken}</div>}
                    </td>
                    <td>
                      <div className="action-group">
                        {reportedUser && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewingUser(reportedUser)} title="View Profile">
                            <Eye size={13} />
                          </button>
                        )}
                        {r.status === 'pending' && (
                          <>
                            <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(r.id, 'reviewed')}>Review</button>
                            <button className="btn btn-sm btn-danger" onClick={() => banUserFromReport(r.id, r.reported_id)} title="Ban User">
                              <Ban size={13} />
                            </button>
                            {(r.reported_content_type === 'photo' || r.reported_content_type === 'story') && (
                              <button className="btn btn-sm btn-yellow" onClick={() => deleteContent(r.id)} title="Delete Content">
                                <Trash2 size={13} />
                              </button>
                            )}
                            <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(r.id, 'dismissed')}>Dismiss</button>
                          </>
                        )}
                        {r.status === 'reviewed' && (
                          <>
                            <button className="btn btn-sm btn-danger" onClick={() => banUserFromReport(r.id, r.reported_id)}>
                              <Ban size={13} /> Ban
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(r.id, 'dismissed')}>Dismiss</button>
                            <button className="btn btn-green btn-sm" onClick={() => updateStatus(r.id, 'actioned', 'Warning issued')}>Warn</button>
                          </>
                        )}
                        {(r.status === 'actioned' || r.status === 'dismissed') && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><p>No reports found.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline User Profile Modal */}
      <Modal open={!!viewingUser} onClose={() => setViewingUser(null)} title={viewingUser ? `${viewingUser.name}'s Profile` : ''} width={480}>
        {viewingUser && (
          <>
            <div className="inline-profile">
              <div className="inline-profile-header">
                <div className="inline-profile-avatar">{viewingUser.name.charAt(0)}</div>
                <div>
                  <div className="inline-profile-name">
                    {viewingUser.name}, {viewingUser.age}
                    {viewingUser.is_banned && <span className="badge badge-red" style={{ marginLeft: 6 }}>Banned</span>}
                  </div>
                  <div className="inline-profile-meta">{viewingUser.gender} &middot; {viewingUser.location.city}, {viewingUser.location.state}</div>
                </div>
              </div>
              <div className="inline-profile-bio">{viewingUser.bio}</div>
              <div className="inline-profile-stats">
                <span><strong>{viewingUser.stats.matches}</strong> matches</span>
                <span><strong>{viewingUser.stats.likes_received}</strong> likes</span>
                <span><strong>{viewingUser.stats.reports_received}</strong> reports received</span>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Interests</div>
              <div className="profile-tags">
                {viewingUser.interests.map(i => <span className="profile-tag" key={i}>{i}</span>)}
              </div>
            </div>

            {viewingUser.prompts.length > 0 && (
              <div className="profile-section">
                <div className="profile-section-title">Prompts</div>
                {viewingUser.prompts.map((p, i) => (
                  <div className="profile-prompt" key={i}><q>{p.question}</q><p>{p.answer}</p></div>
                ))}
              </div>
            )}

            <div className="profile-actions">
              <button className="btn btn-sm btn-danger" onClick={() => {
                setUsersData(prev => prev.map(u => u.id === viewingUser.id ? { ...u, is_banned: !u.is_banned } : u));
                setViewingUser({ ...viewingUser, is_banned: !viewingUser.is_banned });
              }}>
                <Ban size={13} /> {viewingUser.is_banned ? 'Unban User' : 'Ban User'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
