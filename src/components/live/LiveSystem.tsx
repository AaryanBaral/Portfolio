"use client";

import { useState } from "react";
import { API_URL, formatMs, formatPercent, formatRate, formatUptime, type MetricsSnapshot } from "@/lib/api";
import { useEventStream, useInView, type StreamStatus } from "@/lib/useEventStream";
import { Sparkline, SERIES } from "./charts";
import { SectionHeader } from "../ui/SectionHeader";
import { Sandbox } from "./Sandbox";

export function LiveSystem() {
  const [ref, inView] = useInView<HTMLDivElement>();
  // Streams only run while the section is on screen: no idle connections from visitors still in the hero.
  const edge = useEventStream<MetricsSnapshot>(inView ? `${API_URL}/gateway/metrics/stream` : null, "metrics");
  const app = useEventStream<MetricsSnapshot>(inView ? `${API_URL}/api/system/metrics/stream` : null, "metrics");

  return (
    <section id="live-system" className="section-glow scroll-mt-8 py-24" aria-labelledby="live-system-title">
      <div ref={ref}>
        <SectionHeader eyebrow="Live system" id="live-system-title" title="This page is talking to a real backend right now.">
          Every number below is streamed from the production stack over Server-Sent Events: a YARP reverse proxy in front
          of a .NET 10 API and PostgreSQL. The gateway sees everything; the API only sees what the gateway lets through.
        </SectionHeader>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <MetricsPanel
            title="Edge · API gateway"
            subtitle="Rate limiting and caching happen here, before the backend."
            stream={edge}
            tiles={(m) => [
              { label: "Requests / s", value: formatRate(m.requestsPerSecond) },
              { label: "p95 latency", value: formatMs(m.latency.p95Ms) },
              { label: "Edge cache hits", value: formatPercent(m.edge.cacheHitRatio) },
              { label: "429s (60s)", value: m.status.rateLimited.toLocaleString(), tone: m.status.rateLimited > 0 ? "warning" : undefined },
            ]}
          />
          <MetricsPanel
            title="Backend · .NET API"
            subtitle="Only traffic the gateway forwarded."
            stream={app}
            tiles={(m) => [
              { label: "Requests / s", value: formatRate(m.requestsPerSecond) },
              { label: "p95 latency", value: formatMs(m.latency.p95Ms) },
              { label: "Uptime", value: formatUptime(m.uptimeSeconds) },
              { label: "Total served", value: m.totalRequests.toLocaleString() },
            ]}
          />
        </div>

        <RateLimitDemo />
      </div>

      <Sandbox />
    </section>
  );
}

type Tile = { label: string; value: string; tone?: "warning" };

function MetricsPanel({
  title,
  subtitle,
  stream,
  tiles,
}: {
  title: string;
  subtitle: string;
  stream: { data: MetricsSnapshot | null; status: StreamStatus };
  tiles: (m: MetricsSnapshot) => Tile[];
}) {
  const { data, status } = stream;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5" data-testid={`metrics-${title.split(" ")[0].toLowerCase()}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <StatusPill status={status} />
      </div>
      {data ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles(data).map((t) => (
              <div key={t.label} className="rounded-xl bg-background/60 p-3">
                <dt className="text-[11px] text-muted">{t.label}</dt>
                <dd className={`mt-1 font-mono text-lg ${t.tone === "warning" ? "text-[#fab219]" : ""}`}>{t.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="mb-1 text-[11px] text-muted">Requests per second · last 60s</p>
            <Sparkline values={data.requestsPerSecondSeries} />
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-xl bg-background/60 p-4 text-sm text-muted">
          {status === "offline"
            ? "The backend is unreachable. The rest of this site keeps working, and this panel reconnects on its own."
            : "Connecting to the live stream…"}
        </p>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: StreamStatus }) {
  const map = {
    live: { text: "Live", dot: "bg-[#0ca30c]", ring: "border-[#0ca30c]/40" },
    connecting: { text: "Connecting", dot: "bg-[#fab219]", ring: "border-[#fab219]/40" },
    offline: { text: "Offline", dot: "bg-[#d03b3b]", ring: "border-[#d03b3b]/40" },
    idle: { text: "Paused", dot: "bg-muted", ring: "border-border" },
  }[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${map.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot} ${status === "live" ? "animate-pulse" : ""}`} />
      {map.text}
    </span>
  );
}

const DEMO_REQUESTS = 150;
const DEMO_CONCURRENCY = 25;

/** Fires real requests at the gateway so the visitor can watch its rate limiter push back. */
function RateLimitDemo() {
  const [state, setState] = useState<{ running: boolean; ok: number; limited: number; other: number }>({
    running: false,
    ok: 0,
    limited: 0,
    other: 0,
  });
  const done = state.ok + state.limited + state.other;

  async function run() {
    setState({ running: true, ok: 0, limited: 0, other: 0 });
    let next = 0;
    const worker = async () => {
      while (next < DEMO_REQUESTS) {
        next++;
        let outcome: "ok" | "limited" | "other";
        try {
          const response = await fetch(`${API_URL}/api/system/ping`, { cache: "no-store" });
          outcome = response.ok ? "ok" : response.status === 429 ? "limited" : "other";
        } catch {
          outcome = "other";
        }
        setState((s) => ({ ...s, [outcome]: s[outcome] + 1 }));
      }
    };
    await Promise.all(Array.from({ length: DEMO_CONCURRENCY }, worker));
    setState((s) => ({ ...s, running: false }));
  }

  return (
    <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 md:flex-row md:items-center" data-testid="rate-limit-demo">
      <div className="flex-1">
        <h3 className="font-medium">Hit the real rate limiter</h3>
        <p className="mt-1 text-sm text-muted">
          Fire {DEMO_REQUESTS} requests from your browser at the production gateway. It allows 100 per 10 seconds per
          visitor; the rest bounce with <span className="font-mono">429</span> and never reach the backend. Watch the
          edge panel react.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 md:items-end">
        <button
          type="button"
          onClick={run}
          disabled={state.running}
          className="rounded-full border border-accent/40 bg-accent-soft px-5 py-2 text-sm font-medium text-accent transition hover:bg-hover hover:text-on-accent disabled:cursor-wait disabled:opacity-60"
        >
          {state.running ? `Firing… ${done}/${DEMO_REQUESTS}` : `Send ${DEMO_REQUESTS} requests`}
        </button>
        {done > 0 && (
          <p className="font-mono text-sm" aria-live="polite" data-testid="rate-limit-result">
            <Swatch color={SERIES.served} />
            {state.ok} allowed
            <span className="text-muted"> · </span>
            <Swatch color={SERIES.warning} />
            {state.limited} rate limited
            {state.other > 0 && <span className="text-muted"> · {state.other} failed</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: color }} aria-hidden />;
}
