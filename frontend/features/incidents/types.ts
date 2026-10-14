export type ApiIncidentStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";

export interface ApiIncidentSummary {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: ApiIncidentStatus;
  description: string | null;
  reportedAt: string;
  resolvedAt: string | null;
  managerNotes: string | null;
  job: { id: string; jobNumber: string; status: string };
  driver: string;
}

export interface ApiIncidentDetail extends ApiIncidentSummary {
  sourceMessage: { text: string; time: string } | null;
  location: { lat: number; lng: number; receivedAt: string | null } | null;
  backupVehicle: "REQUESTED" | "DECLINED" | null;
  attachments: { id: string; type: string; filename: string | null; mimeType: string | null; publicUrl: string | null }[];
}
