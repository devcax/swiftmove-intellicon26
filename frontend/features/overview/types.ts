export interface ApiOverviewKpi {
  label: string;
  value: number;
  hint: string;
  tone: "primary" | "info" | "success" | "warning" | "error" | "neutral";
}

export interface ApiOverviewJob {
  jobNumber: string;
  driver: string;
  origin: string;
  destination: string;
  status: string;
  lastUpdate: string;
  lastUpdateAgo: string;
  exception: string | null;
}

export interface ApiOverviewIncident {
  id: string;
  jobNumber: string;
  summary: string;
}

export interface ApiOverviewAiEvent {
  id: string;
  jobId: string;
  intent: string;
  detail: string;
  confidence: number;
  tone: "success" | "warning" | "error" | "info";
}

export interface ApiOperationsOverview {
  insights?: ApiOverviewInsights;
  kpis: ApiOverviewKpi[];
  activeJobs: ApiOverviewJob[];
  openIncidents: ApiOverviewIncident[];
  recentAiEvents: ApiOverviewAiEvent[];
}

export interface ApiOverviewInsights {
  drivers: { total: number; unassigned: number; assigned: number; inactive: number };
  jobs: { draft: number; open: number; live: number; completed: number; cancelled: number; other: number };
  activity: { date: string; created: number; completed: number }[];
  unreadDriverMessages: number;
  timezone: string;
}
