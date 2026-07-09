"use client";

import { useRef, useState } from "react";
import { FileQuestion, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { useCsvUpload } from "@/hooks/useCsvUpload";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { authFetch } from "@/lib/firebase/authFetch";
import { cn } from "@/lib/utils";
import { questionsUploadSchema, type QuestionRowInput } from "@/lib/validation/schemas";
import { AddQuestionDialog } from "@/components/admin/AddQuestionDialog";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export function QuestionsUpload() {
  const { rows, fileName, parseError, uploading, handleFile, upload } = useCsvUpload({
    schema: questionsUploadSchema,
    endpoint: "/api/admin/questions",
  });
  const questions = useFirestoreCollection<QuestionRowInput>("questions");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; text: string } | null>(null);

  async function handleUpload() {
    const ok = await upload();
    if (ok && inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    const res = await authFetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't delete question.");
      throw new Error("delete failed");
    }
    toast.success("Question deleted.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Questions</h1>
        <AddQuestionDialog />
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium">Upload question bank CSV</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Columns:{" "}
          <code className="break-all rounded bg-muted px-1 py-0.5">
            text,optionA,optionB,optionC,optionD,correctOption,category
          </code>
          . correctOption must be A, B, C, or D. Adds to the existing bank — doesn&apos;t replace it.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="mt-4 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {parseError && <p className="mt-3 text-sm text-destructive">{parseError}</p>}

        {rows && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — {rows.length} rows ready
            </p>
            <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Upload
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <FileQuestion className="size-4 text-primary" />
        <p className="text-sm font-medium">
          {questions ? `${questions.length} questions in the bank` : "Loading…"}
        </p>
      </div>

      {!questions ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{q.text}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {q.category && <Badge variant="secondary">{q.category}</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete({ id: q.id, text: q.text })}
                    aria-label="Delete question"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {OPTION_KEYS.map((key) => {
                  const value = q[`option${key}` as keyof QuestionRowInput];
                  const isCorrect = q.correctOption === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                        isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          isCorrect ? "bg-emerald-500 text-white" : "bg-muted",
                        )}
                      >
                        {key}
                      </span>
                      <span className="truncate">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No questions yet — upload a CSV or add one above.
            </p>
          )}
        </div>
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this question?"
        description={
          pendingDelete
            ? `"${pendingDelete.text}" will be permanently removed from the question bank. This can't be undone.`
            : ""
        }
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete.id);
        }}
      />
    </div>
  );
}
