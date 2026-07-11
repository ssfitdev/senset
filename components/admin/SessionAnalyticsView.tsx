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
  AlertTriangle
} from "lucide-react";
import { useExamSessions } from "@/hooks/useExamSessions";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import type { StudentDoc } from "@/lib/firestore/schema";
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

  // Search, filter, and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [minAttemptedPercent, setMinAttemptedPercent] = useState("all");
  const [sortBy, setSortBy] = useState<"time" | "score" | "timePerQ">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter and process completed sessions
  const submittedSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions
      .filter((s) => s.status === "submitted" && s.submittedAt && s.startedAt)
      .map((s) => {
        const timeTakenMs = s.submittedAt! - s.startedAt;
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
