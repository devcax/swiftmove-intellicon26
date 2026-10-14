// ---------------------------------------------------------------------------
// The one HTTP client for the dashboard. Sends the session cookie, turns every
// failure into an ApiError, and sends the browser to the login page on a 401.
// ---------------------------------------------------------------------------

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type ApiErrorDetail = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details: ApiErrorDetail[];
  /** Extra facts the server sent with the error when `details` was an object (a policy block names its requirement here). */
  readonly info: Record<string, unknown> | null;
  /** The whole JSON body of the error response, for callers that read fields only they know (a flow's `errors`, a policy's `issues`). */
  readonly body: Record<string, unknown>;

  constructor(
    message: string,
    options: { status: number; code: string; requestId?: string; details?: ApiErrorDetail[]; info?: Record<string, unknown> | null; body?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details ?? [];
    this.info = options.info ?? null;
    this.body = options.body ?? {};
  }
}

export type RequestOptions = RequestInit & {
  /** Set false for the login call itself, where a 401 means "wrong password", not "signed out". */
  redirectOn401?: boolean;
};

const LOGIN_PATH = "/login";

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) return;
  window.location.replace(`${LOGIN_PATH}?next=${encodeURIComponent(`${pathname}${search}`)}`);
}

function readDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = item as Partial<ApiErrorDetail> | null;
    return entry && typeof entry.path === "string" && typeof entry.message === "string"
      ? [{ path: entry.path, message: entry.message }]
      : [];
  });
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return new ApiError(
    typeof body.error === "string" ? body.error : `Request failed with status ${res.status}`,
    {
      status: res.status,
      code: typeof body.code === "string" ? body.code : "UNKNOWN",
      requestId: typeof body.requestId === "string" ? body.requestId : undefined,
      details: readDetails(body.details),
      info: body.details && typeof body.details === "object" && !Array.isArray(body.details) ? (body.details as Record<string, unknown>) : null,
      body,
    },
  );
}

/** For callers that read an error body themselves: send the browser to login when the session is gone. */
export function redirectIfUnauthorized(status: number): void {
  if (status === 401) redirectToLogin();
}

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { redirectOn401 = true, ...fetchInit } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...fetchInit,
    });
  } catch {
    throw new ApiError("Could not reach the server. Please try again.", { status: 0, code: "NETWORK" });
  }
  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && redirectOn401) redirectToLogin();
    throw error;
  }
  return res.json() as Promise<T>;
}
