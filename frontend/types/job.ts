// ---------------------------------------------------------------------------
// Job-specific frontend types: view-model shapes used to render the job
// detail page (progress ladder, status tones, timeline provenance badges).
// These are UI concerns and intentionally live apart from the API DTOs.
// ---------------------------------------------------------------------------

/** A single step on the job progress ladder. */
export interface LadderStep {
  key: string;
  label: string;
  /** Steps that only the system/backend may advance through. */
  protected?: boolean;
  /** Steps gated behind document-code verification. */
  verified?: boolean;
}

/** A provenance badge describing how a timeline event was recorded. */
export interface Provenance {
  label: string;
  bg: string;
  fg: string;
  title?: string;
}

/**
 * The subset of a timeline event's `data` payload the UI inspects to derive
 * provenance badges. Kept loose (index signature) since events carry
 * arbitrary workflow fields.
 */
export interface EventDataPayload {
  inferred?: boolean;
  reason?: string;
  correction?: boolean;
  verification?: { stage?: string; method?: string };
  [key: string]: unknown;
}
