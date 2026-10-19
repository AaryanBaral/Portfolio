import { BookOpenText, FlaskConical, ShieldCheck } from "lucide-react";
import { PROFILE } from "@/content/profile";
import { API_URL } from "@/lib/api";
import { GithubIcon } from "../ui/BrandIcons";
import { CodeBlock } from "../ui/CodeBlock";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { SpotlightCard } from "../ui/Spotlight";

/** Outer to inner: each layer may depend only on the ones below it. */
const LAYERS = [
  { name: "Portfolio.Gateway", role: "YARP edge: limits, cache, headers", tone: "edge" },
  { name: "Portfolio.Api", role: "HTTP endpoints, SSE, OpenAPI", tone: "outer" },
  { name: "Portfolio.Infrastructure", role: "EF Core, Postgres, sandbox engine", tone: "outer" },
  { name: "Portfolio.Application", role: "use cases + interfaces", tone: "inner" },
  { name: "Portfolio.Domain", role: "entities + rules, zero dependencies", tone: "core" },
] as const;

const SUITES = [
  { name: "Unit", count: 21, covers: "Domain rules, metrics math, sandbox behaviour with real components" },
  { name: "Gateway", count: 6, covers: "429s and cache hits never reach the backend, headers, 413" },
  { name: "API integration", count: 8, covers: "Real PostgreSQL in Testcontainers, SSE, validation" },
  { name: "End-to-end", count: 53, covers: "Playwright on a real GPU: every page, journeys, frame budget, offline mode" },
];

const GATES = [
  "Warnings are errors, latest recommended analyzers",
  "Strict TypeScript + React Compiler lint rules",
  "≥ 50 fps while scrolling the 3D hero, p95 frame ≤ 25 ms",
  "No console errors, CLS < 0.1, works offline and with reduced motion",
  "Exact dependency pins, nothing younger than two weeks",
  "Non-root containers, secrets only via environment",
];

const RUN = `# 1. Backend: Postgres → API → Gateway
cp .env.example .env            # set POSTGRES_PASSWORD
docker compose up -d --build    # gateway on :8080, docs at /docs

# 2. Frontend
cd frontend && bun install && bun run dev

# 3. Verify everything (88 tests)
scripts/test-all.sh`;

export function Code() {
  const total = SUITES.reduce((sum, s) => sum + s.count, 0);
  return (
    <section id="code" aria-labelledby="code-title" className="section-glow scroll-mt-8 py-24">
      <SectionHeader eyebrow="Code" id="code-title" title="Read the source like a reviewer would.">
        Clean architecture with dependencies pointing inward, a gateway in front, and {total} automated tests keeping it
        honest.
      </SectionHeader>

      <div className="mt-12 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Reveal>
          <SpotlightCard className="h-full p-6">
            <h3 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Layers · dependencies point inward</h3>
            <ol className="mt-5 flex flex-col items-center gap-1.5" data-testid="layers">
              {LAYERS.map((layer, i) => (
                <li
                  key={layer.name}
                  className={`flex w-full flex-col items-center rounded-xl border px-4 py-3 text-center transition ${
                    layer.tone === "core"
                      ? "border-accent/60 bg-accent-soft"
                      : layer.tone === "edge"
                        ? "border-dashed border-border bg-background/40"
                        : "border-border bg-background/60"
                  }`}
                  style={{ maxWidth: `${100 - i * 9}%` }}
                >
                  <span className="font-mono text-sm">{layer.name}</span>
                  <span className="text-xs text-muted">{layer.role}</span>
                </li>
              ))}
            </ol>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={100}>
          <SpotlightCard className="h-full p-6">
            <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              <FlaskConical className="h-4 w-4 text-accent" aria-hidden /> Test suite · {total} tests
            </h3>
            <ul className="mt-5 flex flex-col gap-4">
              {SUITES.map((suite) => (
                <li key={suite.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{suite.name}</span>
                    <span className="font-mono text-muted">{suite.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(suite.count / total) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">{suite.covers}</p>
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </Reveal>

        <Reveal>
          <SpotlightCard className="h-full p-6">
            <h3 className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden /> Quality gates
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              {GATES.map((gate) => (
                <li key={gate} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {gate}
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={100} className="min-w-0">
          <div className="flex h-full flex-col gap-4">
            <CodeBlock code={RUN} label="Run it locally" />
            <div className="flex flex-wrap gap-2">
              <a
                href={`${API_URL}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-hover hover:text-hover"
              >
                <BookOpenText className="h-4 w-4" aria-hidden /> Live API docs
              </a>
              {PROFILE.repositoryUrl && (
                <a
                  href={PROFILE.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent transition hover:bg-hover"
                >
                  <GithubIcon className="h-4 w-4" aria-hidden /> Source on GitHub
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
