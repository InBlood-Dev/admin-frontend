import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import settingsService from '../services/settings.service';
import planService from '../services/plan.service';
import type { AppSettings } from '../services/settings.service';
import type { AdminPlan, PlanFeature, CreatePlanPayload } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import ErrorModal from '../components/ErrorModal';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    (err instanceof Error ? err.message : 'Something went wrong')
  );
}

const EMPTY_PLAN: CreatePlanPayload = {
  plan_key: '',
  name: '',
  price: 0,
  original_price: null,
  currency: 'INR',
  duration_days: 30,
  period_label: '/month',
  badge: null,
  badge_color: null,
  discount_label: null,
  features: [{ text: '', included: true }],
  is_active: true,
  sort_order: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Settings form state
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dailySwipeLimit, setDailySwipeLimit] = useState('50');
  const [dailySuperLikeLimit, setDailySuperLikeLimit] = useState('3');
  const [storyExpiry, setStoryExpiry] = useState('24');
  const [maxPhotos, setMaxPhotos] = useState('6');
  const [minAppVersion, setMinAppVersion] = useState('1.0.0');

  // Plans state
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [planForm, setPlanForm] = useState<CreatePlanPayload>({ ...EMPTY_PLAN });
  const [planSaving, setPlanSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const applySettings = useCallback((s: AppSettings) => {
    setSettings(s);
    setDiscoveryEnabled(s.discovery_enabled);
    setMaintenanceMode(s.maintenance_mode);
    setForceUpdate(s.force_update_enabled);
    setDailySwipeLimit(String(s.daily_swipe_limit));
    setDailySuperLikeLimit(String(s.daily_super_like_limit));
    setStoryExpiry(String(s.story_expiry_hours));
    setMaxPhotos(String(s.max_photos));
    setMinAppVersion(s.min_app_version);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await settingsService.getSettings();
        applySettings(data);
      } catch (err) {
        setError({ title: 'Failed to load settings', message: extractErrorMessage(err) });
      } finally {
        setLoading(false);
      }
    })();
  }, [applySettings]);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setPlansLoading(true);
    try {
      const data = await planService.listPlans();
      setPlans(data);
    } catch (err) {
      setError({ title: 'Failed to load plans', message: extractErrorMessage(err) });
    } finally {
      setPlansLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await settingsService.updateSettings({
        maintenance_mode: maintenanceMode,
        discovery_enabled: discoveryEnabled,
        force_update_enabled: forceUpdate,
        min_app_version: minAppVersion,
        daily_swipe_limit: parseInt(dailySwipeLimit, 10) || 50,
        daily_super_like_limit: parseInt(dailySuperLikeLimit, 10) || 3,
        story_expiry_hours: parseInt(storyExpiry, 10) || 24,
        max_photos: parseInt(maxPhotos, 10) || 6,
      });
      applySettings(updated);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError({ title: 'Failed to save settings', message: extractErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = settings
    ? (discoveryEnabled !== settings.discovery_enabled ||
       maintenanceMode !== settings.maintenance_mode ||
       forceUpdate !== settings.force_update_enabled ||
       minAppVersion !== settings.min_app_version ||
       dailySwipeLimit !== String(settings.daily_swipe_limit) ||
       dailySuperLikeLimit !== String(settings.daily_super_like_limit) ||
       storyExpiry !== String(settings.story_expiry_hours) ||
       maxPhotos !== String(settings.max_photos))
    : false;

  // ─── Plan CRUD ─────────────────────────────────────────────────────

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm({ ...EMPTY_PLAN, sort_order: plans.length });
    setPlanModalOpen(true);
  }

  function openEditPlan(plan: AdminPlan) {
    setEditingPlan(plan);
    setPlanForm({
      plan_key: plan.plan_key,
      name: plan.name,
      price: plan.price,
      original_price: plan.original_price,
      currency: plan.currency,
      duration_days: plan.duration_days,
      period_label: plan.period_label,
      badge: plan.badge,
      badge_color: plan.badge_color,
      discount_label: plan.discount_label,
      features: plan.features.length > 0 ? [...plan.features] : [{ text: '', included: true }],
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setPlanModalOpen(true);
  }

  async function handleSavePlan() {
    setPlanSaving(true);
    try {
      const cleanedForm = {
        ...planForm,
        features: planForm.features.filter(f => f.text.trim() !== ''),
      };
      if (cleanedForm.features.length === 0) {
        setError({ title: 'Validation Error', message: 'At least one feature is required' });
        setPlanSaving(false);
        return;
      }
      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, cleanedForm);
      } else {
        await planService.createPlan(cleanedForm);
      }
      setPlanModalOpen(false);
      await fetchPlans();
    } catch (err) {
      setError({ title: 'Failed to save plan', message: extractErrorMessage(err) });
    } finally {
      setPlanSaving(false);
    }
  }

  async function handleDeletePlan() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await planService.deletePlan(deleteConfirm.id);
      setDeleteConfirm(null);
      await fetchPlans();
    } catch (err) {
      setError({ title: 'Failed to delete plan', message: extractErrorMessage(err) });
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePlan(plan: AdminPlan) {
    try {
      await planService.togglePlan(plan.id);
      await fetchPlans();
    } catch (err) {
      setError({ title: 'Failed to toggle plan', message: extractErrorMessage(err) });
    }
  }

  async function handleMovePlan(index: number, direction: 'up' | 'down') {
    const newPlans = [...plans];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newPlans.length) return;
    [newPlans[index], newPlans[swapIdx]] = [newPlans[swapIdx], newPlans[index]];
    setPlans(newPlans);
    try {
      await planService.reorderPlans(newPlans.map(p => p.id));
    } catch (err) {
      setError({ title: 'Failed to reorder plans', message: extractErrorMessage(err) });
      await fetchPlans();
    }
  }

  // ─── Feature helpers ───────────────────────────────────────────────

  function updateFeature(index: number, field: keyof PlanFeature, value: string | boolean) {
    const updated = [...planForm.features];
    updated[index] = { ...updated[index], [field]: value };
    setPlanForm({ ...planForm, features: updated });
  }

  function addFeature() {
    setPlanForm({ ...planForm, features: [...planForm.features, { text: '', included: true }] });
  }

  function removeFeature(index: number) {
    const updated = planForm.features.filter((_, i) => i !== index);
    setPlanForm({ ...planForm, features: updated.length > 0 ? updated : [{ text: '', included: true }] });
  }

  // ─── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-top">
          <div>
            <h2>Settings</h2>
            <p>Loading configuration...</p>
          </div>
        </div>
        <div className="settings-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="settings-card" key={i}>
              <div className="skeleton" style={{ width: 120, height: 20, borderRadius: 6, marginBottom: 16 }} />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="settings-row">
                  <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: 48, height: 24, borderRadius: 12 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Settings</h2>
          <p>Manage app configuration and limits</p>
        </div>
        <div className="table-header-actions">
          {saved && <span style={{ fontSize: 12, color: 'var(--green)', marginRight: 12 }}>Settings saved</span>}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* General */}
        <div className="settings-card">
          <h3>General</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Discovery</div>
              <div className="settings-row-desc">Allow users to discover each other</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={discoveryEnabled} onChange={() => setDiscoveryEnabled(!discoveryEnabled)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Maintenance Mode</div>
              <div className="settings-row-desc">Show maintenance screen to all users</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Force Update</div>
              <div className="settings-row-desc">Require users to update the app</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={forceUpdate} onChange={() => setForceUpdate(!forceUpdate)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Minimum App Version</div>
              <div className="settings-row-desc">Required version for force update</div>
            </div>
            <input
              className="form-input"
              style={{ width: 100, textAlign: 'right', padding: '6px 10px', fontSize: 13 }}
              value={minAppVersion}
              onChange={(e) => setMinAppVersion(e.target.value)}
            />
          </div>
        </div>

        {/* Limits */}
        <div className="settings-card">
          <h3>Limits</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Daily Swipe Limit</div>
              <div className="settings-row-desc">Max swipes per day (free users)</div>
            </div>
            <input
              className="form-input"
              style={{ width: 70, textAlign: 'right', padding: '6px 10px', fontSize: 13 }}
              type="number"
              value={dailySwipeLimit}
              onChange={(e) => setDailySwipeLimit(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Daily Super Like Limit</div>
              <div className="settings-row-desc">Max super likes per day (free users)</div>
            </div>
            <input
              className="form-input"
              style={{ width: 70, textAlign: 'right', padding: '6px 10px', fontSize: 13 }}
              type="number"
              value={dailySuperLikeLimit}
              onChange={(e) => setDailySuperLikeLimit(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Story Expiry (hours)</div>
              <div className="settings-row-desc">How long stories stay visible</div>
            </div>
            <input
              className="form-input"
              style={{ width: 70, textAlign: 'right', padding: '6px 10px', fontSize: 13 }}
              type="number"
              value={storyExpiry}
              onChange={(e) => setStoryExpiry(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Max Photos</div>
              <div className="settings-row-desc">Maximum photos per profile</div>
            </div>
            <input
              className="form-input"
              style={{ width: 70, textAlign: 'right', padding: '6px 10px', fontSize: 13 }}
              type="number"
              value={maxPhotos}
              onChange={(e) => setMaxPhotos(e.target.value)}
            />
          </div>
        </div>

        {/* Premium Plans - Dynamic */}
        <div className="settings-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ margin: 0 }}>Premium Plans</h3>
            <button className="btn btn-primary" onClick={openCreatePlan} style={{ fontSize: 12, padding: '6px 14px' }}>
              <Plus size={14} style={{ marginRight: 4 }} />
              Add Plan
            </button>
          </div>

          {plansLoading ? (
            <div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="settings-row">
                  <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No plans configured. Add your first plan to get started.
            </div>
          ) : (
            <div>
              {plans.map((plan, index) => (
                <div key={plan.id} className="settings-row" style={{ gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: 2, lineHeight: 1 }}
                        onClick={() => handleMovePlan(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: 2, lineHeight: 1 }}
                        onClick={() => handleMovePlan(index, 'down')}
                        disabled={index === plans.length - 1}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="settings-row-label">{plan.name}</div>
                        {plan.badge && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: plan.badge_color ? `${plan.badge_color}22` : 'var(--accent-soft)',
                            color: plan.badge_color || 'var(--accent)',
                          }}>
                            {plan.badge}
                          </span>
                        )}
                        {!plan.is_active && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-hover)',
                            color: 'var(--text-muted)',
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="settings-row-desc">
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{plan.plan_key}</span>
                        {' '}&middot;{' '}
                        {plan.duration_days} days
                        {' '}&middot;{' '}
                        {plan.features.filter(f => f.included).length} perks
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {plan.currency === 'INR' ? '\u20B9' : plan.currency}{plan.price.toLocaleString('en-IN')}{plan.period_label}
                      </div>
                      {plan.original_price != null && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {plan.currency === 'INR' ? '\u20B9' : plan.currency}{plan.original_price.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={plan.is_active} onChange={() => handleTogglePlan(plan)} />
                      <span className="toggle-slider" />
                    </label>
                    <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => openEditPlan(plan)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--red)' }} onClick={() => setDeleteConfirm(plan)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infrastructure */}
        <div className="settings-card">
          <h3>Infrastructure</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">API Server</div>
              <div className="settings-row-desc">Backend hosting</div>
            </div>
            <div className="settings-row-value">Render.com</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Media Storage</div>
              <div className="settings-row-desc">Photos, videos, stories</div>
            </div>
            <div className="settings-row-value">Cloudinary</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Messaging</div>
              <div className="settings-row-desc">Real-time chat infrastructure</div>
            </div>
            <div className="settings-row-value">Firebase</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Payments</div>
              <div className="settings-row-desc">Payment gateway</div>
            </div>
            <div className="settings-row-value">Cashfree</div>
          </div>
        </div>
      </div>

      {/* ─── Plan Create/Edit Modal ─────────────────────────────────── */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Plan'}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row: Key + Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Plan Key</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="e.g. monthly, annual, premium_plus"
                value={planForm.plan_key}
                onChange={(e) => setPlanForm({ ...planForm, plan_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                disabled={!!editingPlan}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Display Name</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="e.g. Premium, Premium+"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              />
            </div>
          </div>

          {/* Row: Price + Original Price + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Price</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                type="number"
                min={0}
                placeholder="999"
                value={planForm.price || ''}
                onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Original Price</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                type="number"
                min={0}
                placeholder="1499 (optional, for strikethrough)"
                value={planForm.original_price ?? ''}
                onChange={(e) => setPlanForm({ ...planForm, original_price: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Currency</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="INR"
                maxLength={3}
                value={planForm.currency || 'INR'}
                onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Row: Duration + Period Label */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Duration (days)</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                type="number"
                min={1}
                placeholder="30"
                value={planForm.duration_days || ''}
                onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Period Label</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="/month, /year, /week"
                value={planForm.period_label}
                onChange={(e) => setPlanForm({ ...planForm, period_label: e.target.value })}
              />
            </div>
          </div>

          {/* Row: Badge + Badge Color + Discount Label */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Badge Text</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="POPULAR (optional)"
                value={planForm.badge || ''}
                onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value || null })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="color"
                  value={planForm.badge_color || '#E53935'}
                  onChange={(e) => setPlanForm({ ...planForm, badge_color: e.target.value })}
                  style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                />
                <input
                  className="form-input"
                  style={{ width: '100%', padding: '8px 6px', fontSize: 11, fontFamily: 'monospace' }}
                  placeholder="#E53935"
                  value={planForm.badge_color || ''}
                  onChange={(e) => setPlanForm({ ...planForm, badge_color: e.target.value || null })}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Discount Label</label>
              <input
                className="form-input"
                style={{ width: '100%', padding: '8px 10px', fontSize: 13 }}
                placeholder="SAVE 33% (optional)"
                value={planForm.discount_label || ''}
                onChange={(e) => setPlanForm({ ...planForm, discount_label: e.target.value || null })}
              />
            </div>
          </div>

          {/* Features / Perks */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Features / Perks</label>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px' }}
                onClick={addFeature}
              >
                <Plus size={12} style={{ marginRight: 2 }} /> Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {planForm.features.map((feature, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="toggle" style={{ width: 32, height: 18, flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={feature.included}
                      onChange={(e) => updateFeature(i, 'included', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    placeholder="e.g. Unlimited likes"
                    value={feature.text}
                    onChange={(e) => updateFeature(i, 'text', e.target.value)}
                  />
                  <button
                    className="btn btn-ghost"
                    style={{ padding: 4, color: 'var(--text-muted)' }}
                    onClick={() => removeFeature(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Active</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Show this plan to users in the app</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={planForm.is_active ?? true}
                onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-ghost" onClick={() => setPlanModalOpen(false)} disabled={planSaving}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSavePlan}
              disabled={planSaving || !planForm.plan_key || !planForm.name || !planForm.price || !planForm.duration_days}
            >
              {planSaving ? <span className="btn-spinner" /> : null}
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Confirmation ────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Plan"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone. Existing subscriptions using this plan will not be affected.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={deleting}
        onConfirm={handleDeletePlan}
        onCancel={() => setDeleteConfirm(null)}
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
