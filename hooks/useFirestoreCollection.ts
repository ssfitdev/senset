"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Live-streams an entire top-level collection. Only meant for admin-only,
 * bounded collections (students, questions) where the security rules
 * already restrict reads to the `admin` custom claim — this intentionally
 * replaces the old "fetch once, refetch after every mutation" pattern with
 * a real-time listener so the admin panel always reflects Firestore as-is.
 */
export function useFirestoreCollection<T>(path: string): (T & { id: string })[] | null {
  const [data, setData] = useState<(T & { id: string })[] | null>(null);

  useEffect(() => {
    setData(null);
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })));
    });
    return () => unsub();
  }, [path]);

  return data;
}
