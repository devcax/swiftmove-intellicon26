"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import type { ApiOverviewInsights } from "../types";
import { OverviewPanel, overviewPanelSx } from "./OverviewPanel";

type Slice = { label: string; value: number; color: string };

function Donut({ slices, label }: { slices: Slice[]; label: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const segments = slices.map((slice, index) => {
    const size = total ? slice.value / total * 100 : 0;
    const offset = total ? slices.slice(0, index).reduce((sum, item) => sum + item.value, 0) / total * 100 : 0;
    return { ...slice, size, offset };
  });
  return <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 3 }}>
    <Box sx={{ width: { xs: 150, sm: 170 }, flexShrink: 0, mx: { xs: "auto", sm: 0 } }}>
      <svg viewBox="0 0 160 160" role="img" aria-label={`${label}: ${total} total. ${slices.map(s => `${s.label}: ${s.value}`).join('. ')}`}>
        <circle cx="80" cy="80" r="58" fill="none" stroke="#edf1f7" strokeWidth="20" />
        {segments.filter(slice => slice.value > 0).map(slice => <circle key={slice.label}
          cx="80" cy="80" r="58" pathLength="100" fill="none" stroke={slice.color} strokeWidth="20"
          strokeDasharray={`${slice.size} ${100 - slice.size}`} strokeDashoffset={-slice.offset} transform="rotate(-90 80 80)">
          <title>{`${slice.label}: ${slice.value} (${Math.round(slice.size)}%)`}</title>
        </circle>)}
        <text x="80" y="79" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">{total}</text>
        <text x="80" y="98" textAnchor="middle" fontSize="12" fill="#475569">{total === 0 ? "No records" : "Total"}</text>
      </svg>
    </Box>
    <Box component="dl" sx={{ m: 0, flex: 1, minWidth: 170, display: "grid", gap: 1.5 }}>
      {slices.map(slice => <Box key={slice.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box aria-hidden="true" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: slice.color, flexShrink: 0 }} />
        <Typography component="dt" sx={{ flex: 1, color: "#475569", fontSize: 13 }}>{slice.label}</Typography>
        <Typography component="dd" sx={{ m: 0, fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{slice.value.toLocaleString()}</Typography>
      </Box>)}
    </Box>
  </Box>;
}

export function OperationsSnapshot({ insights }: { insights: ApiOverviewInsights }) {
  const metrics = [
    { label: "Registered drivers", value: insights.drivers.total, href: "/drivers", icon: <GroupsRoundedIcon /> },
    { label: "Unassigned drivers", value: insights.drivers.unassigned, href: "/drivers", icon: <PersonOutlineRoundedIcon /> },
    { label: "Drivers with a job", value: insights.drivers.assigned, href: "/drivers", icon: <LocalShippingOutlinedIcon /> },
    { label: "Unread driver messages", value: insights.unreadDriverMessages, href: "/conversations", icon: <ChatBubbleOutlineRoundedIcon /> },
  ];
  return <Paper component="section" aria-label="Driver and message overview" sx={{ ...overviewPanelSx, display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, p: 1 }}>
    {metrics.map(metric => <Box key={metric.label} component={Link} href={metric.href}
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1, p: { xs: 2, sm: 3 }, textDecoration: "none", color: "inherit", borderRadius: 1, "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: -2 }, "&:hover .metric-label": { textDecoration: "underline" } }}>
      <Box aria-hidden="true" sx={{ width: 44, height: 44, borderRadius: "50%", bgcolor: "#eef2ff", color: "#1e3a8a", display: "grid", placeItems: "center" }}>{metric.icon}</Box>
      <Typography sx={{ fontWeight: 700, fontSize: 24, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{metric.value.toLocaleString()}</Typography>
      <Typography className="metric-label" sx={{ fontSize: 12.5, color: "#475569" }}>{metric.label}</Typography>
    </Box>)}
  </Paper>;
}

export function DriverAvailability({ insights }: { insights: ApiOverviewInsights }) {
  const drivers: Slice[] = [
    { label: "Active, no assigned job", value: insights.drivers.unassigned, color: "#0f766e" },
    { label: "Active, with assigned job", value: insights.drivers.assigned, color: "#1e3a8a" },
    { label: "Inactive / other", value: insights.drivers.inactive, color: "#64748b" },
  ];
  return <OverviewPanel title="Driver availability" subtitle="Current driver status and assignment" href="/drivers" height={360}>
    <Donut slices={drivers} label="Driver availability" />
    <Typography sx={{ fontSize: 12, color: "#475569", mt: 2 }}>Unassigned means active with no linked job. Vehicle, verification, and policy checks still apply to job requests.</Typography>
  </OverviewPanel>;
}

export function JobStatusBreakdown({ insights }: { insights: ApiOverviewInsights }) {
  const jobs: Slice[] = [
    { label: "Draft", value: insights.jobs.draft, color: "#64748b" },
    { label: "Open for requests", value: insights.jobs.open, color: "#0284c7" },
    { label: "Live trip / review", value: insights.jobs.live, color: "#1e3a8a" },
    { label: "Completed", value: insights.jobs.completed, color: "#0f766e" },
    { label: "Cancelled", value: insights.jobs.cancelled, color: "#be123c" },
    ...(insights.jobs.other ? [{ label: "Other", value: insights.jobs.other, color: "#b45309" }] : []),
  ];
  return <OverviewPanel title="Job status breakdown" subtitle="All current job records · each job counted once" href="/jobs" height={290}>
      <Donut slices={jobs} label="Job status breakdown" />
    </OverviewPanel>;
}

export function JobActivityChart({ insights }: { insights: ApiOverviewInsights }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const chartId = useId();
  const chartContainer = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);
  useEffect(() => {
    const element = chartContainer.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const days = insights.activity.slice(-period);
  const maximum = Math.max(1, ...days.flatMap(day => [day.created, day.completed]));
  const created = days.reduce((sum, day) => sum + day.created, 0);
  const completed = days.reduce((sum, day) => sum + day.completed, 0);
  const minimumWidth = period === 30 ? 780 : 520;
  const width = Math.max(minimumWidth, containerWidth);
  const plotWidth = width - 80;
  const step = plotWidth / Math.max(1, days.length);
  const barWidth = Math.min(22, step * 0.28);
  const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return <Paper component="section" sx={{ ...overviewPanelSx, p: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Box>
        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>Job activity</Typography>
        <Typography sx={{ mt: 0.5, color: "#475569", fontSize: 12 }}>Last {period} calendar days including today · {insights.timezone}</Typography>
      </Box>
      <ToggleButtonGroup size="small" value={period} exclusive onChange={(_, value: 7 | 30 | null) => { if (value) setPeriod(value); }} aria-label="Job activity period">
        <ToggleButton value={7} sx={{ textTransform: "none" }}>7 days</ToggleButton>
        <ToggleButton value={30} sx={{ textTransform: "none" }}>30 days</ToggleButton>
      </ToggleButtonGroup>
    </Box>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 1 }}>
      {[{ label: "Created", color: "#1e3a8a", count: created }, { label: "Completed", color: "#0f766e", count: completed }].map(item => <Box key={item.label} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Box aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color }} />
        <Typography sx={{ fontSize: 13, color: "#475569" }}>{item.label}: <strong>{item.count.toLocaleString()}</strong></Typography>
      </Box>)}
    </Box>
    {created === 0 && completed === 0 && <Typography sx={{ fontSize: 13, color: "#475569", mb: 2 }}>No jobs were created or completed in this period.</Typography>}
    <Box ref={chartContainer} sx={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} 180`} role="img" aria-labelledby={chartId} style={{ display: "block", width: "100%", height: 180, minWidth: minimumWidth }}>
        <title id={chartId}>{`Daily job activity in ${insights.timezone}. ${days.map(day => `${day.date}: ${day.created} created, ${day.completed} completed`).join('. ')}`}</title>
        {[...new Set([0, Math.ceil(maximum / 2), maximum])].map(value => <g key={value}>
          <line x1="55" x2={width - 25} y1={145 - value / maximum * 120} y2={145 - value / maximum * 120} stroke="#e2e8f0" strokeDasharray={value ? "4 4" : undefined} />
          <text x="44" y={149 - value / maximum * 120} textAnchor="end" fontSize="12" fill="#475569">{value}</text>
        </g>)}
        {days.map((day, index) => {
          const x = 55 + (index + 0.5) * step;
          return <g key={day.date}>
            {[{ count: day.created, color: "#1e3a8a", dx: -barWidth - 1 }, { count: day.completed, color: "#0f766e", dx: 1 }].map((bar, series) => <rect key={series} x={x + bar.dx} y={145 - bar.count / maximum * 120} width={barWidth} height={bar.count / maximum * 120} rx="2" fill={bar.color}>
              <title>{`${dateLabel(day.date)}: ${bar.count} ${series === 0 ? 'created' : 'completed'}`}</title>
            </rect>)}
            {(period === 7 || index % 5 === 0 || index === days.length - 1) && <text x={x} y="169" textAnchor="middle" fontSize="12" fill="#475569">{dateLabel(day.date)}</text>}
          </g>;
        })}
      </svg>
    </Box>
    <Typography sx={{ mt: 1, color: "#475569", fontSize: 12 }}>Based on creation and completion timestamps of existing jobs. Deleted jobs are excluded. Updates every 15 seconds.</Typography>
  </Paper>;
}
