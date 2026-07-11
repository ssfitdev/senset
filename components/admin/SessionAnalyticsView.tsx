"use client";

import { useMemo, useState } from "react";
import { 
  ArrowUpDown, 
  Clock, 
  Hourglass, 
  Search, 
  Timer, 
  Trophy, 
  TrendingUp, 
  Users,
  Activity,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { useExamSessions } from "@/hooks/useExamSessions";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import type { StudentDoc, FeedbackDoc } from "@/lib/firestore/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const ALL = "__all__";

// Formatter for milliseconds to mm:ss or hh:mm:ss
function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function SessionAnalyticsView() {
  const sessions = useExamSessions();
  const students = useFirestoreCollection<StudentDoc>("students");
  const feedback = useFirestoreCollection<FeedbackDoc>("feedback");

  // Search, filter, and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [minAttemptedPercent, setMinAttemptedPercent] = useState("all");
  const [sortBy, setSortBy] = useState<"time" | "score" | "timePerQ">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAllAffected, setShowAllAffected] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);

  // Filter and process completed sessions
  const submittedSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => s.status === "submitted" && s.submittedAt && s.startedAt)
      .map((s) => {
        const actualTimeMs = s.submittedAt! - s.startedAt;
        const maxTimeMs = 40 * 60 * 1000; // 40 minutes in ms
        const timeTakenMs = Math.min(actualTimeMs, maxTimeMs);
        const totalAttempted = s.totalAttempted ?? 0;
        const totalQ = s.totalQuestions || 50;
        const timePerQSec = totalAttempted > 0 ? (timeTakenMs / 1000) / totalAttempted : 0;
        const attemptedPercent = totalQ > 0 ? (totalAttempted / totalQ) * 100 : 0;

        return {
          ...s,
          timeTakenMs,
          timePerQSec,
          attemptedPercent,
        };
      });
  }, [sessions]);

  // Outage diagnostic data: identify students whose answers were lost (0 attempts)
  // or whose auto-submissions hung and completed significantly after expiration (> 60s)
  const affectedStudents = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => {
        if (s.status !== "submitted") return false;
        const delayMs = s.submittedAt && s.expiresAt ? s.submittedAt - s.expiresAt : 0;
        const isZeroAttempt = s.totalAttempted === 0 || s.totalAttempted === null;
        return delayMs > 60000 || isZeroAttempt;
      })
      .map((s) => {
        const delayMs = s.submittedAt && s.expiresAt ? s.submittedAt - s.expiresAt : 0;
        const isZeroAttempt = s.totalAttempted === 0 || s.totalAttempted === null;
        
        let issue = "";
        let details = "";
        let severity = 0;
        
        if (isZeroAttempt) {
          issue = "Saved Progress Lost (0 Attempts)";
          details = "Student submitted the exam but has 0 questions attempted. Indicates database save failures or sudden connection loss during the outage.";
          severity = 1000000; // Priority rank 1
        } else {
          const delaySecs = Math.round(delayMs / 1000);
          issue = "Overtime Auto-Submission";
          details = `Submitted ${delaySecs}s (${Math.round(delaySecs / 60)}m) after the exam expired. The student's screen timer finished, but the server failed to process the auto-submit request on time due to timeout locks.`;
          severity = delayMs; // Rank by length of submission delay
        }
        
        return {
          ...s,
          issue,
          details,
          severity,
          delayMs,
          isZeroAttempt,
        };
      })
      .sort((a, b) => b.severity - a.severity);
  }, [sessions]);

  // Filter feedback logs to extract student-reported support tickets
  const studentReports = useMemo(() => {
    if (!feedback) return [];
    return feedback
      .filter((f) => f.isIssueReport === true || f.message.startsWith("[ISSUE REPORT:"))
      .map((f) => {
        const isReportFormat = f.message.startsWith("[ISSUE REPORT:");
        let issueTypeLabel = "Other Technical Issue";
        let cleanMessage = f.message;
        
        if (isReportFormat) {
          const closeBracketIdx = f.message.indexOf("]");
          if (closeBracketIdx !== -1) {
            issueTypeLabel = f.message.slice(15, closeBracketIdx);
            cleanMessage = f.message.slice(closeBracketIdx + 1).trim();
          }
        }
        
        return {
          ...f,
          issueTypeLabel,
          cleanMessage,
        };
      })
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  }, [feedback]);

  // Overall session metrics
  const metrics = useMemo(() => {
    if (!sessions || !students) return null;
    const totalRegistered = students.length;
    const totalStarted = sessions.length;
    const totalSubmitted = sessions.filter((s) => s.status === "submitted").length;
    const totalInProgress = sessions.filter((s) => s.status === "in_progress").length;
    const completionRate = totalStarted > 0 ? (totalSubmitted / totalStarted) * 100 : 0;
    
    // Average completion time
    const completed = submittedSessions;
    const avgTimeMs = completed.length > 0 
      ? completed.reduce((sum, s) => sum + s.timeTakenMs, 0) / completed.length 
      : 0;

    // Average questions attempted
    const avgAttempted = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.totalAttempted ?? 0), 0) / completed.length
      : 0;

    // Fastest submitted session (attempting at least 50% to be legitimate)
    const legitCompleted = completed.filter(s => s.attemptedPercent >= 50);
    const fastest = legitCompleted.length > 0
      ? [...legitCompleted].sort((a, b) => a.timeTakenMs - b.timeTakenMs)[0]
      : null;

    return {
      totalRegistered,
      totalStarted,
      totalSubmitted,
      totalInProgress,
      completionRate,
      avgTimeMs,
      avgAttempted,
      fastest,
    };
  }, [sessions, students, submittedSessions]);

  // Filtered and sorted leaderboard data
  const filteredLeaderboard = useMemo(() => {
    let result = [...submittedSessions];

    // Search filter (Name, ID, District, Division)
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.studentName.toLowerCase().includes(term) ||
          s.studentId.toLowerCase().includes(term) ||
          s.district.toLowerCase().includes(term) ||
          s.division.toLowerCase().includes(term)
      );
    }

    // Attempt percentage filter
    if (minAttemptedPercent !== "all") {
      const minVal = parseFloat(minAttemptedPercent);
      result = result.filter((s) => s.attemptedPercent >= minVal);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "time") {
        comparison = a.timeTakenMs - b.timeTakenMs;
      } else if (sortBy === "score") {
        comparison = (b.score ?? 0) - (a.score ?? 0);
      } else if (sortBy === "timePerQ") {
        comparison = a.timePerQSec - b.timePerQSec;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [submittedSessions, searchTerm, minAttemptedPercent, sortBy, sortOrder]);

  // SVG Chart 1: Time Taken Distribution (Histogram)
  const timeDistributionData = useMemo(() => {
    if (submittedSessions.length === 0) return [];
    
    // Time buckets in minutes
    const buckets = [
      { label: "< 5m", min: 0, max: 5 * 60 * 1000, count: 0 },
      { label: "5-10m", min: 5 * 60 * 1000, max: 10 * 60 * 1000, count: 0 },
      { label: "10-15m", min: 10 * 60 * 1000, max: 15 * 60 * 1000, count: 0 },
      { label: "15-20m", min: 15 * 60 * 1000, max: 20 * 60 * 1000, count: 0 },
      { label: "20-30m", min: 20 * 60 * 1000, max: 30 * 60 * 1000, count: 0 },
      { label: "30m+", min: 30 * 60 * 1000, max: Infinity, count: 0 },
    ];

    submittedSessions.forEach((s) => {
      for (const bucket of buckets) {
        if (s.timeTakenMs >= bucket.min && s.timeTakenMs < bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    return buckets;
  }, [submittedSessions]);

  // SVG Chart 2: Session Starts by Hour (Peak Traffic Line/Bar Chart)
  const startsByHourData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // Initialize 24 hours
    const hours: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hours[h] = 0;
    }

    sessions.forEach((s) => {
      const date = new Date(s.startedAt);
      const hour = date.getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    // Map to array and filter out hours with 0 traffic on both ends to make chart look better
    const allHours = Object.keys(hours).map((h) => ({
      hour: parseInt(h),
      label: format(new Date().setHours(parseInt(h), 0, 0, 0), "h a"),
      count: hours[parseInt(h)],
    }));

    // Find first and last active hour
    const activeIndices = allHours.map((x, i) => x.count > 0 ? i : -1).filter(x => x !== -1);
    if (activeIndices.length === 0) return allHours.slice(8, 20); // Default daytime view

    const startIdx = Math.max(0, activeIndices[0] - 1);
    const endIdx = Math.min(23, activeIndices[activeIndices.length - 1] + 1);

    return allHours.slice(startIdx, endIdx + 1);
  }, [sessions]);

  const toggleSort = (field: "time" | "score" | "timePerQ") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "score" ? "desc" : "asc"); // Scores default to highest first
    }
  };

  const loading = !sessions || !students || !metrics;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  // Calculate SVG heights and scales dynamically
  const maxTimeCount = Math.max(...timeDistributionData.map(d => d.count), 1);
  const maxHourCount = Math.max(...startsByHourData.map(d => d.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Session Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed metrics, time analysis, anomalies, and traffic statistics for exam sessions.
        </p>
      </div>

      {/* Metric Summaries */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Avg Completion Time</span>
            <Clock className="size-4 text-primary" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.avgTimeMs > 0 ? formatDuration(metrics.avgTimeMs) : "0m 0s"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Across all completed sessions
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Legit Speedrun Record</span>
            <Timer className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {metrics.fastest ? formatDuration(metrics.fastest.timeTakenMs) : "N/A"}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {metrics.fastest ? `${metrics.fastest.studentName} (${metrics.fastest.totalAttempted} attempted)` : "Min. 50% attempted"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Avg Questions Attempted</span>
            <TrendingUp className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.avgAttempted.toFixed(1)} <span className="text-xs text-muted-foreground">/ 50</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Completion Rate: {metrics.completionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active & In-Progress</span>
            <Activity className="size-4 text-amber-500 animate-pulse" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {metrics.totalInProgress} <span className="text-xs text-muted-foreground">sessions</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Out of {metrics.totalStarted} total started
            </p>
          </div>
        </div>
      </div>

      {/* SVG Charts section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Time taken distribution */}
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Time Taken Distribution</h2>
          {submittedSessions.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
              No completed sessions to chart.
            </div>
          ) : (
            <div className="relative w-full h-48 flex flex-col justify-between">
              {/* SVG Histrogram Chart */}
              <svg className="w-full h-36" viewBox="0 0 400 150">
                <g transform="translate(0, 10)">
                  {/* Grid Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const y = (120 / 3) * i;
                    return (
                      <line 
                        key={i} 
                        x1="0" 
                        y1={y} 
                        x2="370" 
                        y2={y} 
                        stroke="hsl(var(--muted)/0.4)" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                    );
                  })}

                  {/* Bars */}
                  {timeDistributionData.map((d, i) => {
                    const barWidth = 45;
                    const spacing = 15;
                    const x = i * (barWidth + spacing) + 20;
                    const height = (d.count / maxTimeCount) * 110;
                    const y = 120 - height;
                    return (
                      <g key={i} className="group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="4"
                          fill="url(#timeGrad)"
                          className="transition-all duration-300 hover:opacity-85"
                        />
                        {/* Hover Tooltip Value */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          className="text-[9px] font-semibold fill-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          {d.count}
                        </text>
                        {/* X-axis labels */}
                        <text
                          x={x + barWidth / 2}
                          y="135"
                          textAnchor="middle"
                          className="text-[9px] fill-muted-foreground"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}
                  {/* Definition of Gradients */}
                  <defs>
                    <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary)/0.4)" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Exam Sessions Started by Hour */}
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Traffic: Session Starts by Hour</h2>
          {sessions && sessions.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
              No sessions started to chart.
            </div>
          ) : (
            <div className="relative w-full h-48 flex flex-col justify-between">
              {/* SVG Bar Chart for Hours */}
              <svg className="w-full h-36" viewBox="0 0 400 150">
                <g transform="translate(0, 10)">
                  {/* Grid Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const y = (120 / 3) * i;
                    return (
                      <line 
                        key={i} 
                        x1="0" 
                        y1={y} 
                        x2="385" 
                        y2={y} 
                        stroke="hsl(var(--muted)/0.4)" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                    );
                  })}

                  {/* Hourly Columns */}
                  {startsByHourData.map((d, i) => {
                    const totalBars = startsByHourData.length;
                    const chartWidth = 370;
                    const barWidth = Math.max(12, Math.floor((chartWidth / totalBars) * 0.7));
                    const spacing = Math.floor((chartWidth / totalBars) * 0.3);
                    const x = i * (barWidth + spacing) + 15;
                    const height = (d.count / maxHourCount) * 110;
                    const y = 120 - height;

                    return (
                      <g key={i} className="group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="2"
                          fill="url(#hourGrad)"
                          className="transition-all duration-300 hover:opacity-85"
                        />
                        {/* Hover Tooltip Value */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          className="text-[9px] font-semibold fill-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          {d.count}
                        </text>
                        {/* X-axis labels (render alternate or specific ticks if there are too many) */}
                        {(totalBars < 12 || i % 2 === 0 || i === totalBars - 1) && (
                          <text
                            x={x + barWidth / 2}
                            y="135"
                            textAnchor="middle"
                            className="text-[8px] fill-muted-foreground"
                          >
                            {d.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {/* Definition of Gradients */}
                  <defs>
                    <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16, 185, 129)" />
                      <stop offset="100%" stopColor="rgba(16, 185, 129, 0.3)" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Server Outage & Disruption Report */}
      {affectedStudents.length > 0 && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 dark:bg-destructive/10 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive animate-pulse" />
            <h2 className="text-base font-bold text-destructive">Server Outage & Disruption Diagnostic Report</h2>
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              During the exam session, database timeouts and server write locks occurred. This resulted in two failure modes:
            </p>
            <ul className="list-disc pl-4 text-xs text-muted-foreground mt-1.5 space-y-1">
              <li><strong>Critical Progress Loss</strong>: The database failed to save any questions for the student, resulting in a 0/50 submitted exam score.</li>
              <li><strong>Delayed Auto-Submission</strong>: When the student's timer expired, the auto-submit hung on the server. The exam was only successfully closed when the backend recovered or force-submitted the session later, showing extreme delayed submission times.</li>
            </ul>
          </div>
          
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-16 text-center text-xs">Rank</TableHead>
                  <TableHead className="text-xs">Student</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Impact Type</TableHead>
                  <TableHead className="text-right text-xs">Delay / Disruption Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllAffected ? affectedStudents : affectedStudents.slice(0, 5)).map((s, idx) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="text-center font-bold text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-xs text-foreground">{s.studentName}</p>
                      <p className="text-[9px] text-muted-foreground">{s.studentId}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.district}, {s.division}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.isZeroAttempt ? (
                        <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-600">
                          Critical Progress Loss
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600">
                          Overtime Auto-Submit
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground">
                      {s.isZeroAttempt ? (
                        <span className="text-red-600 font-bold">0/50 Answers Saved</span>
                      ) : (
                        <span>+{Math.round(s.delayMs / 1000)}s (~{Math.round(s.delayMs / 60000)}m late)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-destructive/15 pt-3">
            <span className="text-[11px] text-muted-foreground">
              Total impacted: <strong>{affectedStudents.length} students</strong> ({affectedStudents.filter(x => x.isZeroAttempt).length} Critical, {affectedStudents.filter(x => !x.isZeroAttempt).length} Delayed)
            </span>
            {affectedStudents.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowAllAffected(!showAllAffected)}
              >
                {showAllAffected ? "Collapse List" : `Show All ${affectedStudents.length} Affected`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Student-Reported Outage & Technical Issues */}
      {studentReports.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-indigo-500" />
            <h2 className="text-base font-bold text-foreground">Student-Reported Support Tickets & Outage Logs</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The following issues were submitted directly by students using the support form, detailing their client-side glitches during the server bottleneck:
          </p>

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-16 text-center text-xs">No.</TableHead>
                  <TableHead className="text-xs">Student</TableHead>
                  <TableHead className="text-xs">Problem Category</TableHead>
                  <TableHead className="text-xs">Reported Time</TableHead>
                  <TableHead className="text-xs">Description Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllReports ? studentReports : studentReports.slice(0, 5)).map((f, idx) => {
                  const dateStr = f.createdAt && typeof f.createdAt.toDate === "function"
                    ? f.createdAt.toDate().toLocaleString()
                    : "";
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="text-center font-bold text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <p className="font-semibold text-xs text-foreground truncate" title={f.studentName}>{f.studentName}</p>
                        <p className="text-[9px] text-muted-foreground">{f.studentId}</p>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-[9.5px] font-bold text-indigo-600 truncate" title={f.issueTypeLabel}>
                          {f.issueTypeLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap text-xs">
                        {dateStr}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                        <p className="line-clamp-2 hover:line-clamp-none text-xs transition-all leading-normal whitespace-pre-wrap cursor-pointer" title="Full description">
                          {f.cleanMessage}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-muted/15 pt-3">
            <span className="text-[11px] text-muted-foreground">
              Total Support Reports Filed: <strong>{studentReports.length} student reports</strong>
            </span>
            {studentReports.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-muted-foreground/20 text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                onClick={() => setShowAllReports(!showAllReports)}
              >
                {showAllReports ? "Collapse List" : `Show All ${studentReports.length} Reports`}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard/Analysis Grid */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Student Time & Attempt Analysis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Displays students by total time taken. Filter attempts to identify speedruns vs. early aborts.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-[220px]">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search student or location..."
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Min Attempted Filter */}
            <Select value={minAttemptedPercent} onValueChange={setMinAttemptedPercent}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Min Questions Attempted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Questions</SelectItem>
                <SelectItem value="50">Attempted ≥ 50% (25+ Q)</SelectItem>
                <SelectItem value="80">Attempted ≥ 80% (40+ Q)</SelectItem>
                <SelectItem value="100">Attempted 100% (All 50 Q)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Speedrun leaderboard table */}
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>District / Division</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" className="-mr-2 gap-1" onClick={() => toggleSort("time")}>
                    Time Taken
                    <ArrowUpDown className="size-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Attempted</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" className="-mr-2 gap-1" onClick={() => toggleSort("timePerQ")}>
                    Time / Q
                    <ArrowUpDown className="size-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" className="-mr-2 gap-1" onClick={() => toggleSort("score")}>
                    Score
                    <ArrowUpDown className="size-3.5" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaderboard.map((s, idx) => {
                // Flag speedruns that are extremely short (less than 2 minutes with high attempted count)
                const isSuspicious = s.timeTakenMs < 2 * 60 * 1000 && s.attemptedPercent >= 80;
                
                return (
                  <TableRow key={s.studentId} className={isSuspicious ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}>
                    <TableCell className="text-center font-semibold text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{s.studentName}</p>
                          <p className="text-[10px] text-muted-foreground">{s.studentId}</p>
                        </div>
                        {isSuspicious && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600" title="Extremely fast completion with high question attempt rate.">
                            <AlertTriangle className="size-3" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.district}, {s.division}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground tabular-nums">
                      {formatDuration(s.timeTakenMs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.totalAttempted} / {s.totalQuestions}
                      <span className="text-[10px] text-muted-foreground block">
                        ({s.attemptedPercent.toFixed(0)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground tabular-nums text-sm">
                      {s.timePerQSec.toFixed(1)}s
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground tabular-nums">
                      {s.score}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLeaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    <Trophy className="mx-auto mb-2 size-6 text-muted-foreground" />
                    No sessions match the current search or filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
