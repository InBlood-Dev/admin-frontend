import { useState } from 'react';

export default function SettingsPage() {
  const [discoveryEnabled, setDiscoveryEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [dailySwipeLimit, setDailySwipeLimit] = useState('50');
  const [dailySuperLikeLimit, setDailySuperLikeLimit] = useState('3');
  const [storyExpiry, setStoryExpiry] = useState('24');
  const [maxPhotos, setMaxPhotos] = useState('6');
  const [minAppVersion, setMinAppVersion] = useState('2.5.0');

  return (
    <div className="animate-in">
      <div className="page-top">
        <div>
          <h2>Settings</h2>
          <p>Manage app configuration and limits</p>
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
    </div>
  );
}
