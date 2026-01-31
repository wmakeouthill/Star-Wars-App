import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ChartDatum, ScatterDatum, RadarDatum, TreemapDatum } from '@/features/reports/types/reports.types';
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

const SCATTER_COLORS = [
  'rgba(53, 230, 255, 0.85)',
  'rgba(255, 61, 242, 0.85)',
  'rgba(151, 255, 61, 0.85)',
  'rgba(255, 212, 74, 0.85)',
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
  payload?: Array<{ value?: number | string; name?: string; payload?: Record<string, unknown> }>;
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

function scatterTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; x?: number; y?: number; z?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{data.name}</div>
      <div className={styles.tooltipValue}>
        {data.x != null && <div>X: {data.x.toLocaleString()}</div>}
        {data.y != null && <div>Y: {data.y.toLocaleString()}</div>}
        {data.z != null && <div>Size: {data.z.toLocaleString()}</div>}
      </div>
    </div>
  );
}

function radarTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { subject?: string; fullMark?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{item?.payload?.subject}</div>
      <div className={styles.tooltipValue}>{item?.value}</div>
    </div>
  );
}

function treemapTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; value?: number; category?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{data.category ? `${data.category} › ${data.name}` : data.name}</div>
      <div className={styles.tooltipValue}>{data.value?.toLocaleString()}</div>
    </div>
  );
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      setWidth((prev) => (prev === next ? prev : next));
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function DonutChart({ data, height = 260 }: Readonly<{ data: ChartDatum[]; height?: number }>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={styles.chart} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <PieChart width={chartWidth} height={chartHeight}>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} />
          <Tooltip
            content={tooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Legend />
        </PieChart>
      ) : null}
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
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={styles.chart} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <BarChart width={chartWidth} height={chartHeight} data={data} margin={{ left: 4, right: 12, top: 6, bottom: 34 }}>
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
          <Bar dataKey="value" fill="var(--neon-cyan)" radius={[10, 10, 0, 0]} />
        </BarChart>
      ) : null}
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
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={`${styles.chart} ${styles.chartTall}`} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <BarChart
          width={chartWidth}
          height={chartHeight}
          layout="vertical"
          data={data}
          margin={{ left: 12, right: 12, top: 6, bottom: 6 }}
        >
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
          <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="var(--neon-cyan)" />
        </BarChart>
      ) : null}
    </div>
  );
}

export function StackedBarChart({
  data,
  keys,
  height = 300,
}: Readonly<{
  data: Array<{ name: string } & Record<string, number | string>>;
  keys: string[];
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={styles.chart} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <BarChart width={chartWidth} height={chartHeight} data={data} margin={{ left: 4, right: 12, top: 6, bottom: 34 }}>
          <CartesianGrid stroke="rgba(110, 231, 255, 0.12)" strokeDasharray="4 4" />
          <XAxis
            dataKey="name"
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-22}
            textAnchor="end"
            height={66}
            tickFormatter={(value) => truncateLabel(String(value), 12)}
          />
          <YAxis stroke="rgba(199, 226, 255, 0.7)" tick={{ fontSize: 12 }} />
          <Tooltip wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
          <Legend />
          {keys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={index === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      ) : null}
    </div>
  );
}

export function ScatterPlotChart({
  data,
  xLabel = 'X',
  yLabel = 'Y',
  height = 320,
}: Readonly<{
  data: ScatterDatum[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  const maxZ = Math.max(...data.map((d) => d.z ?? 1), 1);

  return (
    <div ref={ref} className={`${styles.chart} ${styles.chartTall}`} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <ScatterChart width={chartWidth} height={chartHeight} margin={{ left: 12, right: 12, top: 16, bottom: 16 }}>
          <CartesianGrid stroke="rgba(110, 231, 255, 0.12)" strokeDasharray="4 4" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 11 }}
            label={{ value: xLabel, position: 'bottom', fill: 'rgba(199, 226, 255, 0.7)', fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 11 }}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'rgba(199, 226, 255, 0.7)', fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip
            content={scatterTooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
          <Scatter data={data} fill="var(--neon-cyan)">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SCATTER_COLORS[index % SCATTER_COLORS.length]}
                fillOpacity={0.7 + ((entry.z ?? 0) / maxZ) * 0.3}
              />
            ))}
          </Scatter>
        </ScatterChart>
      ) : null}
    </div>
  );
}

export function RadarChartComponent({
  data,
  height = 300,
}: Readonly<{
  data: RadarDatum[];
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={styles.chart} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <RadarChart cx="50%" cy="50%" outerRadius="70%" width={chartWidth} height={chartHeight} data={data}>
          <PolarGrid stroke="rgba(110, 231, 255, 0.25)" />
          <PolarAngleAxis
            dataKey="subject"
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 10, fill: 'rgba(199, 226, 255, 0.85)' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'auto']}
            stroke="rgba(199, 226, 255, 0.4)"
            tick={{ fontSize: 9, fill: 'rgba(199, 226, 255, 0.6)' }}
          />
          <Radar
            name="Valor"
            dataKey="value"
            stroke="var(--neon-cyan)"
            fill="var(--neon-cyan)"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            content={radarTooltipContent}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
          />
        </RadarChart>
      ) : null}
    </div>
  );
}

export function MultiRadarChart({
  data,
  series,
  height = 320,
}: Readonly<{
  data: RadarDatum[];
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={`${styles.chart} ${styles.chartTall}`} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <RadarChart cx="50%" cy="50%" outerRadius="65%" width={chartWidth} height={chartHeight} data={data}>
          <PolarGrid stroke="rgba(110, 231, 255, 0.25)" />
          <PolarAngleAxis
            dataKey="subject"
            stroke="rgba(199, 226, 255, 0.7)"
            tick={{ fontSize: 9, fill: 'rgba(199, 226, 255, 0.85)' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'auto']}
            stroke="rgba(199, 226, 255, 0.4)"
            tick={{ fontSize: 8, fill: 'rgba(199, 226, 255, 0.6)' }}
          />
          {series.map((s) => (
            <Radar
              key={s.key}
              name={s.name}
              dataKey={s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip wrapperStyle={{ zIndex: 9999 }} allowEscapeViewBox={{ x: true, y: true }} />
        </RadarChart>
      ) : null}
    </div>
  );
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  index?: number;
  depth?: number;
}

function TreemapContent({ x = 0, y = 0, width = 0, height = 0, name = '', index = 0, depth = 0 }: TreemapContentProps) {
  const showLabel = width > 50 && height > 24;
  const color = COLORS[index % COLORS.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="rgba(5, 7, 13, 0.8)"
        strokeWidth={2}
        rx={4}
        style={{ filter: depth === 1 ? 'brightness(0.85)' : 'none' }}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255, 255, 255, 0.95)"
          fontSize={Math.min(12, width / 8)}
          fontFamily="var(--font-pixel)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {truncateLabel(name, Math.floor(width / 7))}
        </text>
      )}
    </g>
  );
}

export function TreemapChart({
  data,
  height = 300,
}: Readonly<{
  data: TreemapDatum[];
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));

  return (
    <div ref={ref} className={styles.chart} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="rgba(5, 7, 13, 0.8)"
            content={<TreemapContent />}
          >
            <Tooltip
              content={treemapTooltipContent}
              wrapperStyle={{ zIndex: 9999 }}
              allowEscapeViewBox={{ x: true, y: true }}
            />
          </Treemap>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}

export function GaugeChart({
  value,
  max,
  label,
  height = 180,
}: Readonly<{
  value: number;
  max: number;
  label: string;
  height?: number;
}>) {
  const { ref, width } = useMeasuredWidth();
  const chartWidth = Math.max(0, width);
  const chartHeight = Math.max(0, Math.floor(height));
  
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const data = [
    { name: 'Valor', value: percentage },
    { name: 'Restante', value: 100 - percentage },
  ];

  return (
    <div ref={ref} className={styles.gaugeContainer} style={{ height: chartHeight }}>
      {chartWidth > 0 && chartHeight > 0 ? (
        <div className={styles.gaugeWrapper}>
          <PieChart width={chartWidth} height={chartHeight}>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill="var(--neon-cyan)" />
              <Cell fill="rgba(110, 231, 255, 0.15)" />
            </Pie>
          </PieChart>
          <div className={styles.gaugeCenter}>
            <div className={styles.gaugeValue}>{value.toLocaleString()}</div>
            <div className={styles.gaugeLabel}>{label}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MiniStat({
  label,
  value,
  subValue,
  trend,
  icon,
}: Readonly<{
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}>) {
  return (
    <div className={styles.miniStat}>
      {icon && <div className={styles.miniStatIcon}>{icon}</div>}
      <div className={styles.miniStatContent}>
        <div className={styles.miniStatLabel}>{label}</div>
        <div className={styles.miniStatValue}>
          {value}
          {trend && (
            <span className={`${styles.miniStatTrend} ${styles[`trend${trend.charAt(0).toUpperCase() + trend.slice(1)}`]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
            </span>
          )}
        </div>
        {subValue && <div className={styles.miniStatSub}>{subValue}</div>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={styles.statGrid}>{children}</div>;
}

