import Box from "@mui/material/Box";

/** Compact count chart with integer grid lines and accessible data labels. */
export function ActivityBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(4, ...data.map(item => item.value));
  const step = Math.ceil(max / 4);
  const ceiling = step * 4;
  const width = 720, height = 220, left = 32, bottom = 32, top = 12;
  const plotHeight = height - bottom - top;
  const slot = (width - left - 8) / data.length;
  return <Box className="panel-scroll" sx={{ overflowX: "auto" }}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: "block", width: "100%", minWidth: 540 }}>
      <title>{label}</title><desc>{data.map(item => `${item.label}: ${item.value}`).join('; ')}</desc>
      {Array.from({ length: 5 }, (_, index) => { const y = top + plotHeight - index / 4 * plotHeight; return <g key={index}>
        <line x1={left} x2={width - 8} y1={y} y2={y} stroke="#e2e8f0" />
        <text x={left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10}>{index * step}</text>
      </g>; })}
      {data.map((item, index) => { const barHeight = item.value / ceiling * plotHeight; return <g key={item.label}>
        <rect x={left + index * slot + slot * 0.2} y={top + plotHeight - barHeight} width={slot * 0.6} height={barHeight} fill="#1e3a8a" rx={2}><title>{item.label}: {item.value} decisions</title></rect>
        {(data.length <= 12 || index % 5 === 0 || index === data.length - 1) && <text x={left + (index + 0.5) * slot} y={height - 10} textAnchor="middle" fill="#64748b" fontSize={10}>{item.label}</text>}
      </g>; })}
    </svg>
  </Box>;
}
