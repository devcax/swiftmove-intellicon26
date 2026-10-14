import type { ApiIncidentSummary } from "./types";

export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export function incidentMetrics(incidents: ApiIncidentSummary[]) {
  return SEVERITIES.map(severity => {
    const count = incidents.filter(incident => incident.severity === severity).length;
    return { severity, count, percentage: incidents.length ? count / incidents.length * 100 : 0 };
  });
}

export function filterIncidents(incidents: ApiIncidentSummary[], status: string, severity = "") {
  const statuses = status ? status.split(',') : [];
  return incidents.filter(incident => (!statuses.length || statuses.includes(incident.status)) && (!severity || incident.severity === severity));
}
