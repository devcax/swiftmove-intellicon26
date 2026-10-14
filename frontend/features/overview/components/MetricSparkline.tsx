"use client";

import * as React from "react";

const WIDTH = 120;
const HEIGHT = 48;
const PAD_X = 4;
const PAD_TOP = 8;
const PAD_BOTTOM = 6;

/** A smooth line through the points; each segment leaves and arrives flat, so it never overshoots a reading. */
export function smoothPath(points: { x: number; y: number }[]): string {
  return points.reduce((path, point, index) => {
    if (!index) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    const from = points[index - 1];
    const middle = (from.x + point.x) / 2;
    return `${path} C ${middle.toFixed(1)} ${from.y.toFixed(1)}, ${middle.toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, "");
}

/** The last 24 live readings of one count, as a smooth line over a soft fade. Never a made-up trend: a steady count is a flat line. */
export function MetricSparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const id = React.useId().replace(/:/g, "");
  const readings = values.slice(-24);
  if (!readings.length) return null;
  const latest = readings[readings.length - 1];
  const change = latest - readings[0];
  const lowest = Math.min(...readings);
  const highest = Math.max(...readings);
  const shown = readings.length === 1 ? [readings[0], readings[0]] : readings;
  const top = PAD_TOP;
  const bottom = HEIGHT - PAD_BOTTOM;
  const points = shown.map((value, index) => ({
    x: PAD_X + (index / (shown.length - 1)) * (WIDTH - PAD_X * 2),
    y: highest === lowest ? (top + bottom) / 2 : bottom - ((value - lowest) / (highest - lowest)) * (bottom - top),
  }));
  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${HEIGHT} L ${first.x.toFixed(1)} ${HEIGHT} Z`;
  const trend = readings.length === 1 ? "first reading" : change === 0 ? (highest === lowest ? "no change" : "back to where it started") : `${change > 0 ? "up" : "down"} ${Math.abs(change)}`;
  const description = `${label}: now ${latest}, ${trend}. Last ${readings.length} reading${readings.length === 1 ? "" : "s"} from this session, oldest to newest, refreshed every 15 seconds while visible.`;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={description} style={{ flexShrink: 0, maxWidth: "100%" }}>
      <title>{`${description} Values: ${readings.join(", ")}`}</title>
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-fade)`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3.25" fill="#fff" stroke={color} strokeWidth="2" />
    </svg>
  );
}
