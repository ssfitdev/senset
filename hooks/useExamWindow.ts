"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS, EXAM_CONFIG_DOC_ID, type ExamConfigDoc } from "@/lib/firestore/schema";
import { computeClientWindowState } from "@/lib/exam/clientConfig";

export type { WindowStatus, WindowState } from "@/lib/exam/clientConfig";

/**
 * Subscribes to the Firestore database for the exam window configuration in real-time
 * and ticks a locally-corrected "server now" every second using the offset from
 * the server's time, so countdowns stay synchronized.
 */
export function useExamWindow() {
  const [config, setConfig] = useState<ExamConfigDoc | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  // 1. Fetch server time once to establish a baseline client-server offset
  useEffect(() => {
    let active = true;
    fetch("/api/exam/server-time", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active && typeof json.serverNow === "number") {
          setClockOffsetMs(json.serverNow - Date.now());
        }
      })
      .catch((err) => console.error("Failed to fetch server time baseline:", err));

    return () => {
      active = false;
    };
  }, []);

  // 2. Subscribe to the exam settings document in real-time
  useEffect(() => {
    const docRef = doc(db, COLLECTIONS.examConfig, EXAM_CONFIG_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as ExamConfigDoc);
        } else {
          setConfig(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot subscription failed:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Tick local timer every second to keep the countdown updated
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const serverNow = tick + clockOffsetMs;
  const state = computeClientWindowState(config, serverNow);

  return {
    status: state.status,
    startAt: state.startAt,
    endAt: state.endAt,
    durationMinutes: state.durationMinutes,
    serverNow,
    loading,
    refresh: async () => {}, // No-op since it is real-time
  };
}
