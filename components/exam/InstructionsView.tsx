"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  AlarmClock,
  CheckCircle2,
  Loader2,
  MapPin,
  Scale,
  ShieldAlert,
  Sparkles,
  SaveAll,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthUser } from "@/hooks/useAuthUser";
import { authFetch } from "@/lib/firebase/authFetch";
import { formatCountdown } from "@/lib/format";
import type { ExamStatusResponse } from "@/lib/exam/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { db } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, EXAM_CONFIG_DOC_ID, type ExamSessionDoc, type ExamConfigDoc } from "@/lib/firestore/schema";
import { computeClientWindowState } from "@/lib/exam/clientConfig";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const RULES = [
  { icon: AlarmClock, text: "You have 40 minutes once you click Start Exam — the timer never pauses." },
  { icon: Scale, text: "+2 marks for every correct answer, -1 for every wrong answer. Unanswered questions score 0." },
  { icon: SaveAll, text: "Your answers save automatically. If your connection drops, you can resume right where you left off." },
  { icon: ShieldAlert, text: "Only one attempt is allowed. Once submitted, answers are locked and cannot be changed." },
  { icon: CheckCircle2, text: "The exam auto-submits the moment your timer reaches zero." },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function InstructionsView() {
  const router = useRouter();
  const user = useAuthUser();
  const [status, setStatus] = useState<ExamStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    let unsubscribeSession: (() => void) | null = null;
    let unsubscribeConfig: (() => void) | null = null;

    // 1. Fetch initial static data (like student info) and baseline states
    authFetch("/api/exam/status")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }

        setStatus(data);

        // Immediate redirect check
        if (data.session?.status === "submitted") {
          router.replace(`/exam/${data.student.studentId}/result`);
          return;
        } else if (data.session?.status === "in_progress") {
          router.replace(`/exam/${data.student.studentId}`);
          return;
        }

        const studentId = data.student.studentId;

        // 2. Stream student's exam session document in real-time
        unsubscribeSession = onSnapshot(
          doc(db, COLLECTIONS.examSessions, studentId),
          (snap) => {
            if (cancelled) return;
            if (!snap.exists()) return;
            const sessionData = snap.data() as ExamSessionDoc;

            setStatus((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                session: {
                  status: sessionData.status,
                  startedAt: sessionData.startedAt.toMillis(),
                  expiresAt: sessionData.expiresAt.toMillis(),
                  totalQuestions: sessionData.totalQuestions,
                  score: sessionData.score ?? null,
                  totalCorrect: sessionData.totalCorrect ?? null,
                  totalWrong: sessionData.totalWrong ?? null,
                  totalAttempted: sessionData.totalAttempted ?? null,
                },
              };
            });

            if (sessionData.status === "submitted") {
              router.replace(`/exam/${studentId}/result`);
            } else if (sessionData.status === "in_progress") {
              router.replace(`/exam/${studentId}`);
            }
          },
          (err) => console.error("Real-time session stream failed:", err)
        );

        // 3. Stream the exam configuration document in real-time
        unsubscribeConfig = onSnapshot(
          doc(db, COLLECTIONS.examConfig, EXAM_CONFIG_DOC_ID),
          (snap) => {
            if (cancelled) return;
            if (!snap.exists()) return;
            const configData = snap.data() as ExamConfigDoc;
            const windowState = computeClientWindowState(configData);

            setStatus((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                window: windowState,
                resultsVisibleToStudents: configData.resultsVisibleToStudents,
              };
            });
          },
          (err) => console.error("Real-time config stream failed:", err)
        );
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch initial exam status:", err);
          setError("Couldn't reach the server.");
        }
      });

    return () => {
      cancelled = true;
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeConfig) unsubscribeConfig();
    };
  }, [user, router]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await authFetch("/api/exam/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't start the exam.");
        return;
      }
      router.push(`/exam/${data.sessionId}`);
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <div className="w-full rounded-2xl border bg-card p-6 text-center sm:max-w-sm">
          <ShieldAlert className="mx-auto mb-3 size-8 text-destructive" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" className="mt-4 w-full" onClick={() => router.replace("/")}>
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mx-auto flex min-h-dvh w-full flex-col justify-center gap-4 px-5 py-12 sm:max-w-sm">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const canStart = status.window.status === "open";
  const remaining =
    status.window.status === "open" && status.window.endAt ? status.window.endAt - now : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col justify-center gap-5 px-5 py-12 sm:max-w-sm">
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
        <motion.div
          variants={item}
          className="flex items-center gap-3 rounded-2xl border bg-card p-4"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {initials(status.student.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{status.student.name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {status.student.district}, {status.student.division}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {status.student.studentId}
          </Badge>
        </motion.div>

        <motion.div variants={item} className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-medium">Before you begin</h2>
          <ul className="flex flex-col gap-3.5">
            {RULES.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item}>
          {canStart ? (
            <Button
              size="lg"
              disabled={starting}
              onClick={handleStart}
              className="h-14 w-full text-base font-medium"
            >
              {starting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Preparing your paper…
                </>
              ) : (
                <>
                  Start Exam <Sparkles className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              {status.window.status === "not-open" && status.window.startAt
                ? `The exam hasn't opened yet. Opens in ${formatCountdown(status.window.startAt - now)}.`
                : "The exam window is currently closed."}
            </div>
          )}
          {canStart && remaining !== null && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              New sessions can start for {formatCountdown(remaining)} more
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
