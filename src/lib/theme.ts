/**
 * Visitor-selectable colour themes. Choices persist in localStorage, are applied before first paint on every
 * page (see `themeInitScript`), and sync across open tabs.
 */

export type ThemeTokens = {
  background: string;
  surface: string;
  border: string;
  foreground: string;
  muted: string;
  accent: string;
  hover: string;
};

export type ThemeKey = keyof ThemeTokens;

export const TOKENS: { key: ThemeKey; label: string; hint: string; cssVar: string }[] = [
  { key: "background", label: "Background", hint: "Page and 3D stage", cssVar: "--background" },
  { key: "surface", label: "Surface", hint: "Cards and panels", cssVar: "--surface" },
  { key: "border", label: "Border", hint: "Dividers and outlines", cssVar: "--border" },
  { key: "foreground", label: "Text", hint: "Headings and body", cssVar: "--foreground" },
  { key: "muted", label: "Muted text", hint: "Secondary copy", cssVar: "--muted" },
  { key: "accent", label: "Highlight", hint: "Accents, links, glow", cssVar: "--accent" },
  { key: "hover", label: "Hover", hint: "Hover and focus states", cssVar: "--hover" },
];

export type ThemePreset = { id: string; name: string; tokens: ThemeTokens };

export const PRESETS: ThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight Cyan",
    tokens: { background: "#060606", surface: "#0d0f12", border: "#1f242c", foreground: "#e8eaed", muted: "#8a93a0", accent: "#3fd0ff", hover: "#7fe3ff" },
  },
  {
    id: "terminal",
    name: "Terminal",
    tokens: { background: "#030a05", surface: "#08140c", border: "#163322", foreground: "#d6f5df", muted: "#7fa58a", accent: "#39ff88", hover: "#9dffc4" },
  },
  {
    id: "amber",
    name: "Solar Amber",
    tokens: { background: "#0b0806", surface: "#15110c", border: "#2c241a", foreground: "#f3ece2", muted: "#a39684", accent: "#ffb547", hover: "#ffd08a" },
  },
  {
    id: "nord",
    name: "Nord Frost",
    tokens: { background: "#0f1218", surface: "#161b24", border: "#262e3b", foreground: "#e5e9f0", muted: "#8f9bb0", accent: "#88c0d0", hover: "#b4dbe6" },
  },
  {
    id: "rose",
    name: "Rosé",
    tokens: { background: "#0d0a0f", surface: "#17121a", border: "#2c2232", foreground: "#f2e9f2", muted: "#a596a8", accent: "#ff7eb6", hover: "#ffb3d4" },
  },
  {
    id: "violet",
    name: "Violet Haze",
    tokens: { background: "#08070d", surface: "#100e1a", border: "#221e36", foreground: "#ebe8f7", muted: "#9690b0", accent: "#9b7bff", hover: "#c3b2ff" },
  },
];

export const DEFAULT_THEME = PRESETS[0];

export type StoredTheme = { presetId: string; tokens: ThemeTokens };

export const STORAGE_KEY = "portfolio.theme.v1";
const CHANGE_EVENT = "portfolio:theme";
const HEX = /^#[0-9a-f]{6}$/i;

export const isHex = (value: string) => HEX.test(value);

/** Expands #abc to #aabbcc and lower-cases; returns null for anything that isn't a hex colour. */
export function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^([^#])/, "#$1").toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX.test(v) ? v : null;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour that stays readable on top of the accent (buttons, selection). */
export const onAccent = (accent: string) => (contrast(accent, "#000000") >= contrast(accent, "#ffffff") ? "#000000" : "#ffffff");

function sanitize(value: unknown): StoredTheme | null {
  if (!value || typeof value !== "object") return null;
  const { presetId, tokens } = value as Partial<StoredTheme>;
  if (typeof presetId !== "string" || !tokens || typeof tokens !== "object") return null;
  for (const { key } of TOKENS) {
    if (typeof tokens[key] !== "string" || !isHex(tokens[key])) return null;
  }
  return { presetId, tokens: { ...tokens } };
}

export function loadTheme(): StoredTheme {
  try {
    const parsed = sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
    if (parsed) return parsed;
  } catch {
    // Storage blocked or corrupted: fall back to the default.
  }
  return { presetId: DEFAULT_THEME.id, tokens: { ...DEFAULT_THEME.tokens } };
}

export function applyTheme(tokens: ThemeTokens) {
  const root = document.documentElement;
  for (const { key, cssVar } of TOKENS) root.style.setProperty(cssVar, tokens[key]);
  root.style.setProperty("--on-accent", onAccent(tokens.accent));
  root.style.colorScheme = luminance(tokens.background) > 0.4 ? "light" : "dark";
}

export function saveTheme(theme: StoredTheme) {
  applyTheme(theme.tokens);
  try {
    if (theme.presetId === DEFAULT_THEME.id) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // Private mode etc.: the theme still applies for this page view.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Notifies on changes from this tab and from other tabs (the `storage` event). */
export function subscribeTheme(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    applyTheme(loadTheme().tokens);
    callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Inlined in <head> so a saved theme is applied before first paint (no flash of the default palette).
 * Self-contained by necessity: it runs before any bundle loads.
 */
export const themeInitScript = `(function(){document.documentElement.classList.add("js");try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"null");if(!t||!t.tokens)return;var m=${JSON.stringify(
  Object.fromEntries(TOKENS.map((t) => [t.key, t.cssVar])),
)},r=document.documentElement,h=/^#[0-9a-f]{6}$/i;for(var k in m){if(!h.test(t.tokens[k]))return}for(var k in m)r.style.setProperty(m[k],t.tokens[k]);var L=function(x){var c=parseInt(x.slice(1),16),a=[c>>16&255,c>>8&255,c&255].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]};var la=L(t.tokens.accent);r.style.setProperty("--on-accent",(la+0.05)/0.05>=1.05/(la+0.05)?"#000000":"#ffffff");r.style.colorScheme=L(t.tokens.background)>0.4?"light":"dark"}catch(e){}})();`;
