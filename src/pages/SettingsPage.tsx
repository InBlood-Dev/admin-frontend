import { useState, useEffect, useCallback, useRef } from 'react';
import settingsService from '../services/settings.service';
import type { AppSettings } from '../services/settings.service';
import ErrorModal from '../components/ErrorModal';

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { errors?: { message: string }[]; message?: string } } };
  return (
    e?.response?.data?.errors?.[0]?.message ||
    e?.response?.data?.message ||
    (err instanceof Error ? err.message : 'Something went wrong')
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Local form state
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dailySwipeLimit, setDailySwipeLimit] = useState('50');
  const [dailySuperLikeLimit, setDailySuperLikeLimit] = useState('3');
  const [storyExpiry, setStoryExpiry] = useState('24');
  const [maxPhotos, setMaxPhotos] = useState('6');
  const [minAppVersion, setMinAppVersion] = useState('1.0.0');

  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

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

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-top">
          <div>
            <h2>Settings</h2>
            <p>Loading configuration…</p>
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="settings-grid">
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

        <div className="settings-card">
          <h3>Premium Plans</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Premium Monthly</div>
              <div className="settings-row-desc">Unlimited swipes, see likes</div>
            </div>
            <div className="settings-row-value">₹499/mo</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Premium Annual</div>
              <div className="settings-row-desc">Same as monthly, billed yearly</div>
            </div>
            <div className="settings-row-value">₹3,999/yr</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Premium Plus Monthly</div>
              <div className="settings-row-desc">All premium + priority, boosts</div>
            </div>
            <div className="settings-row-value">₹999/mo</div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Premium Plus Annual</div>
              <div className="settings-row-desc">All plus features, billed yearly</div>
            </div>
            <div className="settings-row-value">₹7,999/yr</div>
          </div>
        </div>

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
