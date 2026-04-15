import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DateRange } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  const t = day.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

// ── Presets ──────────────────────────────────────────────────────────────────

interface PresetRange { label: string; from: Date; to: Date }

function getPresets(): PresetRange[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d7  = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const d90 = new Date(today); d90.setDate(today.getDate() - 89);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const thisYearStart  = new Date(now.getFullYear(), 0, 1);
  return [
    { label: 'Today',        from: today,          to: today },
    { label: 'Yesterday',    from: yesterday,       to: yesterday },
    { label: 'Last 7 days',  from: d7,              to: today },
    { label: 'Last 30 days', from: d30,             to: today },
    { label: 'Last 90 days', from: d90,             to: today },
    { label: 'This Month',   from: thisMonthStart,  to: today },
    { label: 'Last Month',   from: lastMonthStart,  to: lastMonthEnd },
    { label: 'This Year',    from: thisYearStart,   to: today },
  ];
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────

function CalendarMonth({ year, month, from, to, hovered, onSelect, onHover }: {
  year: number; month: number;
  from: Date | null; to: Date | null; hovered: Date | null;
  onSelect: (d: Date) => void; onHover: (d: Date | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const effectiveTo = to || hovered;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(<div className="cal-cell empty" key={`e${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isFrom   = isSameDay(date, from);
    const isTo     = isSameDay(date, effectiveTo);
    const inRange  = isInRange(date, from, effectiveTo);
    const isToday  = isSameDay(date, today);
    const isFuture = date > today;

    let cls = 'cal-cell';
    if (isFrom || isTo) cls += ' selected';
    if (inRange && !isFrom && !isTo) cls += ' in-range';
    if (isToday)  cls += ' today';
    if (isFuture) cls += ' disabled';
    if (isFrom && effectiveTo && !isSameDay(from, effectiveTo)) cls += ' range-start';
    if (isTo   && from        && !isSameDay(from, effectiveTo)) cls += ' range-end';

    cells.push(
      <button className={cls} key={d} disabled={isFuture}
        onClick={() => onSelect(date)}
        onMouseEnter={() => onHover(date)}
        onMouseLeave={() => onHover(null)}
      >{d}</button>
    );
  }

  return (
    <div className="cal-month">
      <div className="cal-month-title">{monthNames[month]} {year}</div>
      <div className="cal-weekdays">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(w => <div key={w}>{w}</div>)}
      </div>
      <div className="cal-grid">{cells}</div>
    </div>
  );
}

// ── DateRangePicker ───────────────────────────────────────────────────────────

export default function DateRangePicker({ value, onChange }: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [pickFrom, setPickFrom]   = useState<Date | null>(value.from ? new Date(value.from) : null);
  const [pickTo, setPickTo]       = useState<Date | null>(value.to   ? new Date(value.to)   : null);
  const [hovered, setHovered]     = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [popupStyle, setPopupStyle]     = useState<React.CSSProperties>({});
  const ref        = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1);

  const secondMonth = viewMonth + 1 > 11 ? 0  : viewMonth + 1;
  const secondYear  = viewMonth + 1 > 11 ? viewYear + 1 : viewYear;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target  = e.target as Node;
      const popupEl = document.getElementById('drp-portal-popup');
      if (
        ref.current && !ref.current.contains(target) &&
        (!popupEl || !popupEl.contains(target))
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync internal state when value prop changes (e.g. external "use dashboard range")
  useEffect(() => {
    setPickFrom(value.from ? new Date(value.from) : null);
    setPickTo  (value.to   ? new Date(value.to)   : null);
  }, [value.from, value.to]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function handleSelect(d: Date) {
    if (!selectingEnd) {
      setPickFrom(d); setPickTo(null); setSelectingEnd(true);
    } else {
      if (d < pickFrom!) {
        setPickTo(pickFrom); setPickFrom(d);
      } else {
        setPickTo(d);
      }
      setSelectingEnd(false);
    }
  }

  function apply() {
    if (pickFrom && pickTo) {
      onChange({ from: toYMD(pickFrom), to: toYMD(pickTo) });
    } else if (pickFrom) {
      onChange({ from: toYMD(pickFrom), to: toYMD(pickFrom) });
    }
    setOpen(false);
  }

  function clear() {
    setPickFrom(null); setPickTo(null); setSelectingEnd(false);
    onChange({ from: null, to: null });
    setOpen(false);
  }

  function applyPreset(p: PresetRange) {
    setPickFrom(p.from); setPickTo(p.to);
    onChange({ from: toYMD(p.from), to: toYMD(p.to) });
    setOpen(false);
  }

  const hasRange = value.from && value.to;
  const presets  = getPresets();
  const triggerLabel = hasRange
    ? `${formatDateShort(new Date(value.from!))} — ${formatDateShort(new Date(value.to!))}`
    : 'All Time';

  function openPicker() {
    if (!open && triggerRef.current) {
      const rect       = triggerRef.current.getBoundingClientRect();
      const popupWidth = 650;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      setPopupStyle({ position: 'fixed', top: rect.bottom + 6, left, zIndex: 9999 });
    }
    setOpen(!open);
  }

  const popup = open && (
    <div id="drp-portal-popup" className="drp-popup" style={popupStyle}>
      {/* Presets sidebar */}
      <div className="drp-presets">
        <div className="drp-presets-title">Quick Select</div>
        {presets.map(p => (
          <button key={p.label} className="drp-preset-btn" onClick={() => applyPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar area */}
      <div className="drp-calendars">
        <div className="drp-nav">
          <button onClick={prevMonth}><ChevronLeft size={16} /></button>
          <button onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>

        <div className="drp-months">
          <CalendarMonth
            year={viewYear}  month={viewMonth}
            from={pickFrom}  to={pickTo}
            hovered={selectingEnd ? hovered : null}
            onSelect={handleSelect} onHover={setHovered}
          />
          <CalendarMonth
            year={secondYear} month={secondMonth}
            from={pickFrom}   to={pickTo}
            hovered={selectingEnd ? hovered : null}
            onSelect={handleSelect} onHover={setHovered}
          />
        </div>

        {/* Footer */}
        <div className="drp-footer">
          <div className="drp-selection">
            {pickFrom ? formatDateShort(pickFrom) : '—'}
            <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>to</span>
            {pickTo ? formatDateShort(pickTo) : '—'}
          </div>
          <div className="drp-actions">
            <button className="drp-btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
            <button className="drp-btn-apply" onClick={apply} disabled={!pickFrom}>Apply</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="date-range-picker" ref={ref}>
      <button className="drp-trigger" ref={triggerRef} onClick={openPicker}>
        <Calendar size={14} />
        <span>{triggerLabel}</span>
        {hasRange && (
          <span className="drp-clear" onClick={(e) => { e.stopPropagation(); clear(); }}>
            <X size={12} />
          </span>
        )}
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {createPortal(popup, document.body)}
    </div>
  );
}
