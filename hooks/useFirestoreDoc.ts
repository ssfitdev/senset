"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** Live-streams a single document. Returns undefined while loading, null if it doesn't exist. */
export function useFirestoreDoc<T>(path: string, docId: string): T | null | undefined {
  const [data, setData] = useState<T | null | undefined>(undefined);

  useEffect(() => {
    setData(undefined);
    const unsub = onSnapshot(doc(db, path, docId), (snap) => {
      setData(snap.exists() ? (snap.data() as T) : null);
    });
    return () => unsub();
  }, [path, docId]);

  return data;
}
