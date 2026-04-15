import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';
import type { DateRange } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDateRange: DateRange;
}

const SECTIONS = [
  { key: 'overview',     label: 'Overview',              desc: 'Stats, User Growth, Revenue' },
  { key: 'demographics', label: 'Demographics',          desc: 'Gender, Age, Location, Orientation' },
  { key: 'premium',      label: 'Premium vs Free',       desc: 'Comparison, Growth, Age & Gender split' },
  { key: 'analytics',    label: 'Analytics — PostHog',   desc: 'Events, Pages, Sessions, Devices' },
  { key: 'external',     label: 'Analytics — External',  desc: 'Play Store, Search Console' },
  { key: 'uptime',       label: 'Uptime',                desc: 'Hourly uptime timeline' },
];

const GENDER_OPTIONS = [
  { value: 'all',        label: 'All genders' },
  { value: 'Man',        label: 'Man' },
  { value: 'Woman',      label: 'Woman' },
  { value: 'Non-Binary', label: 'Non-Binary' },
  { value: 'Other',      label: 'Other' },
];

const USER_TYPE_OPTIONS = [
  { value: 'all',     label: 'All users' },
  { value: 'premium', label: 'Premium only' },
  { value: 'free',    label: 'Free only' },
];

/** Read a Blob as text and attempt to parse a JSON { message } field from it. */
async function readBlobError(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    const json = JSON.parse(text) as { message?: string };
    return json?.message ?? null;
  } catch {
    return null;
  }
}

export default function ExportModal({ isOpen, onClose, currentDateRange }: Props) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(SECTIONS.map(s => s.key))
  );
  const [from, setFrom] = useState(currentDateRange.from ?? '');
  const [to, setTo]     = useState(currentDateRange.to ?? '');
  const [gender, setGender]     = useState('all');
  const [userType, setUserType] = useState('all');
  const [ageMin, setAgeMin]     = useState('');
  const [ageMax, setAgeMax]     = useState('');
  const [exporting, setExporting]   = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync date range from dashboard whenever the modal opens, and clear stale errors.
  useEffect(() => {
    if (isOpen) {
      setFrom(currentDateRange.from ?? '');
      setTo(currentDateRange.to ?? '');
      setExportError(null);
    }
  }, [isOpen, currentDateRange.from, currentDateRange.to]);

  function toggleSection(key: string) {
    setSelectedSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll()  { setSelectedSections(new Set(SECTIONS.map(s => s.key))); }
  function selectNone() { setSelectedSections(new Set()); }

  function useDashboardRange() {
    setFrom(currentDateRange.from ?? '');
    setTo(currentDateRange.to ?? '');
  }

  async function handleExport() {
    if (selectedSections.size === 0) {
      setExportError('Select at least one section to export.');
      return;
    }
    setExportError(null);
    setExporting(true);

    try {
      const params = new URLSearchParams();
      params.set('sections', [...selectedSections].join(','));
      if (from)           params.set('from', from);
      if (to)             params.set('to', to);
      if (gender !== 'all')   params.set('gender', gender);
      if (userType !== 'all') params.set('user_type', userType);
      if (ageMin)         params.set('age_min', ageMin);
      if (ageMax)         params.set('age_max', ageMax);

      const resp = await api.get(`/admin/export?${params.toString()}`, {
        responseType: 'blob',
        timeout: 120000,
      });

      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inblood-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: unknown) {
      // When responseType is 'blob', axios gives us the error body as a Blob.
      // Read it to extract the JSON { message } from the backend.
      const axiosErr = err as { response?: { data?: unknown; status?: number } };
      let message = 'Export failed. Please try again.';

      if (axiosErr?.response?.data instanceof Blob) {
        const backendMsg = await readBlobError(axiosErr.response.data);
        if (backendMsg) message = backendMsg;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setExportError(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Export Dashboard Data" width={560}>
      <div className="export-modal">

        {/* Sections */}
        <div className="export-section">
          <div className="export-section-header">
            <span>What to export</span>
            <div className="export-select-links">
              <button onClick={selectAll}>All</button>
              <span>·</span>
              <button onClick={selectNone}>None</button>
            </div>
          </div>
          <div className="export-checkbox-grid">
            {SECTIONS.map(s => (
              <label key={s.key} className={`export-checkbox-item ${selectedSections.has(s.key) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedSections.has(s.key)}
                  onChange={() => toggleSection(s.key)}
                />
                <div className="export-checkbox-text">
                  <span className="export-checkbox-label">{s.label}</span>
                  <span className="export-checkbox-desc">{s.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="export-section">
          <div className="export-section-header">
            <span>Date range</span>
            <button onClick={useDashboardRange} className="export-link-btn">
              Use dashboard range
            </button>
          </div>
          <div className="export-date-row">
            <div className="export-date-field">
              <label>From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="export-date-input"
                max={to || undefined}
              />
            </div>
            <div className="export-date-sep">→</div>
            <div className="export-date-field">
              <label>To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="export-date-input"
                min={from || undefined}
              />
            </div>
            {(from || to) && (
              <button className="export-clear-date" onClick={() => { setFrom(''); setTo(''); }}>
                Clear
              </button>
            )}
          </div>
          {!from && !to && (
            <p className="export-hint">No date range selected — all-time data will be exported.</p>
          )}
        </div>

        {/* Filters */}
        <div className="export-section">
          <div className="export-section-header"><span>Filters</span></div>
          <div className="export-filters-row">
            <div className="export-filter-field">
              <label>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="export-select">
                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="export-filter-field">
              <label>User Type</label>
              <select value={userType} onChange={e => setUserType(e.target.value)} className="export-select">
                {USER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="export-filter-field export-age-field">
              <label>Age Range</label>
              <div className="export-age-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={ageMin}
                  min={18}
                  max={100}
                  onChange={e => setAgeMin(e.target.value)}
                  className="export-number-input"
                />
                <span>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={ageMax}
                  min={18}
                  max={100}
                  onChange={e => setAgeMax(e.target.value)}
                  className="export-number-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {exportError && (
          <div className="export-error">{exportError}</div>
        )}

        {/* Footer */}
        <div className="export-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={exporting}>
            Cancel
          </button>
          <button
            className="btn btn-primary export-btn"
            onClick={handleExport}
            disabled={exporting || selectedSections.size === 0}
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="export-spinner" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={14} />
                Export (.xlsx)
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
