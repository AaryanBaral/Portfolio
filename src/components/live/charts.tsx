"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Validated against the #0d0f12 surface (see CLAUDE.md → Data visualisation). */
export const SERIES = {
  served: "#1f9fd1",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

const GRID = "rgb(255 255 255 / 0.06)";
const PAD = { top: 8, right: 8, bottom: 18, left: 36 };

function useWidth<E extends HTMLElement>() {
  const ref = useRef<E>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Rounds up to 1/2/5 × 10ⁿ so gridlines land on readable values. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function Frame({ title, legend, children }: { title: string; legend?: ReactNode; children: ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {legend}
      </figcaption>
      {children}
    </figure>
  );
}

function Axes({ width, height, max, format }: { width: number; height: number; max: number; format: (v: number) => string }) {
  const plotH = height - PAD.top - PAD.bottom;
  return (
    <g aria-hidden>
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + plotH * (1 - t);
        return (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke={GRID} />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" className="fill-muted font-mono text-[9px]">
              {format(max * t)}
            </text>
          </g>
        );
      })}
      <text x={PAD.left} y={height - 4} className="fill-muted font-mono text-[9px]">
        −30s
      </text>
      <text x={width - PAD.right} y={height - 4} textAnchor="end" className="fill-muted font-mono text-[9px]">
        now
      </text>
    </g>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const flip = x > width - 150;
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 min-w-32 rounded-lg border border-border bg-surface-raised/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      style={{ left: flip ? undefined : x + 12, right: flip ? width - x + 12 : undefined }}
    >
      {children}
    </div>
  );
}

export type StackSeries = { key: string; label: string; color: string; values: number[] };

/** Per-second stacked bars with a hover breakdown and a table view. */
export function StackedBars({ title, series, height = 160, unit }: { title: string; series: StackSeries[]; height?: number; unit: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.values.length ?? 0;
  const totals = Array.from({ length: n }, (_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  const max = niceMax(Math.max(...totals, 1));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = n ? plotW / n : 0;
  const barW = Math.max(1, slot - 2); // 2px surface gap between bars
  const y = (v: number) => (v / max) * plotH;

  return (
    <Frame
      title={title}
      legend={
        <ul className="flex flex-wrap gap-3 text-[11px] text-muted">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      }
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${title}, last 30 seconds`}>
            <Axes width={width} height={height} max={max} format={(v) => Math.round(v).toString()} />
            {Array.from({ length: n }, (_, i) => {
              let base = PAD.top + plotH;
              const visible = series.filter((s) => s.values[i] > 0);
              return (
                <g key={i} opacity={hover === null || hover === i ? 1 : 0.45}>
                  {visible.map((s, k) => {
                    const h = Math.max(1, y(s.values[i]) - (k < visible.length - 1 ? 2 : 0)); // 2px gap between segments
                    base -= y(s.values[i]);
                    return (
                      <rect
                        key={s.key}
                        x={PAD.left + i * slot + 1}
                        y={base + (k < visible.length - 1 ? 2 : 0)}
                        width={barW}
                        height={h}
                        rx={k === visible.length - 1 ? Math.min(2, barW / 2) : 0}
                        fill={s.color}
                      />
                    );
                  })}
                  {/* Hit target spans the full column, wider than the mark. */}
                  <rect
                    x={PAD.left + i * slot}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    onPointerEnter={() => setHover(i)}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && (
          <Tooltip x={PAD.left + hover * slot + slot / 2} width={width}>
            <p className="mb-1 font-mono text-muted">{hover === n - 1 ? "now" : `−${n - 1 - hover}s`}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-foreground">{s.values[hover]}</span>
              </p>
            ))}
            <p className="mt-1 flex justify-between border-t border-border pt-1">
              <span className="text-muted">Total</span>
              <span className="font-mono">
                {totals[hover]} {unit}
              </span>
            </p>
          </Tooltip>
        )}
      </div>
      <DataTable
        headers={["Second", ...series.map((s) => s.label)]}
        rows={Array.from({ length: n }, (_, i) => [i === n - 1 ? "now" : `−${n - 1 - i}s`, ...series.map((s) => s.values[i])])}
      />
    </Frame>
  );
}

/** Single-series line with crosshair tooltip. The title names the series, so no legend. */
export function LineChart({
  title,
  values,
  format,
  color = SERIES.served,
  height = 160,
}: {
  title: string;
  values: number[];
  format: (v: number) => string;
  color?: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = values.length;
  const max = niceMax(Math.max(...values, 0));
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plotW : 0);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  return (
    <Frame title={title} legend={<span className="font-mono text-xs text-muted">{n ? format(values[n - 1]) : "–"} now</span>}>
      <div
        ref={ref}
        className="relative"
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - box.left - PAD.left) / Math.max(1, plotW)) * (n - 1));
          setHover(Math.min(n - 1, Math.max(0, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && n > 0 && (
          <svg width={width} height={height} role="img" aria-label={`${title}, last 30 seconds`}>
            <Axes width={width} height={height} max={max} format={format} />
            <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="rgb(255 255 255 / 0.25)" />
                <circle cx={x(hover)} cy={y(values[hover])} r={4} fill={color} stroke="#0d0f12" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {hover !== null && (
          <Tooltip x={x(hover)} width={width}>
            <p className="font-mono text-muted">{hover === n - 1 ? "now" : `−${n - 1 - hover}s`}</p>
            <p className="font-mono text-foreground">{format(values[hover])}</p>
          </Tooltip>
        )}
      </div>
      <DataTable headers={["Second", title]} rows={values.map((v, i) => [i === n - 1 ? "now" : `−${n - 1 - i}s`, format(v)])} />
    </Frame>
  );
}

/** Tiny trend line for stat tiles (no axes, no interaction: the tile's number carries the value). */
export function Sparkline({ values, color = SERIES.served }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const n = values.length;
  const points = values.map((v, i) => `${(i / Math.max(1, n - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer select-none hover:text-foreground">View data</summary>
      <div className="mt-2 max-h-48 overflow-auto">
        <table className="w-full font-mono">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="py-1 pr-3 text-left font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 pr-3 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
