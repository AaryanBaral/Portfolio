"use client";

import { AlertTriangle, CheckCircle2, CircleSlash, Info, Play, RotateCcw, Square, XCircle, Zap } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  API_URL,
  ApiError,
  api,
  formatMs,
  formatPercent,
  formatRate,
  type FaultConfig,
  type SandboxConfig,
  type SandboxEvent,
  type SandboxSnapshot,
  type ScenarioRequest,
} from "@/lib/api";
import { useEventStream, useInView } from "@/lib/useEventStream";
import { LineChart, SERIES, StackedBars } from "./charts";
import { StatusPill } from "./LiveSystem";

const STORAGE_KEY = "portfolio.sandboxId";

type Toggle = {
  key: string;
  label: string;
  role: string;
  isOn: (c: SandboxConfig) => boolean;
  toggle: (c: SandboxConfig) => SandboxConfig;
  stat: (s: SandboxSnapshot) => string;
};

/** Pipeline order: the path a request takes through the sandbox. */
const PIPELINE: Toggle[] = [
  {
    key: "rateLimiter",
    label: "Rate limiter",
    role: "Token bucket",
    isOn: (c) => c.rateLimiter.enabled,
    toggle: (c) => ({ ...c, rateLimiter: { ...c.rateLimiter, enabled: !c.rateLimiter.enabled } }),
    stat: (s) => `${formatRate(s.current.rateLimitedPerSecond)}/s rejected`,
  },
  {
    key: "writeQueue",
    label: "Write queue",
    role: "Channel + workers",
    isOn: (c) => c.writeQueue,
    toggle: (c) => ({ ...c, writeQueue: !c.writeQueue }),
    stat: (s) => `${s.queue.depth}/${s.queue.capacity} queued`,
  },
  {
    key: "cache",
    label: "Cache",
    role: "In-memory, TTL",
    isOn: (c) => c.cache.enabled,
    toggle: (c) => ({ ...c, cache: { ...c.cache, enabled: !c.cache.enabled } }),
    stat: (s) => `${formatPercent(s.current.cacheHitRatio)} hit ratio`,
  },
  {
    key: "coalescing",
    label: "Coalescing",
    role: "Stampede guard",
    isOn: (c) => c.requestCoalescing,
    toggle: (c) => ({ ...c, requestCoalescing: !c.requestCoalescing }),
    stat: (s) => `${s.current.coalesced.toLocaleString()} shared`,
  },
  {
    key: "retries",
    label: "Retries",
    role: "Backoff + jitter",
    isOn: (c) => c.retries.enabled,
    toggle: (c) => ({ ...c, retries: { ...c.retries, enabled: !c.retries.enabled } }),
    stat: (s) => `${formatRate(s.current.retriesPerSecond)}/s retried`,
  },
  {
    key: "circuitBreaker",
    label: "Circuit breaker",
    role: "Polly",
    isOn: (c) => c.circuitBreaker,
    toggle: (c) => ({ ...c, circuitBreaker: !c.circuitBreaker }),
    stat: (s) => ({ disabled: "off", closed: "closed", open: "OPEN", halfOpen: "half-open" })[s.circuit],
  },
  {
    key: "timeout",
    label: "Timeout",
    role: "Per DB call",
    isOn: (c) => c.timeout.enabled,
    toggle: (c) => ({ ...c, timeout: { ...c.timeout, enabled: !c.timeout.enabled } }),
    stat: (s) => `${s.config.timeout.milliseconds}ms limit`,
  },
  {
    key: "index",
    label: "DB index",
    role: "Query plan",
    isOn: (c) => c.database.indexed,
    toggle: (c) => ({ ...c, database: { ...c.database, indexed: !c.database.indexed } }),
    stat: (s) => (s.database.indexed ? "~6ms lookups" : "~90ms scans"),
  },
];

const SCENARIOS: { id: string; label: string; hint: string; request: ScenarioRequest }[] = [
  { id: "spike", label: "Traffic spike", hint: "1,000 reads at once", request: { kind: "burst", requests: 1000, keys: "hot", writeRatio: 0.1 } },
  {
    id: "hot",
    label: "Hot-key storm",
    hint: "300 req/s on 10 popular keys · 10s",
    request: { kind: "sustained", requestsPerSecond: 300, durationSeconds: 10, keys: "hot", writeRatio: 0 },
  },
  {
    id: "random",
    label: "Random-key load",
    hint: "200 req/s across 100k keys · 10s",
    request: { kind: "sustained", requestsPerSecond: 200, durationSeconds: 10, keys: "random", writeRatio: 0 },
  },
  { id: "writes", label: "Write flood", hint: "1,500 writes at once", request: { kind: "burst", requests: 1500, keys: "random", writeRatio: 1 } },
];

const EXPERIMENTS: ReactNode[] = [
  <>
    <b>Remove the cache</b>, then run <b>Hot-key storm</b>: database queries jump from almost zero to ~300/s.
  </>,
  <>
    Switch to <b>Naked</b> and fire a <b>Traffic spike</b>: the connection pool saturates and p95 climbs.
  </>,
  <>
    Start an <b>outage</b> with the timeout off: requests hang for 2s. Turn the <b>timeout</b> and <b>circuit breaker</b> on and
    failures become instant.
  </>,
  <>
    Set a <b>50% error rate</b> with retries on: database load multiplies. That&apos;s a retry storm.
  </>,
  <>
    Run a <b>Write flood</b> with and without the <b>write queue</b> and compare latency.
  </>,
];

export function Sandbox() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [id, setId] = useState<string | null>(null);
  const [latest, setLatest] = useState<SandboxSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stream = useEventStream<SandboxSnapshot>(id && inView ? `${API_URL}/api/sandbox/${id}/stream` : null, "snapshot");

  // Newest of the stream and the last action response, so changes show instantly.
  const snapshot = pickNewest(stream.data, latest?.id === id ? latest : null);

  const forget = useCallback((message: string | null) => {
    sessionStorage.removeItem(STORAGE_KEY);
    setId(null);
    setLatest(null);
    setError(message);
  }, []);

  // Resume a sandbox from earlier in this tab, if it still exists.
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    api<SandboxSnapshot>(`/api/sandbox/${stored}`)
      .then((s) => {
        setId(s.id);
        setLatest(s);
      })
      .catch(() => sessionStorage.removeItem(STORAGE_KEY));
  }, []);

  // A stream that keeps failing may mean the sandbox expired: check once and start over if so.
  useEffect(() => {
    if (stream.status !== "offline" || !id) return;
    api<SandboxSnapshot>(`/api/sandbox/${id}`).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) forget("Your sandbox expired after a period of inactivity. Launch a new one.");
    });
  }, [stream.status, id, forget]);

  async function act(run: () => Promise<SandboxSnapshot | undefined>) {
    setBusy(true);
    setError(null);
    try {
      const result = await run();
      if (result) setLatest(result);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) forget("That sandbox no longer exists. Launch a new one.");
      else setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const launch = () =>
    act(async () => {
      const created = await api<SandboxSnapshot>("/api/sandbox", { method: "POST" });
      sessionStorage.setItem(STORAGE_KEY, created.id);
      setId(created.id);
      return created;
    });

  const setConfig = (next: SandboxConfig) => act(() => api<SandboxSnapshot>(`/api/sandbox/${id}/config`, { method: "PUT", body: next }));
  const setFaults = (next: FaultConfig) => act(() => api<SandboxSnapshot>(`/api/sandbox/${id}/faults`, { method: "PUT", body: next }));
  const start = (request: ScenarioRequest) =>
    act(() => api<SandboxSnapshot>(`/api/sandbox/${id}/scenarios`, { method: "POST", body: request }));
  const stop = () => act(() => api<SandboxSnapshot>(`/api/sandbox/${id}/scenarios`, { method: "DELETE" }));
  const reset = (preset: "production" | "naked") =>
    act(() => api<SandboxSnapshot>(`/api/sandbox/${id}/reset?preset=${preset}`, { method: "POST" }));

  return (
    <div ref={ref} id="sandbox" className="mt-16 scroll-mt-8" data-testid="sandbox">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase">Sandbox</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">Now break it yourself.</h3>
          <p className="mt-3 max-w-2xl text-muted">
            You get your own isolated copy of the request pipeline, built from the real components: a token-bucket rate
            limiter, an in-memory cache, request coalescing, Polly retries, circuit breaker and timeouts, and a background
            write queue. Only the database is simulated, so nothing you do can touch production.
          </p>
        </div>
        {snapshot && (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={stream.status === "idle" ? "connecting" : stream.status} />
            <PresetButton onClick={() => reset("production")} disabled={busy} label="Production preset" />
            <PresetButton onClick={() => reset("naked")} disabled={busy} label="Naked preset" />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-[#d03b3b]/40 bg-[#d03b3b]/10 px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0 text-[#d03b3b]" aria-hidden />
          {error}
        </p>
      )}

      {!snapshot ? (
        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-surface p-8">
          <p className="max-w-xl text-sm text-muted">
            The sandbox starts with every protection switched on. Remove components, inject failures, fire traffic, and
            watch throughput, latency and database load change in real time.
          </p>
          <button
            type="button"
            onClick={launch}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:brightness-110 disabled:opacity-60"
          >
            <Play className="h-4 w-4" aria-hidden />
            {busy ? "Launching…" : "Launch my sandbox"}
          </button>
        </div>
      ) : (
        <SandboxConsole
          snapshot={snapshot}
          busy={busy}
          onConfig={setConfig}
          onFaults={setFaults}
          onStart={start}
          onStop={stop}
        />
      )}
    </div>
  );
}

function SandboxConsole({
  snapshot: s,
  busy,
  onConfig,
  onFaults,
  onStart,
  onStop,
}: {
  snapshot: SandboxSnapshot;
  busy: boolean;
  onConfig: (c: SandboxConfig) => void;
  onFaults: (f: FaultConfig) => void;
  onStart: (r: ScenarioRequest) => void;
  onStop: () => void;
}) {
  const c = s.config;
  const series = s.series;
  const flowing = s.current.requestsPerSecond > 0;

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Request pipeline: every card is a switch. */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium">Request pipeline · click a component to add or remove it</h4>
          <span className="font-mono text-xs text-muted">client → … → database</span>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
          {PIPELINE.map((node) => {
            const on = node.isOn(c);
            const tripped = node.key === "circuitBreaker" && (s.circuit === "open" || s.circuit === "halfOpen");
            return (
              <li key={node.key} className="relative">
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => onConfig(node.toggle(c))}
                  data-testid={`toggle-${node.key}`}
                  className={`group flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left transition ${
                    tripped
                      ? s.circuit === "open"
                        ? "border-[#d03b3b]/70 bg-[#d03b3b]/10"
                        : "border-[#fab219]/70 bg-[#fab219]/10"
                      : on
                        ? "border-accent/40 bg-accent-soft hover:border-hover"
                        : "border-border bg-background/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{node.label}</span>
                    <span className={`h-2 w-2 rounded-full ${on ? "bg-accent" : "bg-muted/50"}`} aria-hidden />
                  </span>
                  <span className="text-[11px] text-muted">{node.role}</span>
                  <span className="mt-auto pt-2 font-mono text-[11px]">{on ? node.stat(s) : "removed"}</span>
                </button>
              </li>
            );
          })}
          <li>
            <div className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background/60 p-3" data-testid="db-node">
              <span className="text-sm font-medium">PostgreSQL</span>
              <span className="text-[11px] text-muted">Simulated</span>
              <span className="mt-auto pt-2 font-mono text-[11px]">
                {s.database.inUse}/{s.database.poolSize} conns
                {s.database.waitingForConnection > 0 && <span className="text-[#fab219]"> · {s.database.waitingForConnection} waiting</span>}
              </span>
            </div>
          </li>
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-background" aria-hidden>
          <div
            className={`h-full w-full ${flowing ? "animate-[flow_0.8s_linear_infinite]" : ""}`}
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${SERIES.served} 0 10px, transparent 10px 24px)`,
              backgroundSize: "24px 100%",
              opacity: flowing ? 1 : 0.25,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Traffic */}
        <Panel title="Fire traffic">
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                disabled={busy || s.scenario.running}
                onClick={() => onStart(sc.request)}
                data-testid={`scenario-${sc.id}`}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background/40 p-3 text-left transition hover:border-hover/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Zap className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {sc.label}
                </span>
                <span className="text-[11px] text-muted">{sc.hint}</span>
              </button>
            ))}
          </div>
          {s.scenario.running && (
            <div className="mt-3 flex items-center gap-3" data-testid="scenario-progress">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${(s.scenario.sent / Math.max(1, s.scenario.total)) * 100}%` }} />
              </div>
              <span className="font-mono text-xs text-muted">
                {s.scenario.sent.toLocaleString()}/{s.scenario.total.toLocaleString()}
              </span>
              <button type="button" onClick={onStop} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-foreground">
                <Square className="h-3 w-3" aria-hidden /> Stop
              </button>
            </div>
          )}
        </Panel>

        {/* Chaos */}
        <Panel title="Break the database">
          <Slider
            label="Extra latency"
            value={s.faults.extraLatencyMs}
            min={0}
            max={2000}
            step={50}
            format={(v) => `+${v}ms`}
            onCommit={(v) => onFaults({ ...s.faults, extraLatencyMs: v })}
          />
          <Slider
            label="Error rate"
            value={Math.round(s.faults.errorRate * 100)}
            min={0}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            onCommit={(v) => onFaults({ ...s.faults, errorRate: v / 100 })}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={s.faults.outage}
              onClick={() => onFaults({ ...s.faults, outage: !s.faults.outage })}
              data-testid="fault-outage"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                s.faults.outage ? "border-[#d03b3b] bg-[#d03b3b]/20" : "border-border hover:border-[#d03b3b]/70"
              }`}
            >
              <CircleSlash className="h-3.5 w-3.5 text-[#d03b3b]" aria-hidden />
              {s.faults.outage ? "End outage" : "Start outage"}
            </button>
            <button
              type="button"
              onClick={() => onFaults({ extraLatencyMs: 0, errorRate: 0, outage: false })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Clear faults
            </button>
          </div>
        </Panel>

        {/* Tuning */}
        <Panel title="Tune components">
          <Slider label="Cache TTL" value={c.cache.ttlSeconds} min={1} max={60} step={1} format={(v) => `${v}s`} onCommit={(v) => onConfig({ ...c, cache: { ...c.cache, ttlSeconds: v } })} />
          <Slider
            label="Rate limit"
            value={c.rateLimiter.requestsPerSecond}
            min={10}
            max={500}
            step={10}
            format={(v) => `${v} req/s`}
            onCommit={(v) => onConfig({ ...c, rateLimiter: { ...c.rateLimiter, requestsPerSecond: v } })}
          />
          <Slider label="Timeout" value={c.timeout.milliseconds} min={50} max={2000} step={50} format={(v) => `${v}ms`} onCommit={(v) => onConfig({ ...c, timeout: { ...c.timeout, milliseconds: v } })} />
          <Slider label="Retry attempts" value={c.retries.maxAttempts} min={1} max={5} step={1} format={(v) => `${v}`} onCommit={(v) => onConfig({ ...c, retries: { ...c.retries, maxAttempts: v } })} />
          <Slider label="Connection pool" value={c.database.poolSize} min={1} max={64} step={1} format={(v) => `${v}`} onCommit={(v) => onConfig({ ...c, database: { ...c.database, poolSize: v } })} />
        </Panel>
      </div>

      {/* KPIs */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="sandbox-kpis">
        <Kpi label="Requests / s" value={formatRate(s.current.requestsPerSecond)} />
        <Kpi label="Served / s" value={formatRate(s.current.successPerSecond)} />
        <Kpi label="Failed / s" value={formatRate(s.current.failuresPerSecond)} tone={s.current.failuresPerSecond > 0 ? "critical" : undefined} />
        <Kpi label="429 / s" value={formatRate(s.current.rateLimitedPerSecond)} tone={s.current.rateLimitedPerSecond > 0 ? "warning" : undefined} />
        <Kpi label="p95 latency" value={formatMs(s.current.p95Ms)} />
        <Kpi label="Cache hits" value={c.cache.enabled ? formatPercent(s.current.cacheHitRatio) : "—"} />
        <Kpi label="DB queries / s" value={formatRate(s.current.dbCallsPerSecond)} />
      </dl>

      {/* Charts: one measure per chart, never two y-axes. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StackedBars
          title="Outcomes per second"
          unit="requests"
          series={[
            { key: "served", label: "Served", color: SERIES.served, values: series.map((x) => x.success) },
            { key: "limited", label: "Rate limited", color: SERIES.warning, values: series.map((x) => x.rateLimited) },
            { key: "failed", label: "Failed", color: SERIES.critical, values: series.map((x) => x.circuitOpen + x.timeouts + x.errors + x.queueFull) },
          ]}
        />
        <LineChart title="p95 latency" values={series.map((x) => x.p95Ms)} format={formatMs} />
        <LineChart title="Database queries per second" values={series.map((x) => x.dbCalls)} format={(v) => Math.round(v).toString()} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="What just happened">
          <EventLog events={s.events} />
        </Panel>
        <Panel title="Try this">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted marker:text-accent [&_b]:font-medium [&_b]:text-foreground">
            {EXPERIMENTS.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h4 className="text-sm font-medium">{title}</h4>
      {children}
    </div>
  );
}

function PresetButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border px-3 py-1 text-xs transition hover:border-hover hover:text-hover disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warning" | "critical" }) {
  const Icon = tone === "critical" ? XCircle : tone === "warning" ? AlertTriangle : null;
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 font-mono text-lg">
        {Icon && <Icon className={`h-4 w-4 ${tone === "critical" ? "text-[#d03b3b]" : "text-[#fab219]"}`} aria-label={tone} />}
        {value}
      </dd>
    </div>
  );
}

/** Uncontrolled while dragging; commits on release so one drag is one API call. */
function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex justify-between text-muted">
        {label}
        <span className="font-mono text-foreground">{format(shown)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => setDraft(Number(e.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="accent-[var(--accent)]"
      />
    </label>
  );
}

const LEVEL_ICON = {
  info: { icon: Info, color: "text-muted" },
  success: { icon: CheckCircle2, color: "text-[#0ca30c]" },
  warn: { icon: AlertTriangle, color: "text-[#fab219]" },
  error: { icon: XCircle, color: "text-[#d03b3b]" },
} as const;

function EventLog({ events }: { events: SandboxEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">Nothing yet.</p>;
  return (
    <ol className="flex max-h-72 flex-col gap-2 overflow-auto pr-1" aria-live="polite" data-testid="event-log">
      {[...events].reverse().map((e, i) => {
        const { icon: Icon, color } = LEVEL_ICON[e.level] ?? LEVEL_ICON.info;
        return (
          <li key={`${e.timestamp}-${i}`} className="flex gap-2 text-sm">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-label={e.level} />
            <span className="flex-1">{e.message}</span>
            <time className="shrink-0 font-mono text-[11px] text-muted">{new Date(e.timestamp).toLocaleTimeString()}</time>
          </li>
        );
      })}
    </ol>
  );
}

function pickNewest(a: SandboxSnapshot | null, b: SandboxSnapshot | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a.timestamp) >= Date.parse(b.timestamp) ? a : b;
}
