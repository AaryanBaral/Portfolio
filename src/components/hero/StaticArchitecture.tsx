/** The same system as the 3D scene, drawn flat. Used without WebGL or with reduced motion. */
export function StaticArchitecture({ className = "" }: { className?: string }) {
  const cyan = "var(--accent)";
  const violet = "#9b7bff";
  return (
    <svg viewBox="0 0 1000 420" className={className} role="img" aria-label="Architecture: clients, API gateway, .NET services, Redis cache, queue and workers, PostgreSQL">
      <defs>
        <filter id="arch-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g fill="none" strokeWidth="1.5" opacity="0.7">
        <path d="M120 210 C 180 170, 200 170, 230 210" stroke={cyan} />
        <path d="M290 210 C 360 120, 380 110, 430 110" stroke={cyan} />
        <path d="M290 210 L 430 210" stroke={cyan} />
        <path d="M290 210 C 360 300, 380 310, 430 310" stroke={cyan} />
        <path d="M510 110 C 580 70, 620 70, 650 90" stroke={cyan} />
        <path d="M510 210 C 650 210, 760 200, 860 200" stroke={cyan} />
        <path d="M510 310 C 580 330, 610 330, 640 320" stroke={violet} />
        <path d="M720 320 L 790 320" stroke={violet} />
        <path d="M850 320 C 880 300, 890 260, 900 240" stroke={violet} />
      </g>
      <g filter="url(#arch-glow)" fontFamily="var(--font-geist-mono), monospace" fontSize="12" textAnchor="middle">
        <circle cx="80" cy="210" r="38" fill="#0d1219" stroke={cyan} />
        <text x="80" y="270" fill="var(--muted)">clients</text>
        <polygon points="260,168 296,189 296,231 260,252 224,231 224,189" fill="#0d1219" stroke={cyan} />
        <text x="260" y="276" fill="var(--muted)">gateway</text>
        {[110, 210, 310].map((y) => (
          <rect key={y} x="430" y={y - 24} width="80" height="48" rx="10" fill="#0d1219" stroke={cyan} />
        ))}
        <text x="470" y="360" fill="var(--muted)">.net services</text>
        <polygon points="680,50 715,90 680,130 645,90" fill="#0d1219" stroke={cyan} />
        <text x="680" y="152" fill="var(--muted)">redis</text>
        <rect x="640" y="304" width="80" height="32" rx="6" fill="#0d1219" stroke={violet} />
        <text x="680" y="360" fill="var(--muted)">queue</text>
        <circle cx="820" cy="320" r="26" fill="#0d1219" stroke={violet} />
        <text x="820" y="366" fill="var(--muted)">workers</text>
        <ellipse cx="910" cy="160" rx="48" ry="14" fill="#0d1219" stroke={cyan} />
        <path d="M862 160 V 236 A 48 14 0 0 0 958 236 V 160" fill="#0d1219" stroke={cyan} />
        <text x="910" y="276" fill="var(--muted)">postgresql</text>
      </g>
    </svg>
  );
}
