"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { contrast, DEFAULT_THEME, normalizeHex, onAccent, PRESETS, saveTheme, TOKENS, type ThemeKey, type ThemeTokens } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";

/** Popover above the dock: pick a preset or set any token by colour picker or hex. Changes apply live and persist. */
export function ThemeStudio({ open, onClose, anchorRef }: { open: boolean; onClose: () => void; anchorRef: React.RefObject<HTMLElement | null> }) {
  const theme = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const setToken = (key: ThemeKey, value: string) => saveTheme({ presetId: "custom", tokens: { ...theme.tokens, [key]: value } });
  const t = theme.tokens;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Theme studio"
      data-lenis-prevent
      data-testid="theme-studio"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+100px)] left-1/2 z-50 flex max-h-[70vh] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col md:bottom-4 md:left-[104px] md:translate-x-0 gap-4 overflow-y-auto rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Theme studio</h2>
          <p className="text-xs text-muted">Saved on this device and applied on every page.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close theme studio" className="rounded-lg p-1.5 text-muted hover:text-hover">
          <X className="h-4 w-4" />
        </button>
      </div>

      <section aria-label="Presets">
        <h3 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Presets</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => {
            const selected = theme.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => saveTheme({ presetId: preset.id, tokens: { ...preset.tokens } })}
                data-testid={`preset-${preset.id}`}
                className={`flex flex-col gap-2 rounded-xl border p-2 text-left transition ${selected ? "border-accent" : "border-border hover:border-hover/60"}`}
                style={{ background: preset.tokens.background }}
              >
                <span className="flex h-5 overflow-hidden rounded-md" aria-hidden>
                  {(["surface", "border", "muted", "foreground", "accent", "hover"] as const).map((k) => (
                    <span key={k} className="flex-1" style={{ background: preset.tokens[k] }} />
                  ))}
                </span>
                <span className="flex items-center justify-between text-xs" style={{ color: preset.tokens.foreground }}>
                  {preset.name}
                  {selected && <Check className="h-3.5 w-3.5" style={{ color: preset.tokens.accent }} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Custom colours">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            Custom {theme.presetId === "custom" && <span className="text-accent">· active</span>}
          </h3>
          <button
            type="button"
            onClick={() => saveTheme({ presetId: DEFAULT_THEME.id, tokens: { ...DEFAULT_THEME.tokens } })}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-hover"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {TOKENS.map((token) => (
            <TokenRow key={token.key} label={token.label} hint={token.hint} value={t[token.key]} onChange={(v) => setToken(token.key, v)} />
          ))}
        </ul>
      </section>

      <ContrastReport tokens={t} />
    </div>
  );
}

function TokenRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && normalizeHex(draft) === null;
  const commit = () => {
    if (draft === null) return;
    const hex = normalizeHex(draft);
    if (hex) onChange(hex);
    setDraft(null);
  };
  const id = `token-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <li className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        aria-label={`${label} colour picker`}
        className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
      />
      <label htmlFor={id} className="flex flex-1 flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-[11px] text-muted">{hint}</span>
      </label>
      <input
        id={id}
        value={draft ?? value}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        spellCheck={false}
        aria-invalid={invalid}
        data-testid={id}
        className={`w-24 rounded-lg border bg-background px-2 py-1 font-mono text-xs uppercase outline-none focus:border-hover ${invalid ? "border-[#d03b3b]" : "border-border"}`}
      />
    </li>
  );
}

/** Live WCAG check so visitors can see when a custom palette stops being readable. */
function ContrastReport({ tokens }: { tokens: ThemeTokens }) {
  const checks = [
    { label: "Text on background", ratio: contrast(tokens.foreground, tokens.background), min: 4.5 },
    { label: "Muted on background", ratio: contrast(tokens.muted, tokens.background), min: 4.5 },
    { label: "Text on surface", ratio: contrast(tokens.foreground, tokens.surface), min: 4.5 },
    { label: "Button label on highlight", ratio: contrast(onAccent(tokens.accent), tokens.accent), min: 4.5 },
  ];
  return (
    <section aria-label="Readability" className="rounded-xl border border-border p-3">
      <h3 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Readability (WCAG AA)</h3>
      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {checks.map((c) => {
          const pass = c.ratio >= c.min;
          return (
            <li key={c.label} className="flex items-center justify-between gap-2">
              <span className="text-muted">{c.label}</span>
              <span className="flex items-center gap-1 font-mono">
                {c.ratio.toFixed(1)}:1
                <span className={`rounded px-1 text-[10px] ${pass ? "bg-[#0ca30c]/20 text-foreground" : "bg-[#d03b3b]/25 text-foreground"}`}>
                  {pass ? "AA" : "Low"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
