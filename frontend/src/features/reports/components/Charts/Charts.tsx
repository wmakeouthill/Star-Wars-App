import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartDatum } from '@/features/reports/types/reports.types';
import styles from './Charts.module.css';

const COLORS = [
  'var(--neon-cyan)',
  'var(--neon-magenta)',
  'var(--neon-lime)',
  'var(--neon-amber)',
  'rgba(53, 230, 255, 0.55)',
  'rgba(255, 61, 242, 0.5)',
  'rgba(151, 255, 61, 0.45)',
  'rgba(255, 212, 74, 0.45)',
  'rgba(199, 226, 255, 0.35)',
  'rgba(199, 226, 255, 0.22)',
];

function truncateLabel(value: string | undefined, maxChars: number) {
  const text = (value ?? '').trim();
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

function tooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      <div className={styles.tooltipValue}>{value}</div>
    </div>
  );
}

export function DonutChart({ data, height = 260 }: Readonly<{ data: ChartDatum[]; height?: number }>) {
  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={tooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VerticalBarChart({
  data,
  height = 260,
}: Readonly<{
  data: ChartDatum[];
  height?: number;
}>) {
  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ left: 4, right: 12, top: 6, bottom: 34 }}>
          <CartesianGrid stroke="rgba(110, 231, 255, 0.12)" strokeDasharray="4 4" />
          <XAxis
            dataKey="name"
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-22}
            textAnchor="end"
            height={66}
            tickFormatter={(value) => truncateLabel(String(value), 16)}
          />
          <YAxis stroke="rgba(199, 226, 255, 0.7)" tick={{ fontSize: 12 }} />
          <Tooltip
            content={tooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar dataKey="value" fill="var(--neon-cyan)" radius={[10, 10, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  height = 320,
}: Readonly<{
  data: ChartDatum[];
  height?: number;
}>) {
  return (
    <div className={`${styles.chart} ${styles.chartTall}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart layout="vertical" data={data} margin={{ left: 12, right: 12, top: 6, bottom: 6 }}>
          <CartesianGrid stroke="rgba(110, 231, 255, 0.12)" strokeDasharray="4 4" />
          <XAxis type="number" stroke="rgba(199, 226, 255, 0.7)" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={220}
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => truncateLabel(String(value), 28)}
          />
          <Tooltip
            content={tooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Bar dataKey="value" radius={[0, 10, 10, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

