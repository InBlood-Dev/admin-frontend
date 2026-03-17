import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ban, ShieldCheck, Trash2, RotateCcw, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { isAxiosError } from 'axios';
import type {
  AdminUserProfile,
  AdminUserMatch,
  AdminUserReport,
} from '../types';
import userService from '../services/user.service';
import type { UpdateUserData } from '../services/user.service';
import Modal from '../components/Modal';
import ErrorModal from '../components/ErrorModal';
import ConfirmModal from '../components/ConfirmModal';

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
  return <span className="badge badge-muted">{status}</span>;
}

function UserAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) return <img className="user-avatar" src={photoUrl} alt={name} />;
  return <div className="user-avatar user-avatar-placeholder">{name.charAt(0).toUpperCase()}</div>;
}

// ─── Edit User Modal ───────────────────────────────────────────────────────────

interface EditUserModalProps {
  profile: AdminUserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditUserModal({ profile, isOpen, onClose, onSaved }: EditUserModalProps) {
  const [form, setForm] = useState<UpdateUserData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: profile.name,
        email: profile.email,
        age: profile.age,
        gender: profile.gender,
        bio: profile.bio ?? undefined,
        job_title: profile.job_title ?? undefined,
        company: profile.company ?? undefined,
        education: profile.education ?? undefined,
        pronouns: profile.pronouns ?? undefined,
        sexual_orientation: profile.sexual_orientation ?? undefined,
        drinking: profile.drinking ?? undefined,
        smoking: profile.smoking ?? undefined,
        exercise: profile.exercise ?? undefined,
        pets: profile.pets ?? undefined,
      });
    }
  }, [isOpen, profile]);

  function field(key: keyof UpdateUserData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value === '' ? undefined : e.target.value;
      setForm((f) => ({ ...f, [key]: val }));
    };
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await userService.updateUser(profile.id, form);
      onSaved();
    } catch (err) {
      setError({ title: 'Update Failed', message: extractErrorMessage(err, 'Failed to update user. Please try again.') });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title="Edit User" width={560}>
        <div className="edit-user-form">
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Name</label>
              <input value={form.name ?? ''} onChange={field('name')} />
            </div>
            <div className="edit-form-group">
              <label>Email</label>
              <input type="email" value={form.email ?? ''} onChange={field('email')} />
            </div>
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Age</label>
              <input
                type="number" min={18} max={120} value={form.age ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
            <div className="edit-form-group">
              <label>Gender</label>
              <select value={form.gender ?? ''} onChange={field('gender')}>
                <option value="">Select...</option>
                <option value="Man">Man</option>
                <option value="Woman">Woman</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="edit-form-group">
            <label>Bio</label>
            <textarea value={form.bio ?? ''} onChange={field('bio')} />
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Job Title</label>
              <input value={form.job_title ?? ''} onChange={field('job_title')} />
            </div>
            <div className="edit-form-group">
              <label>Company</label>
              <input value={form.company ?? ''} onChange={field('company')} />
            </div>
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Education</label>
              <input value={form.education ?? ''} onChange={field('education')} />
            </div>
            <div className="edit-form-group">
              <label>Pronouns</label>
              <input value={form.pronouns ?? ''} onChange={field('pronouns')} />
            </div>
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Sexual Orientation</label>
              <input value={form.sexual_orientation ?? ''} onChange={field('sexual_orientation')} />
            </div>
            <div className="edit-form-group">
              <label>Drinking</label>
              <input value={form.drinking ?? ''} onChange={field('drinking')} />
            </div>
          </div>
          <div className="edit-form-row">
            <div className="edit-form-group">
              <label>Smoking</label>
              <input value={form.smoking ?? ''} onChange={field('smoking')} />
            </div>
            <div className="edit-form-group">
              <label>Exercise</label>
              <input value={form.exercise ?? ''} onChange={field('exercise')} />
            </div>
          </div>
          <div className="edit-form-group">
            <label>Pets</label>
            <input value={form.pets ?? ''} onChange={field('pets')} />
          </div>
          <div className="edit-form-actions">
            <button className="btn btn-ghost" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <span className="btn-spinner" /> : null}
              Save Changes
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

// ─── User Detail Page ─────────────────────────────────────────────────────────

type ProfileTab = 'profile' | 'photos' | 'matches' | 'reports' | 'subscription';

export default function UserDetailPage() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>('profile');

  const [matches, setMatches] = useState<AdminUserMatch[]>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [reports, setReports] = useState<{ reports_filed: AdminUserReport[]; reports_received: AdminUserReport[] } | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const [confirm, setConfirm] = useState<{
    type: 'ban' | 'unban' | 'verify' | 'reject' | 'grant' | 'revoke' | 'delete' | 'reset_limits' | null;
    isLoading: boolean;
  }>({ type: null, isLoading: false });
  const [rejectReason, setRejectReason] = useState('');
  const [grantPlan, setGrantPlan] = useState<'monthly' | 'annual'>('monthly');

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await userService.getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      setError({ title: 'Error', message: extractErrorMessage(err, 'Failed to load user profile') });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchMatches = useCallback(async (p: number) => {
    if (!userId) return;
    setMatchesLoading(true);
    try {
      const res = await userService.getUserMatches(userId, { page: p, limit: 10 });
      setMatches(res.matches);
      setMatchesTotal(res.pagination.total);
    } catch (err) {
      setError({ title: 'Error', message: extractErrorMessage(err, 'Failed to load matches') });
    } finally {
      setMatchesLoading(false);
    }
  }, [userId]);

  const fetchReports = useCallback(async () => {
    if (!userId) return;
    setReportsLoading(true);
    try {
      const res = await userService.getUserReports(userId);
      setReports(res);
    } catch (err) {
      setError({ title: 'Error', message: extractErrorMessage(err, 'Failed to load reports') });
    } finally {
      setReportsLoading(false);
    }
  }, [userId]);

  const handleTabChange = (t: ProfileTab) => {
    setTab(t);
    if (t === 'matches' && matches.length === 0) fetchMatches(1);
    if (t === 'reports' && !reports) fetchReports();
  };

  const handleMatchesPage = (p: number) => {
    setMatchesPage(p);
    fetchMatches(p);
  };

  async function runConfirmAction() {
    if (!profile || !confirm.type) return;
    setConfirm((c) => ({ ...c, isLoading: true }));
    try {
      switch (confirm.type) {
        case 'ban': await userService.banUser(profile.id); break;
        case 'unban': await userService.unbanUser(profile.id); break;
        case 'verify': await userService.forceVerifyUser(profile.id); break;
        case 'reject': await userService.rejectVerification(profile.id, rejectReason); break;
        case 'grant': await userService.grantSubscription(profile.id, grantPlan); break;
        case 'revoke': await userService.revokeSubscription(profile.id); break;
        case 'delete': await userService.deleteUser(profile.id); break;
        case 'reset_limits': await userService.resetLimits(profile.id); break;
      }
      setConfirm({ type: null, isLoading: false });
      setRejectReason('');
      if (confirm.type === 'delete') {
        navigate('/users');
        return;
      }
      await fetchProfile();
    } catch (err) {
      setConfirm({ type: null, isLoading: false });
      setError({ title: 'Action Failed', message: extractErrorMessage(err, 'The action could not be completed. Please try again.') });
    }
  }

  const matchesTotalPages = Math.ceil(matchesTotal / 10);

  return (
    <div className="animate-in">
      <div className="page-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/users')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2>{profile?.name ?? 'User Profile'}</h2>
            {profile && <p>{profile.email}</p>}
          </div>
        </div>
      </div>

      <div className="table-card" style={{ padding: 24 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="auth-loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        )}

        {!loading && profile && (
          <>
            <div className="tabs">
              {(['profile', 'photos', 'matches', 'reports', 'subscription'] as ProfileTab[]).map((t) => (
                <button
                  key={t}
                  className={`tab-btn ${tab === t ? 'active' : ''}`}
                  onClick={() => handleTabChange(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'photos' && ` (${profile.photos.length})`}
                  {t === 'matches' && ` (${profile.stats.matches})`}
                </button>
              ))}
            </div>

            {/* ── Profile Tab ── */}
            {tab === 'profile' && (
              <>
                <div className="profile-section">
                  <div className="profile-section-title">Status</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {verificationBadge(profile.verification_status)}
                    {tierBadge(profile.premium_tier)}
                    <span className={`badge ${profile.is_online ? 'badge-green' : 'badge-muted'}`}>
                      {profile.is_online ? 'Online' : 'Offline'}
                    </span>
                    {profile.is_banned && <span className="badge badge-red">Banned</span>}
                    {!profile.is_discoverable && <span className="badge badge-muted">Hidden</span>}
                  </div>
                </div>

                <div className="profile-section">
                  <div className="profile-section-title">Basic Info</div>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><label>Name</label><span>{profile.name}</span></div>
                    <div className="profile-info-item"><label>Email</label><span>{profile.email}</span></div>
                    <div className="profile-info-item"><label>Age</label><span>{profile.age ?? '—'}</span></div>
                    <div className="profile-info-item"><label>Gender</label><span>{profile.gender ?? '—'}</span></div>
                    <div className="profile-info-item">
                      <label>Location</label>
                      <span>{[profile.location.city, profile.location.state, profile.location.country].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                    <div className="profile-info-item"><label>Joined</label><span>{formatDate(profile.created_at)}</span></div>
                    <div className="profile-info-item"><label>Last Active</label><span>{formatDate(profile.last_active_at)}</span></div>
                    {profile.pronouns && <div className="profile-info-item"><label>Pronouns</label><span>{profile.pronouns}</span></div>}
                    {profile.sexual_orientation && <div className="profile-info-item"><label>Orientation</label><span>{profile.sexual_orientation}</span></div>}
                  </div>
                </div>

                {(profile.job_title || profile.company || profile.education) && (
                  <div className="profile-section">
                    <div className="profile-section-title">Work & Education</div>
                    <div className="profile-info-grid">
                      {profile.job_title && <div className="profile-info-item"><label>Job Title</label><span>{profile.job_title}</span></div>}
                      {profile.company && <div className="profile-info-item"><label>Company</label><span>{profile.company}</span></div>}
                      {profile.education && <div className="profile-info-item"><label>Education</label><span>{profile.education}</span></div>}
                    </div>
                  </div>
                )}

                {profile.bio && (
                  <div className="profile-section">
                    <div className="profile-section-title">Bio</div>
                    <div className="profile-prompt"><p>{profile.bio}</p></div>
                  </div>
                )}

                {(profile.drinking || profile.smoking || profile.exercise || profile.pets) && (
                  <div className="profile-section">
                    <div className="profile-section-title">Lifestyle</div>
                    <div className="profile-info-grid">
                      {profile.drinking && <div className="profile-info-item"><label>Drinking</label><span>{profile.drinking}</span></div>}
                      {profile.smoking && <div className="profile-info-item"><label>Smoking</label><span>{profile.smoking}</span></div>}
                      {profile.exercise && <div className="profile-info-item"><label>Exercise</label><span>{profile.exercise}</span></div>}
                      {profile.pets && <div className="profile-info-item"><label>Pets</label><span>{profile.pets}</span></div>}
                    </div>
                  </div>
                )}

                {(profile.interests.length > 0 || profile.tags.length > 0) && (
                  <div className="profile-section">
                    <div className="profile-section-title">Interests & Tags</div>
                    <div className="profile-tags">
                      {profile.interests.map((i) => <span className="profile-tag" key={i}>{i}</span>)}
                      {profile.tags.map((t) => (
                        <span className="profile-tag" key={t.id} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.languages.length > 0 && (
                  <div className="profile-section">
                    <div className="profile-section-title">Languages</div>
                    <div className="profile-tags">
                      {profile.languages.map((l) => <span className="profile-tag" key={l}>{l}</span>)}
                    </div>
                  </div>
                )}

                {profile.prompts.length > 0 && (
                  <div className="profile-section">
                    <div className="profile-section-title">Prompts</div>
                    {profile.prompts.map((p, i) => (
                      <div className="profile-prompt" key={i}>
                        <q>{p.question}</q>
                        <p>{p.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                {profile.opening_moves.length > 0 && (
                  <div className="profile-section">
                    <div className="profile-section-title">Opening Moves</div>
                    {profile.opening_moves.map((p, i) => (
                      <div className="profile-prompt" key={i}>
                        <q>{p.question}</q>
                        <p>{p.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="profile-section">
                  <div className="profile-section-title">Discovery Preferences</div>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><label>Discoverable</label><span>{profile.is_discoverable ? 'Yes' : 'No'}</span></div>
                    {profile.proximity_range != null && <div className="profile-info-item"><label>Distance</label><span>{profile.proximity_range} km</span></div>}
                    {(profile.age_min != null || profile.age_max != null) && (
                      <div className="profile-info-item">
                        <label>Age Range</label><span>{profile.age_min ?? '?'}–{profile.age_max ?? '?'}</span>
                      </div>
                    )}
                    {profile.show_distance && <div className="profile-info-item"><label>Show Distance</label><span>{profile.show_distance}</span></div>}
                    <div className="profile-info-item"><label>Show Last Active</label><span>{profile.show_last_active ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>

                <div className="profile-section">
                  <div className="profile-section-title">Stats</div>
                  <div className="profile-info-grid">
                    <div className="profile-info-item"><label>Matches</label><span>{profile.stats.matches}</span></div>
                    <div className="profile-info-item"><label>Likes Received</label><span>{profile.stats.likes_received}</span></div>
                    <div className="profile-info-item"><label>Super Likes Received</label><span>{profile.stats.super_likes_received}</span></div>
                    <div className="profile-info-item"><label>Reports Filed</label><span>{profile.stats.reports_filed}</span></div>
                    <div className="profile-info-item"><label>Reports Received</label><span>{profile.stats.reports_received}</span></div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button className="btn btn-sm btn-blue" onClick={() => setEditOpen(true)}>Edit Profile</button>
                  {profile.is_banned ? (
                    <button className="btn btn-sm btn-green" onClick={() => setConfirm({ type: 'unban', isLoading: false })}>Unban User</button>
                  ) : (
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ type: 'ban', isLoading: false })}>
                      <Ban size={13} /> Ban User
                    </button>
                  )}
                  {profile.verification_status !== 'approved' && (
                    <button className="btn btn-sm btn-green" onClick={() => setConfirm({ type: 'verify', isLoading: false })}>
                      <ShieldCheck size={13} /> Force Verify
                    </button>
                  )}
                  {profile.verification_status === 'pending' && (
                    <button className="btn btn-sm btn-yellow" onClick={() => { setRejectReason(''); setConfirm({ type: 'reject', isLoading: false }); }}>
                      Reject Verification
                    </button>
                  )}
                  <button className="btn btn-sm btn-blue" onClick={() => setConfirm({ type: 'reset_limits', isLoading: false })}>
                    <RotateCcw size={13} /> Reset Limits
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ type: 'delete', isLoading: false })}>
                    <Trash2 size={13} /> Delete User
                  </button>
                </div>
              </>
            )}

            {/* ── Photos Tab ── */}
            {tab === 'photos' && (
              profile.photos.length === 0 ? (
                <div className="empty-state"><p>No photos uploaded.</p></div>
              ) : (
                <div className="profile-photos-grid">
                  {profile.photos.map((photo) => (
                    <div key={photo.id} className="profile-photo-card" onClick={() => setLightboxUrl(photo.url)}>
                      <img src={photo.url} alt={`Photo ${photo.order_index}`} />
                      <div className="profile-photo-meta">
                        {photo.is_primary && <span className="badge badge-green" style={{ fontSize: 10 }}>Primary</span>}
                        {photo.is_approved && <span className="badge badge-muted" style={{ fontSize: 10 }}>Approved</span>}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>#{photo.order_index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── Matches Tab ── */}
            {tab === 'matches' && (
              matchesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="auth-loading-spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : matches.length === 0 ? (
                <div className="empty-state"><p>No matches found.</p></div>
              ) : (
                <>
                  <div className="table-wrap" style={{ maxHeight: 380 }}>
                    <table>
                      <thead><tr><th>User</th><th>Matched</th><th>Status</th></tr></thead>
                      <tbody>
                        {matches.map((m) => (
                          <tr key={m.match_id}>
                            <td>
                              <div className="user-cell">
                                <UserAvatar name={m.other_user.name} photoUrl={m.other_user.photo_url} />
                                <span className="user-cell-name">{m.other_user.name}</span>
                              </div>
                            </td>
                            <td>{formatDate(m.matched_at)}</td>
                            <td>{m.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-muted">Inactive</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {matchesTotalPages > 1 && (
                    <div className="pagination">
                      <span className="pagination-info">Page {matchesPage} of {matchesTotalPages}</span>
                      <div className="pagination-controls">
                        <button className="pagination-btn" disabled={matchesPage <= 1} onClick={() => handleMatchesPage(matchesPage - 1)}><ChevronLeft size={14} /></button>
                        <button className="pagination-btn" disabled={matchesPage >= matchesTotalPages} onClick={() => handleMatchesPage(matchesPage + 1)}><ChevronRight size={14} /></button>
                      </div>
                    </div>
                  )}
                </>
              )
            )}

            {/* ── Reports Tab ── */}
            {tab === 'reports' && (
              reportsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="auth-loading-spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : (
                <>
                  <div className="profile-section-title" style={{ marginBottom: 10 }}>Reports Filed ({reports?.reports_filed.length ?? 0})</div>
                  {!reports?.reports_filed.length ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>No reports filed.</p>
                  ) : (
                    <div className="table-wrap" style={{ maxHeight: 200, marginBottom: 20 }}>
                      <table>
                        <thead><tr><th>Reported User</th><th>Reason</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                          {reports.reports_filed.map((r) => (
                            <tr key={r.id}>
                              <td>{r.reported.name}</td>
                              <td>{r.reason ?? '—'}</td>
                              <td><span className="badge badge-muted">{r.status ?? '—'}</span></td>
                              <td>{formatDate(r.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="profile-section-title" style={{ marginBottom: 10 }}>Reports Received ({reports?.reports_received.length ?? 0})</div>
                  {!reports?.reports_received.length ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No reports received.</p>
                  ) : (
                    <div className="table-wrap" style={{ maxHeight: 200 }}>
                      <table>
                        <thead><tr><th>Reporter</th><th>Reason</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                          {reports.reports_received.map((r) => (
                            <tr key={r.id}>
                              <td>{r.reporter.name}</td>
                              <td>{r.reason ?? '—'}</td>
                              <td><span className="badge badge-muted">{r.status ?? '—'}</span></td>
                              <td>{formatDate(r.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )
            )}

            {/* ── Subscription Tab ── */}
            {tab === 'subscription' && (
              <>
                <div className="profile-section-title" style={{ marginBottom: 10 }}>Current Subscription</div>
                {profile.active_subscription ? (
                  <div className="subscription-status">
                    <div className="subscription-detail-row"><span>Plan</span><strong>{profile.active_subscription.plan_type}</strong></div>
                    <div className="subscription-detail-row"><span>Status</span><strong>{profile.active_subscription.status}</strong></div>
                    <div className="subscription-detail-row"><span>Started</span><strong>{formatDate(profile.active_subscription.started_at)}</strong></div>
                    <div className="subscription-detail-row"><span>Expires</span><strong>{formatDate(profile.active_subscription.expires_at)}</strong></div>
                    <div style={{ marginTop: 12 }}>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ type: 'revoke', isLoading: false })}>Revoke Subscription</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No active subscription.</p>
                )}

                {!profile.active_subscription && (
                  <>
                    <div className="profile-section-title" style={{ marginBottom: 10 }}>Grant Subscription</div>
                    <div className="subscription-grant-form">
                      <div>
                        <label>Plan</label>
                        <select className="filter-select" value={grantPlan} onChange={(e) => setGrantPlan(e.target.value as 'monthly' | 'annual')}>
                          <option value="monthly">Monthly (30 days)</option>
                          <option value="annual">Annual (365 days)</option>
                        </select>
                      </div>
                      <button className="btn btn-sm btn-green" onClick={() => setConfirm({ type: 'grant', isLoading: false })}>Grant</button>
                    </div>
                  </>
                )}

                {profile.subscription_history.length > 0 && (
                  <>
                    <div className="profile-section-title" style={{ marginBottom: 10, marginTop: 20 }}>Subscription History</div>
                    <div className="table-wrap" style={{ maxHeight: 280 }}>
                      <table>
                        <thead><tr><th>Plan</th><th>Status</th><th>Started</th><th>Expires</th></tr></thead>
                        <tbody>
                          {profile.subscription_history.map((sub) => (
                            <tr key={sub.id}>
                              <td>{sub.plan_type}</td>
                              <td>
                                <span className={`badge ${sub.status === 'active' ? 'badge-green' : sub.status === 'cancelled' ? 'badge-red' : 'badge-muted'}`}>{sub.status}</span>
                              </td>
                              <td>{formatDate(sub.started_at)}</td>
                              <td>{formatDate(sub.expires_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {profile && (
        <EditUserModal
          profile={profile}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={async () => { setEditOpen(false); await fetchProfile(); }}
        />
      )}

      {/* Confirm: Ban */}
      <ConfirmModal
        isOpen={confirm.type === 'ban'}
        title="Ban User"
        message={`Are you sure you want to ban ${profile?.name}? They will be removed from discovery immediately.`}
        confirmLabel="Ban User"
        confirmVariant="danger"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Unban */}
      <ConfirmModal
        isOpen={confirm.type === 'unban'}
        title="Unban User"
        message={`Are you sure you want to unban ${profile?.name}?`}
        confirmLabel="Unban"
        confirmVariant="green"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Force Verify */}
      <ConfirmModal
        isOpen={confirm.type === 'verify'}
        title="Force Verify"
        message={`Mark ${profile?.name} as verified? This will approve any pending verification request.`}
        confirmLabel="Verify"
        confirmVariant="green"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Reject Verification */}
      <ConfirmModal
        isOpen={confirm.type === 'reject'}
        title="Reject Verification"
        message={`Reject the pending verification request for ${profile?.name}. Please provide a reason:`}
        confirmLabel="Reject"
        confirmVariant="danger"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      >
        <textarea
          className="reject-reason-textarea"
          placeholder="Reason for rejection..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </ConfirmModal>

      {/* Confirm: Grant Subscription */}
      <ConfirmModal
        isOpen={confirm.type === 'grant'}
        title="Grant Subscription"
        message={`Grant a ${grantPlan} subscription to ${profile?.name}?`}
        confirmLabel="Grant"
        confirmVariant="green"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Revoke Subscription */}
      <ConfirmModal
        isOpen={confirm.type === 'revoke'}
        title="Revoke Subscription"
        message={`Are you sure you want to revoke ${profile?.name}'s premium subscription? Access will be removed immediately.`}
        confirmLabel="Revoke"
        confirmVariant="danger"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Delete User */}
      <ConfirmModal
        isOpen={confirm.type === 'delete'}
        title="Delete User"
        message={`Are you sure you want to permanently delete ${profile?.name}? This will remove the user and ALL associated data (photos, matches, messages, reports, subscriptions). This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Confirm: Reset Limits */}
      <ConfirmModal
        isOpen={confirm.type === 'reset_limits'}
        title="Reset Limits"
        message={`Reset daily swipe and super like counters for ${profile?.name}?`}
        confirmLabel="Reset"
        confirmVariant="green"
        isLoading={confirm.isLoading}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirm({ type: null, isLoading: false })}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <img className="lightbox-img" src={lightboxUrl} alt="Full size" />
        </div>
      )}

      {/* Error */}
      <ErrorModal
        isOpen={!!error}
        title={error?.title ?? 'Error'}
        message={error?.message ?? ''}
        onClose={() => setError(null)}
      />
    </div>
  );
}
