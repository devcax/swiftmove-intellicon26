const { STATUS_TEXT } = require('./statuses');

/** "just now", "5 min ago", "3 hr ago", "2 days ago". */
function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function toneForIntent(intent) {
  const value = String(intent ?? '').toUpperCase();
  if (value.includes('INCIDENT') || value.includes('BREAKDOWN') || value.includes('ACCIDENT')) return 'error';
  if (value.includes('DELAY')) return 'warning';
  if (value.includes('COMPLET') || value.includes('DELIVERED') || value.includes('UNLOADED')) return 'success';
  return 'info';
}

function describeLastUpdate(job) {
  if (job.last_event) {
    const label = String(job.last_event).replace(/_/g, ' ').toLowerCase();
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return STATUS_TEXT[job.current_status] ?? job.current_status;
}

const toActiveJob = (r) => ({
  jobNumber: r.job_number, driver: r.driver ?? 'Unassigned', origin: r.origin ?? '—', destination: r.destination ?? '—', status: r.current_status,
  lastUpdate: describeLastUpdate(r), lastUpdateAgo: timeAgo(r.last_event_at ?? r.updated_at),
  exception: r.exception ?? (r.current_status === 'DELAYED' ? 'Running late' : r.current_status === 'INCIDENT_OPEN' ? 'Incident opened' : null),
});

const toIncidentLine = (r) => ({ id: `INC-${String(r.id).slice(0, 4).toUpperCase()}`, jobNumber: r.job_number, summary: r.description });

function toAiEvent(r) {
  const summary = r.structured_output && r.structured_output.summary ? String(r.structured_output.summary) : r.job_number;
  return {
    id: r.id, jobId: r.job_id,
    intent: r.primary_intent, detail: summary.includes(r.job_number) ? summary : `${summary} · ${r.job_number}`,
    confidence: r.confidence_score != null ? Math.round(Number(r.confidence_score) * 100) : 0, tone: toneForIntent(r.primary_intent),
  };
}

const toKpis = ({ jobs, requests, incidents }) => [
  { label: 'Published Jobs', value: jobs.published, hint: 'in the pool', tone: 'primary' },
  { label: 'Driver Requests', value: requests, hint: 'awaiting approval', tone: 'info' },
  { label: 'Active Jobs', value: jobs.active, hint: 'on the road', tone: 'primary' },
  { label: 'Delayed Jobs', value: jobs.delayed, hint: 'needs review', tone: 'warning' },
  { label: 'Open Incidents', value: incidents, hint: 'escalated', tone: 'error' },
  { label: 'Awaiting Completion', value: jobs.awaiting, hint: 'POD pending', tone: 'success' },
];

module.exports = { toActiveJob, toIncidentLine, toAiEvent, toKpis };
