"use client";

import { useEffect, useState } from "react";

/**
 * Returns an offset (ms) such that `Date.now() + offset` estimates the
 * server's clock, corrected for round-trip latency. Re-syncs periodically
 * to correct for drift — the exam timer displayed this way is only ever a
 * preview; the actual deadline is enforced server-side on submit.
 */
export function useServerClock(pollMs = 120_000): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const t0 = Date.now();
      try {
        const res = await fetch("/api/exam/server-time", { cache: "no-store" });
        const { serverNow } = (await res.json()) as { serverNow: number };
        const t1 = Date.now();
        if (!cancelled) setOffset(serverNow + (t1 - t0) / 2 - t1);
      } catch {
        // Keep the previous offset if a sync attempt fails.
      }
    }

    sync();
    const id = setInterval(sync, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return offset;
}
