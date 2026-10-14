export interface ApiJobRequest {
  id: string;
  status: "REQUESTED" | "CANCELLED_BY_DRIVER" | "REJECTED" | "APPROVED" | "EXPIRED";
  requestedAt: string;
  reviewedAt: string | null;
  job: {
    id: string;
    jobNumber: string;
    cargo: string;
    pickup: string | null;
    delivery: string | null;
    quantity: string | null;
    pickupAt: string;
    status: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
  };
}

// One combined, reverse-chronological feed of every decision a manager has
// made on a driver's ask - taking a job, cancelling one, or closing one out -
// each tagged with which of the three it was.
export interface ApiRequestHistoryEntry {
  id: string;
  type: "JOB_REQUEST" | "CANCELLATION" | "CLOSURE";
  decision: string;
  decidedAt: string;
  job: {
    id: string;
    jobNumber: string;
    cargo: string | null;
    pickup: string | null;
    delivery: string | null;
  };
  driver: {
    id: string | null;
    name: string;
    phone: string;
    verified: boolean;
  };
}

// ---------------------------------------------------------------------------
// View-model types for the job-request queue page.
// ---------------------------------------------------------------------------

/** The four tabs on the request queue. */
export type QueueTab = "requests" | "history" | "cancellations" | "closures";
