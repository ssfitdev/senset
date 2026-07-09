"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { Download, Trophy } from "lucide-react";

import { useExamSessions } from "@/hooks/useExamSessions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const ALL = "__all__";

export function ResultsTable() {
  const sessions = useExamSessions();
  const [division, setDivision] = useState(ALL);

  const submitted = useMemo(
    () => (sessions ?? []).filter((s) => s.status === "submitted"),
    [sessions],
  );

  const divisions = useMemo(
    () => Array.from(new Set(submitted.map((s) => s.division))).sort(),
    [submitted],
  );

  const filtered = useMemo(
    () => (division === ALL ? submitted : submitted.filter((s) => s.division === division)),
    [submitted, division],
  );

  function exportCsv() {
    const csv = Papa.unparse(
      filtered.map((s) => ({
        studentId: s.studentId,
        name: s.studentName,
        district: s.district,
        division: s.division,
        totalQuestions: s.totalQuestions,
        attempted: s.totalAttempted,
        correct: s.totalCorrect,
        wrong: s.totalWrong,
        score: s.score,
        submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : "",
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "senset-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Results</h1>
        <div className="flex items-center gap-2">
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={!sessions}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {!sessions ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>District / Division</TableHead>
                <TableHead className="text-right">Attempted</TableHead>
                <TableHead className="text-right">Correct</TableHead>
                <TableHead className="text-right">Wrong</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell>
                    <p className="font-medium">{s.studentName}</p>
                    <p className="text-xs text-muted-foreground">{s.studentId}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.district}, {s.division}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.totalAttempted}/{s.totalQuestions}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">
                    {s.totalCorrect}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">
                    {s.totalWrong}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.score}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    <Trophy className="mx-auto mb-2 size-6 text-muted-foreground" />
                    No submissions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
