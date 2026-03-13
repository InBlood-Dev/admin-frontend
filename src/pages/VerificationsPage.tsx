import { useState, useMemo } from 'react';
import { verifications } from '../data/mock';
import type { Verification } from '../types';
import Modal from '../components/Modal';

export default function VerificationsPage() {
  const [data, setData] = useState<Verification[]>(verifications);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return data;
    return data.filter((v) => v.status === statusFilter);
  }, [data, statusFilter]);

  const approve = (id: string) => {
    setData(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' as const } : v));
  };

  const reject = () => {
    if (!rejectModal) return;
    setData(prev => prev.map(v => v.id === rejectModal ? { ...v, status: 'rejected' as const, reject_reason: rejectReason || 'No reason provided' } : v));
    setRejectModal(null);
    setRejectReason('');
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusBadge = (status: string) => {
    if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
    if (status === 'approved') return <span className="badge badge-green">Approved</span>;
    return <span className="badge badge-red">Rejected</span>;
  };

  const pendingCount = data.filter(v => v.status === 'pending').length;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Verification Queue</h2>
          <p>{pendingCount} pending verification requests</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Verification Requests</h3>
          <div className="table-header-actions">
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>User ID</th>
                <th>Selfie</th>
                <th>Profile Photo</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{v.user_name.charAt(0)}</div>
                      <span className="user-cell-name">{v.user_name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{v.user_id}</td>
                  <td>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                      Selfie
                    </div>
                  </td>
                  <td>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                      Photo
                    </div>
                  </td>
                  <td>{formatDate(v.submitted_at)}</td>
                  <td>
                    {statusBadge(v.status)}
                    {v.reject_reason && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{v.reject_reason}</div>}
                  </td>
                  <td>
                    <div className="action-group">
                      {v.status === 'pending' && (
                        <>
                          <button className="btn btn-green btn-sm" onClick={() => approve(v.id)}>Approve</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRejectModal(v.id); setRejectReason(''); }}>Reject</button>
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
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state"><p>No verification requests found.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject with reason modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Verification" width={400}>
        <div className="notif-form">
          <div className="form-group">
            <label>Reason for rejection</label>
            <textarea
              className="form-input"
              placeholder="e.g. Face not clearly visible, photo doesn't match..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={reject}>Reject Verification</button>
        </div>
      </Modal>
    </div>
  );
}
