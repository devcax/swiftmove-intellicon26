// ---------------------------------------------------------------------------
// Generic UI primitives shared across feature areas. These are presentation
// shapes (color tones, labeled options) independent of any API DTO.
// ---------------------------------------------------------------------------

/** A background/foreground color pair used for chips and badges. */
export interface ToneColor {
  bg: string;
  fg: string;
}

/** A selectable/filter option with a stable key and human label. */
export interface LabeledOption {
  key: string;
  label: string;
}

/** A tone carrying an additional label (e.g. a request-type badge). */
export interface LabeledTone extends ToneColor {
  label: string;
}
