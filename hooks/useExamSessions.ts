"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { ExamSessionDoc } from "@/lib/firestore/schema";

export interface SessionRow {
  studentId: string;
  studentName: string;
  district: string;
  division: string;
  status: ExamSessionDoc["status"];
  startedAt: number;
  expiresAt: number;
  submittedAt: number | null;
  totalQuestions: number;
  totalAttempted: number | null;
  totalCorrect: number | null;
  totalWrong: number | null;
  score: number | null;
}

/**
 * Real-time list of all exam sessions, permitted for admins directly by
 * Firestore security rules (unlike students/questions, which are Admin-SDK
 * only) so this stays live without polling a Route Handler.
 */
export function useExamSessions() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    const q = query(collection(db, "examSessions"), orderBy("startedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSessions(
        snap.docs.map((doc) => {
          const data = doc.data() as ExamSessionDoc;
          return {
            studentId: doc.id,
            studentName: data.studentName,
            district: data.district,
            division: data.division,
            status: data.status,
            startedAt: data.startedAt.toMillis(),
            expiresAt: data.expiresAt.toMillis(),
            submittedAt: data.submittedAt ? data.submittedAt.toMillis() : null,
            totalQuestions: data.totalQuestions,
            totalAttempted: data.totalAttempted ?? null,
            totalCorrect: data.totalCorrect ?? null,
            totalWrong: data.totalWrong ?? null,
            score: data.score ?? null,
          };
        }),
      );
    });
    return () => unsub();
  }, []);

  return sessions;
}
