import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { isAxiosError } from 'axios';
import type { AdminUserListItem } from '../types';
import userService from '../services/user.service';
import type { CreateUserData } from '../services/user.service';
import Modal from '../components/Modal';
import ErrorModal from '../components/ErrorModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    const data = err.response.data;
    return data?.errors?.[0]?.message || data?.message || fallback;
  }
  return fallback;
}

function tierBadge(tier: string) {
  if (tier === 'annual') return <span className="badge badge-purple">Annual</span>;
  if (tier === 'monthly') return <span className="badge badge-yellow">Monthly</span>;
  return <span className="badge badge-muted">Free</span>;
}

function verificationBadge(status: string) {
  if (status === 'approved') return <span className="badge badge-green">Verified</span>;
  if (status === 'pending') return <span className="badge badge-yellow">Pending</span>;
  if (status === 'rejected') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-muted">None</span>;
}

function UserAvatar({ name, photoUrl, size = 32 }: { name: string; photoUrl?: string | null; size?: number }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="user-avatar-img" style={{ width: size, height: size }} />;
  }
  return (
    <div className="user-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Create User Modal ─────────────────────────────────────────────────────────

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateUserModal({ isOpen, onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState<CreateUserData>({ name: '', email: '', gender: 'Man', age: 18 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  function field(key: keyof CreateUserData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: key === 'age' ? parseInt(e.target.value) || 18 : e.target.value }));
    };
  }

  async function handleCreate() {
    setIsSaving(true);
    try {
      await userService.createUser(form);
      setForm({ name: '', email: '', gender: 'Man', age: 18 });
      onCreated();
    } catch (err) {
      setError({ title: 'Create Failed', message: extractErrorMessage(err, 'Failed to create user. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title="Add User" width={480}>
        <div className="edit-user-form">
          <div className="edit-form-group">
            <label>Name *</label>
            <input value={form.name} onChange={field('name')} placeholder="Full name" />
          </div>
          <div className="edit-form-group">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" />
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Gender *</label>
              <select value={form.gender} onChange={field('gender')}>
                <option value="Man">Man</option>
                <option value="Woman">Woman</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="edit-form-group">
              <label>Age *</label>
              <input type="number" min={18} max={120} value={form.age} onChange={field('age')} />
            </div>
          </div>
          <div className="edit-form-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <span className="btn-spinner" /> : null}
              Create User
            </button>
          </div>
        </div>
      </Modal>
      <ErrorModal
        isOpen={!!error}
        title={error?.title ?? 'Error'}
        message={error?.message ?? ''}
        onClose={() => setError(null)}
      />
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback((p: number, q: {
    search: string; gender: string; tier: string; verification: string; status: string; banned: string;
  }) => {
    const params: Record<string, unknown> = { page: p, limit: PAGE_LIMIT };
    if (q.search) params.search = q.search;
    if (q.gender) params.gender = q.gender;
    if (q.tier === 'free') params.is_premium = false;
    else if (q.tier === 'monthly' || q.tier === 'annual') params.is_premium = true;
    if (q.verification === 'verified') params.is_verified = true;
    else if (q.verification === 'unverified') params.is_verified = false;
    if (q.status === 'online') params.is_online = true;
    else if (q.status === 'offline') params.is_online = false;
    if (q.banned === 'banned') params.is_banned = true;
    else if (q.banned === 'active') params.is_banned = false;
    return params;
  }, []);

  const fetchUsers = useCallback(async (p: number, q: {
    search: string; gender: string; tier: string; verification: string; status: string; banned: string;
  }) => {
    setLoading(true);
    try {
      const res = await userService.listUsers(buildParams(p, q) as Parameters<typeof userService.listUsers>[0]);
      setUsers(res.users);
      setTotal(res.pagination.total);
    } catch (err) {
      setError({ title: 'Error', message: extractErrorMessage(err, 'Failed to load users. Please try again.') });
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const filters = { search, gender: genderFilter, tier: tierFilter, verification: verificationFilter, status: statusFilter, banned: bannedFilter };

  useEffect(() => {
    fetchUsers(page, filters);
  }, [page, genderFilter, tierFilter, verificationFilter, statusFilter, bannedFilter, fetchUsers]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, { ...filters, search: value });
    }, 300);
  }

  function handleFilterChange(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Users</h2>
          <p>{total} total users</p>
        </div>
        <div className="page-top-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <UserPlus size={14} /> Add User
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>All Users</h3>
          <div className="table-header-actions">
            <input
              className="table-search"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <select className="filter-select" value={genderFilter} onChange={handleFilterChange(setGenderFilter)}>
              <option value="">All Genders</option>
              <option value="Man">Men</option>
              <option value="Woman">Women</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Other">Other</option>
            </select>
            <select className="filter-select" value={tierFilter} onChange={handleFilterChange(setTierFilter)}>
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
            <select className="filter-select" value={verificationFilter} onChange={handleFilterChange(setVerificationFilter)}>
              <option value="">All Verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
            <select className="filter-select" value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <select className="filter-select" value={bannedFilter} onChange={handleFilterChange(setBannedFilter)}>
              <option value="">All Users</option>
              <option value="active">Not Banned</option>
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
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td colSpan={10}><div className="skeleton skeleton-cell" style={{ width: '60%' }} /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={10}><div className="empty-state"><p>No users found.</p></div></td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={u.is_banned ? { opacity: 0.55 } : undefined}>
                    <td>
                      <div className="user-cell">
                        <UserAvatar name={u.name} photoUrl={u.primary_photo_url} />
                        <div className="user-cell-info">
                          <span className="user-cell-name">
                            {u.name}
                            {u.is_banned && <span className="badge badge-red" style={{ marginLeft: 6 }}>Banned</span>}
                          </span>
                          <span className="user-cell-sub">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{u.age ?? '—'}</td>
                    <td>{u.gender}</td>
                    <td>{[u.location.city, u.location.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{tierBadge(u.premium_tier)}</td>
                    <td>{verificationBadge(u.verification_status)}</td>
                    <td>
                      <span className={`status-dot ${u.is_online ? 'online' : 'offline'}`} />
                      {u.is_online ? 'Online' : 'Offline'}
                    </td>
                    <td>{u.match_count}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="action-group">
                        <button className="btn btn-ghost btn-sm" title="View Profile" onClick={() => navigate(`/users/${u.id}`)}>
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total} users
            </span>
            <div className="pagination-controls">
              <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = page <= 4 ? i + 1 : page - 3 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                );
              })}
              <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateUserModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setPage(1);
          fetchUsers(1, filters);
        }}
      />

      <ErrorModal
        isOpen={!!error}
        title={error?.title ?? 'Error'}
        message={error?.message ?? ''}
        onClose={() => setError(null)}
      />
    </div>
  );
}
