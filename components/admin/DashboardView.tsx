"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleDashed,
  FileQuestion,
  Loader2,
  Radio,
  Settings,
  Users,
} from "lucide-react";

import { useExamWindow } from "@/hooks/useExamWindow";
import { useExamSessions } from "@/hooks/useExamSessions";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useFirestoreDoc } from "@/hooks/useFirestoreDoc";
import { formatCountdown } from "@/lib/format";
import type { ExamConfigDoc, QuestionDoc, StudentDoc } from "@/lib/firestore/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function DashboardView() {
  const window_ = useExamWindow();
  const students = useFirestoreCollection<StudentDoc>("students");
  const questions = useFirestoreCollection<QuestionDoc>("questions");
  const sessions = useExamSessions();
  const config = useFirestoreDoc<ExamConfigDoc>("examConfig", "settings");

  const sessionCounts = useMemo(() => {
    if (!sessions || !students) return null;
    const inProgress = sessions.filter((s) => s.status === "in_progress").length;
    const submitted = sessions.filter((s) => s.status === "submitted").length;
    return {
      inProgress,
      submitted,
      notStarted: Math.max(0, students.length - inProgress - submitted),
    };
  }, [sessions, students]);

  const loading = !students || !questions || !sessionCounts || config === undefined;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="mt-2 flex items-center gap-2">
          {window_.status === "open" ? (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
              <Radio className="size-3.5" /> Exam open
            </Badge>
          ) : window_.status === "not-open" ? (
            <Badge variant="secondary" className="gap-1.5">
              <CircleDashed className="size-3.5" /> Not open yet
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              Closed
            </Badge>
          )}
          {window_.status === "not-open" && window_.startAt && (
            <span className="text-xs text-muted-foreground">
              opens in {formatCountdown(window_.startAt - window_.serverNow)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Registered students" value={students.length} />
        <StatCard icon={CircleDashed} label="Not started" value={sessionCounts.notStarted} />
        <StatCard icon={Loader2} label="In progress" value={sessionCounts.inProgress} />
        <StatCard icon={CircleCheck} label="Submitted" value={sessionCounts.submitted} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-4">
          <FileQuestion className="size-5 text-primary" />
          <div>
            <p className="text-sm font-medium">{questions.length} questions in the bank</p>
            <p className="text-xs text-muted-foreground">
              {config ? `${config.questionCount} selected per student` : "Not configured"}
            </p>
          </div>
        </div>
        <Link
          href="/admin/exam-config"
          className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-4 transition-colors hover:bg-muted/60"
        >
          <Settings className="size-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Exam configuration</p>
            <p className="text-xs text-muted-foreground">
              {config
                ? `${config.durationMinutes} min · ${config.isOpen ? "open" : "closed"}`
                : "Set up the exam window"}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
