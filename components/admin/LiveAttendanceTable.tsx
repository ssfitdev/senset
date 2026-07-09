"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Search } from "lucide-react";

import { useExamSessions } from "@/hooks/useExamSessions";
import { formatCountdown } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveAttendanceTable() {
  const sessions = useExamSessions();
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (!sessions) return null;
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) => s.studentId.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Live Attendance</h1>
        {sessions && (
          <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
            <Radio className="size-3.5" /> {sessions.length} total
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by Student ID or name…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!filtered ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>District / Division</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time left</TableHead>
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
                  <TableCell>
                    {s.status === "submitted" ? (
                      <Badge variant="secondary">Submitted</Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">
                        In progress
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {s.status === "in_progress" ? formatCountdown(Math.max(0, s.expiresAt - now)) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No students have started the exam yet.
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
