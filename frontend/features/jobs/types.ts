import type { ApiChatMessage, ApiInterpretation, ApiMessageKind } from "@/features/conversations/types";

export interface ApiJobSummary {
  id: string;
  jobNumber: string;
  status: string;
  cargo: string;
  pickup: string | null;
  delivery: string | null;
  quantity: string | null;
  pickupAt: string;
  deliveryAt: string | null;
  pickupCode?: string | null;
  deliveryCode?: string | null;
  driver: string | null;
  cancellationReason: string | null;
  assignmentStatus: string | null;
}

export interface ApiJobDetail {
  id: string;
  jobNumber: string;
  status: string;
  cargo: string;
  specialInstructions: string | null;
  pickupAt: string;
  deliveryAt: string | null;
  completedAt: string | null;
  pickupCode: string | null;
  deliveryCode: string | null;
  pickupVerifiedAt: string | null;
  deliveryVerifiedAt: string | null;
  pickupActualAt: string | null;
  deliveryActualAt: string | null;
  pickupDelayReason: string | null;
  deliveryDelayReason: string | null;
  stops: { type: string; name: string; address: string; latitude?: number | null; longitude?: number | null }[];
  items: { description: string; quantity: string | null; quantityValue: number | null; unit: string | null }[];
  assignment: {
    id: string;
    status: string;
    assignedAt: string;
    acceptedAt: string | null;
    startedAt: string | null;
    completionSubmittedAt: string | null;
    cancellationReason: string | null;
    driver: { id: string; name: string; phone: string };
  } | null;
}

export interface ApiTimelineEvent {
  id: string;
  type: string;
  status: "PROPOSED" | "CONFIRMED" | "APPLIED" | "REJECTED" | "REVIEW_REQUIRED";
  data: Record<string, unknown>;
  confidence: number | null;
  appliedAt: string | null;
  time: string;
  sourceMessage: string | null;
}

export interface ApiJobIdentifiers {
  jobNumber: string;
  pickupCode: string;
  deliveryCode: string;
}

export interface ApiLiveJob extends ApiJobSummary {
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  previousStatus?: string | null;
  milestoneChangedAt?: string | null;
  driverPhone: string | null;
  lastEventType: string | null;
  lastEventAt: string | null;
  openIncidents: number;
}

export interface ApiJobActivityAttachment {
  id: string;
  type: string;
  filename: string | null;
  mimeType: string | null;
  publicUrl: string | null;
  createdAt: string;
}

export interface ApiJobActivityMessage {
  id: string;
  kind: ApiMessageKind;
  type?: string;
  text: string;
  time: string;
  deliveryStatus: ApiChatMessage["deliveryStatus"];
  interpretation?: ApiInterpretation;
  attachments: ApiJobActivityAttachment[];
}

// What the jobs list shows for one job.
export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "MANAGER_APPROVED";

export interface Job {
  id?: string;
  jobNumber: string;
  pickupCode?: string | null;
  deliveryCode?: string | null;
  /** Actual API lifecycle status; ACTIVE is only a grouped list filter. */
  status: string;
  assignmentStatus?: string | null;
  origin: string;
  destination: string;
  window: string;
  cargo: string;
  quantity: string;
  driver: string | null;
}
