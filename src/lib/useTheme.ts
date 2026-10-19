"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, loadTheme, STORAGE_KEY, subscribeTheme, type StoredTheme } from "./theme";

const DEFAULT: StoredTheme = { presetId: DEFAULT_THEME.id, tokens: DEFAULT_THEME.tokens };
let cache: { raw: string | null; theme: StoredTheme } = { raw: null, theme: DEFAULT };

/** Stable snapshot: only a new object when the stored value actually changed. */
function getSnapshot(): StoredTheme {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT;
  }
  if (raw !== cache.raw) cache = { raw, theme: raw ? loadTheme() : DEFAULT };
  return cache.theme;
}

export function useTheme(): StoredTheme {
  return useSyncExternalStore(subscribeTheme, getSnapshot, () => DEFAULT);
}
