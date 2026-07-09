"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { BellRing, CheckCircle2, CircleX, ListChecks, Target } from "lucide-react";

import { useAuthUser } from "@/hooks/useAuthUser";
import { authFetch } from "@/lib/firebase/authFetch";
import { maxPossibleScore } from "@/lib/exam/scoring";
import type { ExamStatusResponse } from "@/lib/exam/types";
import { FeedbackDialog } from "@/components/exam/FeedbackDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ResultViewProps {
  sessionId: string;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: number;
  tone?: "success" | "danger";
}) {
  return (
    <motion.div
      variants={item}
      className="flex flex-col items-center gap-1.5 rounded-2xl border bg-card px-4 py-5 text-center"
    >
      <Icon
        className={
          tone === "success"
            ? "size-5 text-emerald-500"
            : tone === "danger"
              ? "size-5 text-destructive"
              : "size-5 text-primary"
        }
      />
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </motion.div>
  );
}

export function ResultView({ sessionId }: ResultViewProps) {
  const router = useRouter();
  const user = useAuthUser();
  const [status, setStatus] = useState<ExamStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null || user.uid !== sessionId) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    authFetch("/api/exam/status")
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        if (data.session?.status === "in_progress") {
          router.replace(`/exam/${sessionId}`);
          return;
        }
        if (!data.session) {
          router.replace("/exam/instructions");
          return;
        }
        setStatus(data);
      })
      .catch(() => !cancelled && setError("Couldn't reach the server."));

    return () => {
      cancelled = true;
    };
  }, [user, sessionId, router]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!status || !status.session) {
    return (
      <div className="mx-auto flex min-h-dvh w-full flex-col justify-center gap-4 px-6 py-12 sm:max-w-sm">
        <Skeleton className="mx-auto h-32 w-32 rounded-full" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const { session, resultsVisibleToStudents, student } = status;
  const maxScore = maxPossibleScore(session.totalQuestions);
  const percentage =
    maxScore > 0 ? Math.max(0, Math.round(((session.score ?? 0) / maxScore) * 100)) : 0;
  const firstName = student.name.split(" ")[0];

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 size-80 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full flex-col gap-6 sm:max-w-sm"
      >
        <motion.div variants={item} className="flex flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
            className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 shadow-lg shadow-emerald-500/10"
          >
            <CheckCircle2 className="size-11" />
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight">Thank you, {firstName}!</h1>
          <p className="text-sm text-muted-foreground text-balance">
            Your exam has been submitted and your answers are safely recorded.
          </p>
        </motion.div>

        {resultsVisibleToStudents ? (
          <>
            <motion.div
              variants={item}
              className="mx-auto flex flex-col items-center justify-center gap-1 rounded-full border-8 border-primary/15 bg-card p-8"
            >
              <span className="text-4xl font-bold tabular-nums text-primary">{percentage}%</span>
              <span className="text-xs text-muted-foreground">
                {session.score} / {maxScore} marks
              </span>
            </motion.div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={ListChecks} label="Attempted" value={session.totalAttempted ?? 0} />
              <StatCard
                icon={Target}
                label="Correct"
                value={session.totalCorrect ?? 0}
                tone="success"
              />
              <StatCard icon={CircleX} label="Wrong" value={session.totalWrong ?? 0} tone="danger" />
            </div>
          </>
        ) : (
          <motion.div
            variants={item}
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-8 text-center"
          >
            <BellRing className="size-5 text-primary" />
            <p className="text-sm font-medium">Your result will be published soon.</p>
            <p className="text-xs text-muted-foreground">
              Keep an eye out for an announcement — you may close this page now.
            </p>
          </motion.div>
        )}

        <motion.div variants={item} className="flex justify-center">
          <FeedbackDialog studentId={student.studentId} studentName={student.name} />
        </motion.div>
      </motion.div>
    </div>
  );
}
