"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/firebase/authFetch";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useServerClock } from "@/hooks/useServerClock";
import { Timer } from "@/components/exam/Timer";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionNavigatorSheet } from "@/components/exam/QuestionNavigatorSheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AnswerDoc,
  ExamSessionDoc,
  OptionKey,
  SessionQuestionDoc,
} from "@/lib/firestore/schema";

interface ExamRunnerProps {
  sessionId: string;
}

interface LoadedQuestion {
  order: number;
  text: string;
  options: { key: OptionKey; label: string }[];
}

interface SessionState {
  status: ExamSessionDoc["status"];
  totalQuestions: number;
  startedAt: number;
  expiresAt: number;
}

const TIME_WARNINGS = [
  { ms: 5 * 60_000, message: "5 minutes left — please review and submit soon." },
  { ms: 3 * 60_000, message: "3 minutes left — start wrapping up your answers." },
  { ms: 60_000, message: "Only 1 minute left — submit now if you're done!" },
  { ms: 30_000, message: "30 seconds left! Hurry!" },
];

export function ExamRunner({ sessionId }: ExamRunnerProps) {
  const router = useRouter();
  const user = useAuthUser();
  const clockOffset = useServerClock();

  const [questions, setQuestions] = useState<LoadedQuestion[] | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [currentOrder, setCurrentOrder] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [now, setNow] = useState(() => Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAutoSubmitted = useRef(false);
  const initializedOrder = useRef(false);
  const warnedThresholds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (user === undefined) return;
    if (user === null || user.uid !== sessionId) {
      router.replace("/");
    }
  }, [user, sessionId, router]);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "examSessions", sessionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as ExamSessionDoc;
        setSession({
          status: data.status,
          totalQuestions: data.totalQuestions,
          startedAt: data.startedAt.toMillis(),
          expiresAt: data.expiresAt.toMillis(),
        });
        if (!initializedOrder.current) {
          if (typeof data.lastViewedOrder === "number") {
            setCurrentOrder(data.lastViewedOrder);
          }
          initializedOrder.current = true;
        }
        if (data.status === "submitted") {
          router.replace(`/exam/${sessionId}/result`);
        }
      },
      () => setError("Lost connection to your exam session."),
    );
    return () => unsub();
  }, [user, sessionId, router]);

  // Trap back-navigation and warn on tab close/refresh while the exam is
  // active — the student must submit to leave, not click back or swipe away.
  useEffect(() => {
    if (session?.status !== "in_progress") return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast.warning("You can't leave the exam once started — submit to finish.");
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session?.status]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, "examSessions", sessionId, "sessionQuestions"),
          orderBy("order"),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const loaded: LoadedQuestion[] = snap.docs.map((d) => {
          const data = d.data() as SessionQuestionDoc;
          return {
            order: data.order,
            text: data.text,
            options: [
              { key: "A", label: data.optionA },
              { key: "B", label: data.optionB },
              { key: "C", label: data.optionC },
              { key: "D", label: data.optionD },
            ],
          };
        });
        setQuestions(loaded);
      } catch {
        if (!cancelled) setError("Couldn't load your exam paper. Please refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, "examSessions", sessionId, "answers");
    const unsub = onSnapshot(ref, (snap) => {
      setAnswers((prev) => {
        const next = { ...prev };
        snap.docChanges().forEach((change) => {
          const order = Number(change.doc.id);
          if (change.type === "removed") {
            delete next[order];
          } else {
            next[order] = (change.doc.data() as AnswerDoc).selectedOption;
          }
        });
        return next;
      });
    });
    return () => unsub();
  }, [user, sessionId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const serverNow = now + clockOffset;
  const remainingMs = session ? session.expiresAt - serverNow : null;
  const totalMs = session ? session.expiresAt - session.startedAt : 0;

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await authFetch("/api/exam/submit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't submit. Please try again.");
        return;
      }
      router.replace(`/exam/${sessionId}/result`);
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, sessionId, router]);

  useEffect(() => {
    if (
      remainingMs !== null &&
      remainingMs <= 0 &&
      !hasAutoSubmitted.current &&
      session?.status === "in_progress"
    ) {
      hasAutoSubmitted.current = true;
      toast.info("Time's up — submitting your exam automatically.");
      handleSubmit();
    }
  }, [remainingMs, session?.status, handleSubmit]);

  useEffect(() => {
    if (remainingMs === null || session?.status !== "in_progress") return;
    for (const { ms, message } of TIME_WARNINGS) {
      if (remainingMs <= ms && !warnedThresholds.current.has(ms)) {
        warnedThresholds.current.add(ms);
        toast.warning(message, { duration: 4000 });
      }
    }
  }, [remainingMs, session?.status]);

  const handleSelect = useCallback(
    (order: number, key: OptionKey) => {
      setAnswers((prev) => ({ ...prev, [order]: key }));
      const ref = doc(db, "examSessions", sessionId, "answers", String(order));
      setDoc(ref, { selectedOption: key, answeredAt: serverTimestamp() }).catch(() => {
        toast.error("Couldn't save your answer — check your connection.");
      });
    },
    [sessionId],
  );

  const goTo = useCallback(
    (order: number) => {
      if (!questions) return;
      const clamped = Math.max(0, Math.min(questions.length - 1, order));
      setDirection(clamped >= currentOrder ? 1 : -1);
      setCurrentOrder(clamped);
      const ref = doc(db, "examSessions", sessionId);
      updateDoc(ref, { lastViewedOrder: clamped }).catch(() => {});
    },
    [questions, currentOrder, sessionId],
  );

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!questions || !session) {
    return (
      <div className="mx-auto flex min-h-dvh w-full flex-col gap-4 px-5 py-8 sm:max-w-md">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const current = questions[currentOrder];
  const answeredCount = Object.keys(answers).length;
  const isLast = currentOrder === questions.length - 1;
  const unansweredOrders = questions
    .map((q) => q.order)
    .filter((o) => !(o in answers));

  const isUrgent = remainingMs !== null && remainingMs > 0 && remainingMs <= 30_000;
  const isExtreme = remainingMs !== null && remainingMs > 0 && remainingMs <= 10_000;
  const secondsLeft = remainingMs !== null ? Math.ceil(remainingMs / 1000) : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col sm:max-w-md">
      {isUrgent && (
        <motion.div
          aria-hidden
          className={cn(
            "pointer-events-none fixed inset-0 z-30",
            isExtreme ? "bg-destructive/30" : "bg-destructive/10",
          )}
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: isExtreme ? 0.5 : 1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {isExtreme && secondsLeft !== null && secondsLeft > 0 && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={secondsLeft}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-[10rem] leading-none font-bold text-destructive drop-shadow-xl"
            >
              {secondsLeft}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      <header
        className="sticky top-0 z-10 flex flex-col gap-2 border-b bg-background/90 px-4 pb-2.5 backdrop-blur"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">SensET</p>
          <Timer remainingMs={remainingMs ?? 0} totalMs={totalMs} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Question {current.order + 1} <span className="text-muted-foreground">/ {questions.length}</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            {answeredCount} answered
          </span>
        </div>
        <Progress value={(answeredCount / questions.length) * 100} className="h-1.5" />
      </header>

      <main className="flex-1 px-5 py-6">
        <AnimatePresence mode="wait" custom={direction}>
          <QuestionCard
            key={current.order}
            text={current.text}
            options={current.options}
            selected={answers[current.order] ?? null}
            onSelect={(key) => handleSelect(current.order, key)}
            direction={direction}
          />
        </AnimatePresence>
      </main>

      <footer
        className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t bg-background/90 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <Button
          variant="outline"
          size="icon"
          disabled={currentOrder === 0}
          onClick={() => goTo(currentOrder - 1)}
          aria-label="Previous question"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <QuestionNavigatorSheet
          total={questions.length}
          currentOrder={currentOrder}
          answered={new Set(Object.keys(answers).map(Number))}
          onJump={goTo}
        />

        {isLast ? (
          <Button onClick={() => setConfirmOpen(true)} className="gap-1.5">
            <Check className="size-4" /> Submit
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(currentOrder + 1)}
            aria-label="Next question"
          >
            <ChevronRight className="size-4" />
          </Button>
        )}
      </footer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>
              You've answered {answeredCount} of {questions.length} questions. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>

          {unansweredOrders.length > 0 && (
            <div className="rounded-xl border border-dashed p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CircleDashed className="size-3.5" />
                {unansweredOrders.length} unanswered — tap to jump
              </p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {unansweredOrders.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      goTo(o);
                    }}
                    className="flex size-7 items-center justify-center rounded-md border text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {o + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep reviewing
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Submit Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
