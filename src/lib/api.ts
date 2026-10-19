/** Every browser request goes to the gateway, never to the API directly. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

// ---- shapes returned by the backend (camelCase JSON) -------------------------------------

export type MetricsSnapshot = {
  timestamp: string;
  uptimeSeconds: number;
  totalRequests: number;
  windowSeconds: number;
  requestsPerSecond: number;
  requestsInWindow: number;
  latency: { p50Ms: number; p95Ms: number; p99Ms: number; avgMs: number; maxMs: number };
  status: { success: number; redirect: number; clientError: number; serverError: number; rateLimited: number };
  edge: { cacheHits: number; rejected: number; cacheHitRatio: number };
  requestsPerSecondSeries: number[];
};

export type SandboxConfig = {
  cache: { enabled: boolean; ttlSeconds: number };
  requestCoalescing: boolean;
  rateLimiter: { enabled: boolean; requestsPerSecond: number };
  circuitBreaker: boolean;
  retries: { enabled: boolean; maxAttempts: number };
  timeout: { enabled: boolean; milliseconds: number };
  writeQueue: boolean;
  database: { indexed: boolean; poolSize: number };
};

export type FaultConfig = { extraLatencyMs: number; errorRate: number; outage: boolean };

export type ScenarioRequest = {
  kind: "burst" | "sustained";
  requests?: number;
  requestsPerSecond?: number;
  durationSeconds?: number;
  keys?: "hot" | "random";
  writeRatio?: number;
};

export type CircuitState = "disabled" | "closed" | "open" | "halfOpen";

export type SandboxSecond = {
  second: number;
  requests: number;
  success: number;
  cacheHits: number;
  queued: number;
  rateLimited: number;
  circuitOpen: number;
  timeouts: number;
  errors: number;
  queueFull: number;
  dbCalls: number;
  retries: number;
  p95Ms: number;
};

export type SandboxEvent = { timestamp: string; level: "info" | "success" | "warn" | "error"; message: string };

export type SandboxSnapshot = {
  id: string;
  timestamp: string;
  config: SandboxConfig;
  faults: FaultConfig;
  circuit: CircuitState;
  scenario: { running: boolean; kind: "burst" | "sustained" | null; sent: number; total: number };
  database: { poolSize: number; inUse: number; waitingForConnection: number; indexed: boolean };
  queue: { enabled: boolean; depth: number; capacity: number };
  current: {
    requestsPerSecond: number;
    successPerSecond: number;
    failuresPerSecond: number;
    rateLimitedPerSecond: number;
    dbCallsPerSecond: number;
    retriesPerSecond: number;
    cacheHitRatio: number;
    errorRatio: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    coalesced: number;
    backgroundProcessed: number;
    backgroundFailed: number;
  };
  series: SandboxSecond[];
  events: SandboxEvent[];
};

// ---- requests ----------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON request to the gateway. Throws ApiError with a human-readable message on failure. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "The backend is unreachable right now.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await describeError(response));
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

async function describeError(response: Response): Promise<string> {
  if (response.status === 429) {
    const retry = response.headers.get("Retry-After");
    return `Slow down: the gateway rate limited you${retry ? ` (retry in ${retry}s)` : ""}.`;
  }
  try {
    const problem = (await response.json()) as { title?: string; detail?: string };
    return problem.detail ?? problem.title ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

// ---- formatting --------------------------------------------------------------------------

export const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)}ms`);
export const formatRate = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1));
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}%`;
export function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${seconds % 60}s` : `${seconds}s`;
}
