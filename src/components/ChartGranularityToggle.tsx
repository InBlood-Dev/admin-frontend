import { Clock } from 'lucide-react';

export type ChartGranularity = 'default' | 'hour';

/**
 * Per-chart segmented control to switch a chart between its default time view
 * and an hour-of-day (00:00–23:00) view. Rendered inside `.chart-card-header`
 * in place of (or beside) the static `.chart-badge`.
 */
export default function ChartGranularityToggle({
  value,
  onChange,
  defaultLabel = 'Daily',
}: {
  value: ChartGranularity;
  onChange: (g: ChartGranularity) => void;
  defaultLabel?: string;
}) {
  return (
    <div className="chart-gran-toggle" role="group" aria-label="Chart time granularity">
      <button
        type="button"
        className={value === 'default' ? 'active' : ''}
        onClick={() => onChange('default')}
      >
        {defaultLabel}
      </button>
      <button
        type="button"
        className={value === 'hour' ? 'active' : ''}
        onClick={() => onChange('hour')}
        title="Show the average pattern across the day — at what hour this metric is high or low"
      >
        <Clock size={11} />
        <span>By hour</span>
      </button>
    </div>
  );
}
