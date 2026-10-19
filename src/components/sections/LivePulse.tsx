"use client";

import { useEffect, useState } from "react";
import { api, formatUptime, type MetricsSnapshot } from "@/lib/api";
import { useInView } from "@/lib/useEventStream";

/** "This site right now": a few real numbers from the gateway. Hidden entirely if the backend is unreachable. */
export function LivePulse() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const load = () =>
      api<MetricsSnapshot>("/gateway/metrics")
        .then((m) => !cancelled && setMetrics(m))
        .catch(() => !cancelled && setMetrics(null));
    load();
    const timer = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [inView]);

  return (
    <div ref={ref} data-testid="live-pulse">
      {metrics && (
        <div>
          <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0ca30c]" aria-hidden />
            This site right now
          </h3>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Gateway uptime" value={formatUptime(metrics.uptimeSeconds)} />
            <Stat label="Requests served" value={metrics.totalRequests.toLocaleString()} />
            <Stat label="p95 at the edge" value={metrics.requestsInWindow > 0 ? `${Math.round(metrics.latency.p95Ms)}ms` : "—"} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
    </div>
  );
}
