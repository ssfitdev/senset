"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud, Users } from "lucide-react";
import { toast } from "sonner";

import { useCsvUpload } from "@/hooks/useCsvUpload";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { authFetch } from "@/lib/firebase/authFetch";
import { studentsUploadSchema, type StudentRowInput } from "@/lib/validation/schemas";
import { AddStudentDialog } from "@/components/admin/AddStudentDialog";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentsUpload() {
  const { rows, fileName, parseError, uploading, handleFile, upload } = useCsvUpload({
    schema: studentsUploadSchema,
    endpoint: "/api/admin/students",
  });
  const students = useFirestoreCollection<StudentRowInput>("students");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  async function handleUpload() {
    const ok = await upload();
    if (ok && inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(studentId: string) {
    const res = await authFetch(`/api/admin/students/${studentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Couldn't delete student.");
      throw new Error("delete failed");
    }
    toast.success("Student deleted.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Students</h1>
        <AddStudentDialog />
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <p className="text-sm font-medium">Upload roster CSV</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Columns:{" "}
          <code className="break-all rounded bg-muted px-1 py-0.5">
            studentId,name,phone,district,division
          </code>
          . Matches by Student ID — re-uploading updates existing rows.
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

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <p className="text-sm font-medium">
            {students ? `${students.length} registered students` : "Loading…"}
          </p>
        </div>
        {!students ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.id}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.district}</TableCell>
                    <TableCell>{s.division}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete({ id: s.id, name: s.name })}
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No students yet — upload a CSV or add one above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this student?"
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.id}) will be permanently removed from the roster. This can't be undone.`
            : ""
        }
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete.id);
        }}
      />
    </div>
  );
}
