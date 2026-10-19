"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "idle" | "connecting" | "live" | "offline";

/**
 * Subscribes to a Server-Sent Events stream while `url` is non-null. EventSource reconnects on its own;
 * after a few consecutive failures the status reads "offline" so the UI can degrade gracefully.
 */
export function useEventStream<T>(url: string | null, eventName: string) {
  const [state, setState] = useState<{ url: string | null; data: T | null; status: StreamStatus }>({
    url: null,
    data: null,
    status: "idle",
  });

  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    let failures = 0;
    source.addEventListener(eventName, (event) => {
      failures = 0;
      setState({ url, data: JSON.parse((event as MessageEvent<string>).data) as T, status: "live" });
    });
    source.onerror = () => {
      failures++;
      setState((prev) => ({ ...prev, url, status: failures >= 3 ? "offline" : "connecting" }));
    };
    return () => source.close();
  }, [url, eventName]);

  // A different (or no) url means anything held is stale.
  if (state.url !== url) return { data: null, status: url ? ("connecting" as const) : ("idle" as const) };
  return { data: state.data, status: state.status };
}

/** True while the element is within (or near) the viewport; streams pause when it isn't. */
export function useInView<E extends Element>(rootMargin = "200px") {
  const ref = useRef<E>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}
