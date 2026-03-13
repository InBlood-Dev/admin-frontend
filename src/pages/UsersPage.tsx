import { useState, useMemo } from 'react';
import { Eye, Ban, ShieldCheck, Trash2, RotateCcw } from 'lucide-react';
import { users as initialUsers, matches, reports } from '../data/mock';
import type { User } from '../types';
import Modal from '../components/Modal';

export default function UsersPage() {
  const [data, setData] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileTab, setProfileTab] = useState<'profile' | 'matches' | 'reports'>('profile');

  const filtered = useMemo(() => {
    return data.filter((u) => {
      const s = search.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(s) || u.location.city.toLowerCase().includes(s) || u.id.toLowerCase().includes(s);
      const matchesTier = tierFilter === 'all' || u.premium_tier === tierFilter;
      const matchesVerification = verificationFilter === 'all' || u.verification_status === verificationFilter;
      const matchesGender = genderFilter === 'all' || u.gender === genderFilter;
      const matchesBanned = bannedFilter === 'all' || (bannedFilter === 'banned' ? u.is_banned : !u.is_banned);
      return matchesSearch && matchesTier && matchesVerification && matchesGender && matchesBanned;
    });
  }, [data, search, tierFilter, verificationFilter, genderFilter, bannedFilter]);

  const updateUser = (id: string, updates: Partial<User>) => {
    setData(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const toggleBan = (id: string) => {
    const user = data.find(u => u.id === id);
    if (user) updateUser(id, { is_banned: !user.is_banned });
  };

  const forceVerify = (id: string) => updateUser(id, { verification_status: 'approved' });
  const rejectVerification = (id: string) => updateUser(id, { verification_status: 'rejected' });
  const deleteUser = (id: string) => {
    setData(prev => prev.filter(u => u.id !== id));
    setSelectedUser(null);
  };
  const resetSwipeLimits = (id: string) => updateUser(id, { daily_swipes_remaining: 50, daily_super_likes_remaining: 3 });

  const getUserMatches = (userId: string) => matches.filter(m => m.user_a === userId || m.user_b === userId);
  const getUserReportsFiled = (userId: string) => reports.filter(r => r.reporter_id === userId);
  const getUserReportsReceived = (userId: string) => reports.filter(r => r.reported_id === userId);

  const tierBadge = (tier: string) => {
    if (tier === 'premium_plus') return <span className="badge badge-purple">Plus</span>;
    if (tier === 'premium') return <span className="badge badge-yellow">Premium</span>;
    return <span className="badge badge-muted">Free</span>;
  };

  const verificationBadge = (status: string) => {
    if (status === 'approved') return <span className="badge badge-green">Verified</span>;
    if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
    if (status === 'rejected') return <span className="badge badge-red">Rejected</span>;
    return <span className="badge badge-muted">None</span>;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const getUserName = (id: string) => data.find(u => u.id === id)?.name ?? id;

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Users</h2>
          <p>{data.length} total users &middot; {data.filter(u => u.is_banned).length} banned</p>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>All Users</h3>
          <div className="table-header-actions">
            <input className="table-search" placeholder="Search name, city, ID..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="filter-select" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
              <option value="all">All Genders</option>
              <option value="Man">Men</option>
              <option value="Woman">Women</option>
              <option value="Non-Binary">Non-Binary</option>
            </select>
            <select className="filter-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
              <option value="all">All Tiers</option>
              <option value="normal">Free</option>
              <option value="premium">Premium</option>
              <option value="premium_plus">Premium Plus</option>
            </select>
            <select className="filter-select" value={verificationFilter} onChange={e => setVerificationFilter(e.target.value)}>
              <option value="all">All Verification</option>
              <option value="approved">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="none">None</option>
            </select>
            <select className="filter-select" value={bannedFilter} onChange={e => setBannedFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Location</th>
                <th>Tier</th>
                <th>Verification</th>
                <th>Status</th>
                <th>Matches</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={u.is_banned ? { opacity: 0.5 } : undefined}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar" style={u.is_banned ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}>{u.name.charAt(0)}</div>
                      <div className="user-cell-info">
                        <span className="user-cell-name">{u.name} {u.is_banned && <span className="badge badge-red" style={{ marginLeft: 4 }}>Banned</span>}</span>
                        <span className="user-cell-sub">{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>{u.age}</td>
                  <td>{u.gender}</td>
                  <td>{u.location.city}, {u.location.state}</td>
                  <td>{tierBadge(u.premium_tier)}</td>
                  <td>{verificationBadge(u.verification_status)}</td>
                  <td>
                    <span className={`status-dot ${u.is_online ? 'online' : 'offline'}`} />
                    {u.is_online ? 'Online' : 'Offline'}
                  </td>
                  <td>{u.stats.matches}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    <div className="action-group">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedUser(u); setProfileTab('profile'); }} title="View Profile"><Eye size={13} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => toggleBan(u.id)} title={u.is_banned ? 'Unban' : 'Ban'}><Ban size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><p>No users found.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Profile Modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser?.name ?? 'User Profile'} width={600}>
        {selectedUser && (
          <>
            <div className="tabs">
              <button className={`tab-btn ${profileTab === 'profile' ? 'active' : ''}`} onClick={() => setProfileTab('profile')}>Profile</button>
              <button className={`tab-btn ${profileTab === 'matches' ? 'active' : ''}`} onClick={() => setProfileTab('matches')}>Matches ({getUserMatches(selectedUser.id).length})</button>
              <button className={`tab-btn ${profileTab === 'reports' ? 'active' : ''}`} onClick={() => setProfileTab('reports')}>Reports</button>
            </div>

            {profileTab === 'profile' && (
              <>
                <div className="profile-section">
                  <div className="profile-section-title">Basic Info</div>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><label>Name</label><span>{selectedUser.name}</span></div>
                    <div className="profile-info-item"><label>Age</label><span>{selectedUser.age}</span></div>
                    <div className="profile-info-item"><label>Gender</label><span>{selectedUser.gender}</span></div>
                    <div className="profile-info-item"><label>Location</label><span>{selectedUser.location.city}, {selectedUser.location.state}</span></div>
                    <div className="profile-info-item"><label>Tier</label><span>{tierBadge(selectedUser.premium_tier)}</span></div>
                    <div className="profile-info-item"><label>Verification</label><span>{verificationBadge(selectedUser.verification_status)}</span></div>
                    <div className="profile-info-item"><label>Photos</label><span>{selectedUser.photos.length} photos</span></div>
                    <div className="profile-info-item"><label>Joined</label><span>{formatDate(selectedUser.created_at)}</span></div>
                  </div>
                </div>

                <div className="profile-section">
                  <div className="profile-section-title">Bio</div>
                  <div className="profile-prompt"><p>{selectedUser.bio}</p></div>
                </div>

                <div className="profile-section">
                  <div className="profile-section-title">Interests & Tags</div>
                  <div className="profile-tags">
                    {selectedUser.interests.map(i => <span className="profile-tag" key={i}>{i}</span>)}
                    {selectedUser.tags.map(t => <span className="profile-tag" key={t} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>{t}</span>)}
                  </div>
                </div>

                {selectedUser.prompts.length > 0 && (
                  <div className="profile-section">
                    <div className="profile-section-title">Prompts</div>
                    {selectedUser.prompts.map((p, i) => (
                      <div className="profile-prompt" key={i}>
                        <q>{p.question}</q>
                        <p>{p.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="profile-section">
                  <div className="profile-section-title">Stats</div>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><label>Matches</label><span>{selectedUser.stats.matches}</span></div>
                    <div className="profile-info-item"><label>Likes Received</label><span>{selectedUser.stats.likes_received}</span></div>
                    <div className="profile-info-item"><label>Super Likes</label><span>{selectedUser.stats.super_likes_received}</span></div>
                    <div className="profile-info-item"><label>Reports Filed</label><span>{selectedUser.stats.reports_filed}</span></div>
                    <div className="profile-info-item"><label>Reports Received</label><span>{selectedUser.stats.reports_received}</span></div>
                    <div className="profile-info-item"><label>Swipes Left Today</label><span>{selectedUser.daily_swipes_remaining}</span></div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => toggleBan(selectedUser.id)}>
                    <Ban size={13} /> {selectedUser.is_banned ? 'Unban User' : 'Ban User'}
                  </button>
                  {selectedUser.verification_status !== 'approved' && (
                    <button className="btn btn-sm btn-green" onClick={() => forceVerify(selectedUser.id)}>
                      <ShieldCheck size={13} /> Force Verify
                    </button>
                  )}
                  {selectedUser.verification_status === 'pending' && (
                    <button className="btn btn-sm btn-yellow" onClick={() => rejectVerification(selectedUser.id)}>
                      Reject Verification
                    </button>
                  )}
                  <button className="btn btn-sm btn-blue" onClick={() => resetSwipeLimits(selectedUser.id)}>
                    <RotateCcw size={13} /> Reset Limits
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => { if (confirm('Delete this user permanently?')) deleteUser(selectedUser.id); }}>
                    <Trash2 size={13} /> Delete User
                  </button>
                </div>
              </>
            )}

            {profileTab === 'matches' && (
              <div>
                {getUserMatches(selectedUser.id).length === 0 ? (
                  <div className="empty-state"><p>No matches found.</p></div>
                ) : (
                  <div className="table-wrap" style={{ maxHeight: 400 }}>
                    <table>
                      <thead><tr><th>Match ID</th><th>Matched With</th><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {getUserMatches(selectedUser.id).map(m => {
                          const otherId = m.user_a === selectedUser.id ? m.user_b : m.user_a;
                          return (
                            <tr key={m.match_id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{m.match_id}</td>
                              <td>{getUserName(otherId)}</td>
                              <td>{formatDate(m.matched_at)}</td>
                              <td>{m.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-muted">Inactive</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {profileTab === 'reports' && (
              <div>
                <div className="profile-section-title" style={{ marginBottom: 12 }}>Reports Filed ({getUserReportsFiled(selectedUser.id).length})</div>
                {getUserReportsFiled(selectedUser.id).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>No reports filed by this user.</p>
                ) : (
                  <div className="table-wrap" style={{ maxHeight: 200, marginBottom: 20 }}>
                    <table>
                      <thead><tr><th>Reported User</th><th>Reason</th><th>Status</th></tr></thead>
                      <tbody>
                        {getUserReportsFiled(selectedUser.id).map(r => (
                          <tr key={r.id}><td>{getUserName(r.reported_id)}</td><td>{r.reason}</td><td><span className="badge badge-muted">{r.status}</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="profile-section-title" style={{ marginBottom: 12 }}>Reports Received ({getUserReportsReceived(selectedUser.id).length})</div>
                {getUserReportsReceived(selectedUser.id).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No reports received.</p>
                ) : (
                  <div className="table-wrap" style={{ maxHeight: 200 }}>
                    <table>
                      <thead><tr><th>Reporter</th><th>Reason</th><th>Status</th></tr></thead>
                      <tbody>
                        {getUserReportsReceived(selectedUser.id).map(r => (
                          <tr key={r.id}><td>{getUserName(r.reporter_id)}</td><td>{r.reason}</td><td><span className="badge badge-muted">{r.status}</span></td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
