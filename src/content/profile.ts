/**
 * Everything personal on the site lives here. Edit freely.
 * - `null` hides the item (no placeholder links are ever rendered).
 * - Case studies with `draft: true` are not shown.
 * Facts about this portfolio's own system (numbers, architecture) are real and measured by the test suite.
 */

export type Link = { label: string; href: string };

export const PROFILE = {
  name: "Aaryan Baral",
  role: ".NET Backend Developer",
  /** One line under the name. */
  tagline: "I build the systems behind the screen: APIs, data and the infrastructure that keeps them fast and correct under load.",
  location: "Kathmandu, Nepal" as string | null,
  availability: null as string | null, // e.g. "Open to backend roles from January"
  /** What a recruiter should remember after 30 seconds. Keep to 3–4 lines. */
  highlights: [
    "Backend developer with 1+ years of professional experience shipping production systems in .NET and Node.js.",
    "Owns features end to end: API design, data model, business logic, database work and deployment.",
    "Builds for failure: rate limiting, caching, retries, circuit breakers and queues, and can show each one working.",
    "Works in Clean Architecture, DDD and CQRS, and treats tests and observability as part of the feature.",
  ],
  coreStack: [".NET", "ASP.NET Core", "C#", "EF Core", "SQL Server", "PostgreSQL", "Node.js", "Clean Architecture", "CQRS", "Docker", "React"],
  /** Contact and profile links: set the ones you want shown. */
  email: "aryanbaral1100@gmail.com" as string | null,
  resumeUrl: null as string | null, // put the PDF in /public and use "/resume.pdf"
  links: {
    github: "https://github.com/AaryanBaral" as string | null,
    linkedin: "https://www.linkedin.com/in/aaryan-baral" as string | null,
    x: null as string | null, // e.g. "https://x.com/your-handle"
  },
  repositoryUrl: null as string | null, // this portfolio's source, once public
  education: {
    degree: "Bachelor of Engineering, Software Engineering",
    school: "NCIT (Nepal College of Information Technology), Pokhara University",
    years: "2021 – 2026",
    notes: "Coursework in data structures & algorithms, databases, software architecture, networking and OOP. Active hackathon participant.",
  },
};

export type CaseStudy = {
  id: string;
  draft?: boolean;
  /** Shown on the home page. The first published featured study wins. */
  featured?: boolean;
  title: string;
  kind: string;
  summary: string;
  problem: string;
  approach: string[];
  tradeoffs: { decision: string; because: string }[];
  results: { value: string; label: string }[];
  stack: string[];
  code?: { file: string; language: string; snippet: string };
  /** Where to see it running, if anywhere. */
  liveHref?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "portfolio-platform",
    featured: true,
    title: "A portfolio that is a production system",
    kind: "Distributed system · this site",
    summary:
      "A reverse-proxy gateway, a layered .NET 10 API and PostgreSQL, with live metrics and a per-visitor chaos sandbox. Every claim on this page can be poked.",
    problem:
      "Backend skills are invisible on a portfolio. A list of logos proves nothing, and a static site can't show rate limiting, caching or failure handling. The challenge: make the backend the visible part, safely, with strangers on the internet pressing the buttons.",
    approach: [
      "Put a YARP gateway in front as the only public entry point. It owns per-IP rate limiting, a global concurrency cap, edge caching, CORS, security headers and request-size limits, so abuse is absorbed before it reaches the API.",
      "Split the API into Domain, Application, Infrastructure and Presentation layers, with dependencies pointing inward. Metrics are a shared building block used by both gateway and API.",
      "Measure traffic with a constant-memory rolling histogram (60 one-second buckets, log-scale latency bins) and stream it over Server-Sent Events.",
      "Give each visitor an isolated sandbox built from the real components (token bucket, memory cache, request coalescing, Polly retry, circuit breaker and timeout, a Channel-based write queue) in front of a simulated database, so it can be broken without touching production.",
      "Prove it with 88 automated tests, including Playwright runs against the live stack on a real GPU with a frame-time budget.",
    ],
    tradeoffs: [
      {
        decision: "Simulated database inside the sandbox",
        because: "Visitors can trigger outages and 2,000-request bursts. Real Postgres would turn a demo into a liability; the simulation keeps pool contention, index costs and failure modes realistic.",
      },
      {
        decision: "Server-Sent Events over WebSockets",
        because: "Data flows one way, SSE reconnects for free, works through the proxy without upgrades, and ASP.NET Core 10 has a typed result for it.",
      },
      {
        decision: "Histogram percentiles instead of storing samples",
        because: "Memory and CPU stay flat no matter the traffic; precision is within one 25% bucket, which is plenty for a dashboard.",
      },
      {
        decision: "Rate limits at the gateway, not in the API",
        because: "A rejected request should cost the backend nothing. The API keeps only a concurrency cap on long-lived streams.",
      },
    ],
    results: [
      { value: "0", label: "rate-limited requests reach the API" },
      { value: "59 fps", label: "3D hero while scrolling (p95 frame 16.7 ms)" },
      { value: "88", label: "automated tests: unit, integration, end-to-end" },
      { value: "≤ 50", label: "concurrent sandboxes, auto-expiring" },
    ],
    stack: [".NET 10", "YARP", "PostgreSQL", "EF Core", "Polly", "SSE", "Docker", "Testcontainers", "Playwright", "Next.js", "three.js"],
    code: {
      file: "Infrastructure/Sandbox/SandboxSession.cs",
      language: "csharp",
      snippet: `/// With coalescing on, concurrent misses for the same key share one database call.
private Task LoadAsync(Components components, string key, CancellationToken ct)
{
    if (!components.Config.RequestCoalescing)
        return QueryAsync(components, write: false, ct);

    Lazy<Task>? mine = null;
    mine = new Lazy<Task>(() => LoadSharedAsync(components, key, mine!));
    var shared = _inflightLoads.GetOrAdd(key, mine);
    if (!ReferenceEquals(shared, mine))
        _metrics.Coalesced();          // someone is already loading it
    return shared.Value.WaitAsync(ct); // one caller giving up never fails the rest
}`,
    },
    liveHref: "/live#sandbox",
  },
  {
    id: "case-study-2",
    draft: true,
    title: "Your next project",
    kind: "e.g. Payments API · company or personal",
    summary: "One sentence on what it is and why it mattered.",
    problem: "What was broken, slow or missing, and for whom.",
    approach: ["What you built, step by step."],
    tradeoffs: [{ decision: "A choice you made", because: "Why, and what you gave up." }],
    results: [{ value: "−80%", label: "a measurable outcome" }],
    stack: [],
  },
  {
    id: "case-study-3",
    draft: true,
    title: "Another project",
    kind: "",
    summary: "",
    problem: "",
    approach: [],
    tradeoffs: [],
    results: [],
    stack: [],
  },
];

/** Skills grouped by layer; each links to where it runs on this site. */
export const STACK: { layer: string; blurb: string; items: { name: string; usedFor: string; href: string }[] }[] = [
  {
    layer: "Edge",
    blurb: "Everything a request meets before the backend.",
    items: [
      { name: "YARP reverse proxy", usedFor: "single public entry point, routing, upstream health checks", href: "/live" },
      { name: "Rate limiting", usedFor: "per-IP fixed window, sliding window, concurrency caps → real 429s", href: "/live" },
      { name: "Output caching", usedFor: "edge cache with Vary: Origin; hit ratio shown live", href: "/live" },
      { name: "Security headers + CORS", usedFor: "nosniff, frame-deny, strict origins, correlation ids", href: "/code" },
    ],
  },
  {
    layer: "Services",
    blurb: "Clean, layered .NET with boring, predictable code.",
    items: [
      { name: ".NET 10 / ASP.NET Core", usedFor: "Minimal APIs, typed results, problem details", href: "/code" },
      { name: "Clean architecture", usedFor: "Domain → Application → Infrastructure → API", href: "/code" },
      { name: "OpenAPI + Scalar", usedFor: "self-documenting API at /docs", href: "/code" },
      { name: "Server-Sent Events", usedFor: "live metrics and sandbox snapshots", href: "/live" },
    ],
  },
  {
    layer: "Reliability",
    blurb: "Assume every dependency will fail, then prove it doesn't take you down.",
    items: [
      { name: "Polly", usedFor: "retry with backoff + jitter, circuit breaker, timeouts", href: "/live#sandbox" },
      { name: "Caching + coalescing", usedFor: "cache with TTL, stampede protection", href: "/live#sandbox" },
      { name: "Channels + workers", usedFor: "bounded write queue with backpressure", href: "/live#sandbox" },
      { name: "Load shedding", usedFor: "token bucket in front of a contended pool", href: "/live#sandbox" },
    ],
  },
  {
    layer: "Data",
    blurb: "Relational first, measured always.",
    items: [
      { name: "PostgreSQL 17", usedFor: "visit analytics, identity columns, indexes", href: "/code" },
      { name: "EF Core 10 + Npgsql", usedFor: "migrations, repository behind an interface", href: "/code" },
      { name: "Query cost", usedFor: "index vs full scan made tangible in the sandbox", href: "/live#sandbox" },
    ],
  },
  {
    layer: "Quality & ops",
    blurb: "If it isn't tested and observable, it isn't done.",
    items: [
      { name: "xUnit v3 + Testcontainers", usedFor: "unit + integration tests against real Postgres", href: "/code" },
      { name: "Playwright", usedFor: "end-to-end across the live stack, incl. frame budgets", href: "/code" },
      { name: "Docker", usedFor: "non-root multi-stage images, compose stack", href: "/code" },
      { name: "Metrics", usedFor: "constant-memory histograms, p50/p95/p99", href: "/live" },
    ],
  },
];

export type Experience = {
  draft?: boolean;
  company: string;
  role: string;
  /** Free text, e.g. "Mar 2024". `end: null` means current. */
  start: string;
  end: string | null;
  location?: string | null;
  summary: string;
  highlights: string[];
  stack: string[];
  url?: string | null;
};

/** Newest first. The first published entry is shown on the home page; all of them on /about. */
export const EXPERIENCE: Experience[] = [
  {
    // Kept deliberately generic: no client, module or implementation specifics from current work.
    company: "SumX",
    role: "Junior .NET Developer",
    start: "Jun 2026",
    end: null,
    location: "Kathmandu, Nepal",
    summary: "Backend development on a cloud-based ERP platform, building and maintaining business modules end to end.",
    highlights: [
      "Deliver features end to end across the API, business logic and database layers, from data model to release.",
      "Work on transactional business workflows with approvals, auditing and role-based access.",
      "Improve data access performance and reliability through query optimisation, data migrations and safe, transactional writes.",
      "Collaborate with the team on larger modules, and ship fixes and enhancements across the platform.",
    ],
    stack: [".NET", "C#", "EF Core", "SQL"],
    url: "https://sumxai.com",
  },
  {
    company: "Vijji AI",
    role: "Backend Developer (Contract)",
    start: "Mar 2026",
    end: "May 2026",
    location: "Kathmandu, Nepal",
    summary: "Extended an MVP into a conversational assistant for automotive parts: users query availability and place orders through chat.",
    highlights: [
      "Implemented product catalogue APIs, the order flow and session-based conversation context.",
      "Extended and optimised the existing MVP for production use.",
    ],
    stack: ["Node.js", "REST APIs"],
  },
  {
    company: "Crown Institute",
    role: "Junior Software Developer",
    start: "Jan 2025",
    end: "Feb 2026",
    location: "Kathmandu, Nepal",
    summary: "Sole backend developer across the institute's products, from API design to deployment.",
    highlights: [
      "Designed and built a full-stack Employee Tracking System (.NET 8 Web API + React), live in production.",
      "Architected a Binary Marketing System with a real-time monetary calculation engine, using Clean Architecture.",
      "Built the institute's official website and a video-based researcher portfolio (Node.js / Express + React), both live.",
      "Owned API design, database schemas, JWT + refresh-token authentication and VPS CI/CD pipelines.",
    ],
    stack: [".NET 8", "C#", "React", "Node.js", "SQL Server", "CI/CD"],
  },
  {
    company: "Jash Digitals",
    role: "Backend Developer Intern",
    start: "Apr 2023",
    end: "Oct 2023",
    location: "Kathmandu, Nepal",
    summary: "Built the complete backend for a real-estate listing platform on my own.",
    highlights: [
      "JWT authentication with refresh-token rotation, file uploads and validation middleware.",
      "Took the system to production-ready; the launch was cancelled for business reasons, not technical ones.",
    ],
    stack: ["Node.js", "Express", "MongoDB"],
  },
];

export type Project = { name: string; stack: string[]; description: string; links: Link[] };

/** Smaller projects, shown as cards under the case studies on /projects. */
export const PROJECTS: Project[] = [
  {
    name: "Real-time chat application",
    stack: ["Node.js", "Socket.io", "React", "MongoDB", "Cloudinary"],
    description: "Messenger-style chat with friend requests, real-time bidirectional messaging over WebSockets, and media sharing.",
    links: [{ label: "Code", href: "https://github.com/AaryanBaral/Chat-App" }],
  },
  {
    name: "Quantum Education platform",
    stack: ["Node.js", "React"],
    description: "Freelance backend for an education consultancy: API design, authentication and data management. Live in production.",
    links: [
      { label: "Live", href: "https://quantumeducation.edu.np/" },
      { label: "Code", href: "https://github.com/pratech143/Quantum-Education" },
    ],
  },
  {
    name: "Reverse proxy + load balancer",
    stack: ["Go"],
    description: "Hackathon build: a reverse proxy with round-robin load balancing, written while learning Go.",
    links: [],
  },
  {
    name: "Odoo custom add-on modules",
    stack: ["Python", "Odoo"],
    description: "Custom ERP modules extending Odoo's core, built on its ORM and module architecture.",
    links: [{ label: "Code", href: "https://github.com/AaryanBaral/Odoo-Custom-Addons" }],
  },
];
