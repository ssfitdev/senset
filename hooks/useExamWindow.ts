"use client";

import { useCallback, useEffect, useState } from "react";

export type WindowStatus = "unconfigured" | "not-open" | "open" | "closed";

interface WindowStatusResponse {
  status: WindowStatus;
  startAt: number | null;
  endAt: number | null;
  durationMinutes: number | null;
  serverNow: number;
}

/**
 * Polls the server for the exam window state and ticks a locally-corrected
 * "server now" every second in between polls, so the countdown stays smooth
 * without trusting the client's own clock.
 */
export function useExamWindow(pollMs = 60_000) {
  const [data, setData] = useState<WindowStatusResponse | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [tick, setTick] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const res = await fetch("/api/exam/window-status", { cache: "no-store" });
    const json: WindowStatusResponse = await res.json();
    setData(json);
    setClockOffsetMs(json.serverNow - Date.now());
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, pollMs);
    return () => clearInterval(poll);
  }, [refresh, pollMs]);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const serverNow = tick + clockOffsetMs;

  return {
    status: data?.status ?? null,
    startAt: data?.startAt ?? null,
    endAt: data?.endAt ?? null,
    durationMinutes: data?.durationMinutes ?? null,
    serverNow,
    loading: data === null,
    refresh,
  };
}
