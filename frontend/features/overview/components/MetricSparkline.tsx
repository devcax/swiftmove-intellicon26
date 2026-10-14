"use client";

import { useId } from "react";

/** Compact session trend drawn only from real overview readings. */
export function MetricSparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const gradient = useId();
  if (values.length === 0) return null;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 50 : 4 + index / (values.length - 1) * 92,
    y: maximum === minimum ? 25 : 44 - (value - minimum) / (maximum - minimum) * 36,
  }));
  const first = points[0];
  const last = points[points.length - 1];
  let line = `M ${first.x} ${first.y}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const point = points[index];
    const middle = (previous.x + point.x) / 2;
    line += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }
  return (
    <svg viewBox="0 0 100 52" width="84" height="46" role="img" aria-label={`${label}: ${values.length} session readings. Latest ${last ? values[values.length - 1] : 0}.`} style={{ flexShrink: 0, maxWidth: "100%" }}>
      <title>{values.length === 1 ? "Collecting live readings; trend appears after the next update" : "Recent readings from this session, oldest to newest"}</title>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.24" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {values.length > 1 && <>
        <path d={`${line} L ${last.x} 52 L ${first.x} 52 Z`} fill={`url(#${gradient})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </>}
      <circle cx={last.x} cy={last.y} r="3" fill={color} />
    </svg>
  );
}
