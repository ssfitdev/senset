"use client";

import { MessageSquare } from "lucide-react";

import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import type { FeedbackDoc } from "@/lib/firestore/schema";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(value: FeedbackDoc["createdAt"]): string {
  if (!value || typeof value.toDate !== "function") return "";
  return value.toDate().toLocaleString();
}

export function FeedbackList() {
  const feedback = useFirestoreCollection<FeedbackDoc>("feedback");
  const sorted = feedback
    ? [...feedback].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Feedback &amp; Suggestions</h1>
        {sorted && (
          <span className="text-sm text-muted-foreground">{sorted.length} total</span>
        )}
      </div>

      {!sorted ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <MessageSquare className="size-6" />
          No feedback submitted yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((f) => (
            <div key={f.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{f.studentName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(f.createdAt)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{f.studentId}</p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
