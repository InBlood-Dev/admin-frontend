import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { HourPoint, HourlyCategorical } from '../types';

// Shared palette for hour-of-day charts; callers may override per-key.
const HOUR_PALETTE = ['#4D9FFF', '#FF4D4D', '#4DFF88', '#FFB74D', '#CF6EFF', '#4DE8E0', '#FF6E40', '#90A4AE'];

const TOOLTIP_STYLE = { background: '#0F1115', border: '1px solid #1F2937', borderRadius: 6, fontSize: 12 };
const AXIS_TICK = { fill: '#888', fontSize: 11 };

function colorFor(key: string, idx: number, colorMap?: Record<string, string>): string {
  return colorMap?.[key] ?? HOUR_PALETTE[idx % HOUR_PALETTE.length];
}

/**
 * Single- or multi-metric hour-of-day series (X = hour 00:00–23:00).
 * Used for signups, revenue, events/users/sessions, etc.
 */
export function HourlySeriesChart({
  data, series, type = 'area', height = 220, valuePrefix = '',
}: {
  data: HourPoint[];
  series: Array<{ key: string; color: string; name?: string }>;
  type?: 'area' | 'bar';
  height?: number;
  valuePrefix?: string;
}) {
  const fmt = (v: unknown) => `${valuePrefix}${v}`;
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`hourGrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmt} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name ?? s.key}
                stroke={s.color} strokeWidth={2.5} fill={`url(#hourGrad-${s.key})`}
                animationDuration={1200} animationEasing="ease-out" />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={fmt} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name ?? s.key} fill={s.color}
                radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Stacked categorical hour-of-day chart (one series per `cat.keys` entry).
 * Used for the hour view of pie/treemap charts (gender, age, devices, ...).
 */
export function HourlyStackedChart({
  cat, type = 'bar', height = 220, colorMap,
}: {
  cat: HourlyCategorical;
  type?: 'area' | 'bar';
  height?: number;
  colorMap?: Record<string, string>;
}) {
  const keys = cat?.keys ?? [];
  const data = cat?.data ?? [];
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a"
                stroke={colorFor(k, i, colorMap)} fill={colorFor(k, i, colorMap)} fillOpacity={0.65}
                animationDuration={1200} animationEasing="ease-out" />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={colorFor(k, i, colorMap)}
                animationDuration={1200} animationEasing="ease-out" />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
