"use client";

import { useMemo, useState } from "react";
import { 
  BarChart3, 
  MapPin, 
  Trophy, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Calendar,
  Percent,
  FileSpreadsheet
} from "lucide-react";
import { useExamSessions } from "@/hooks/useExamSessions";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import type { StudentDoc } from "@/lib/firestore/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AnalyticsView() {
  const sessions = useExamSessions();
  const students = useFirestoreCollection<StudentDoc>("students");

  // Toggle state to view stats by either Registered Students or Exam Participants (Submitted)
  const [breakdownMode, setBreakdownMode] = useState<"registered" | "submitted">("registered");

  // Process data for charts and statistics
  const processedData = useMemo(() => {
    if (!students || !sessions) return null;

    const submittedSessions = sessions.filter(
      (s) => s.status === "submitted" && s.score !== null
    );

    // 1. Division Stats
    const divisionMap: Record<string, { registered: number; submitted: number; totalScore: number; maxScore: number }> = {};
    
    students.forEach((st) => {
      const div = st.division || "Unknown";
      if (!divisionMap[div]) {
        divisionMap[div] = { registered: 0, submitted: 0, totalScore: 0, maxScore: 0 };
      }
      divisionMap[div].registered++;
    });

    submittedSessions.forEach((s) => {
      const div = s.division || "Unknown";
      if (!divisionMap[div]) {
        divisionMap[div] = { registered: 0, submitted: 0, totalScore: 0, maxScore: 0 };
      }
      divisionMap[div].submitted++;
      divisionMap[div].totalScore += s.score ?? 0;
      if ((s.score ?? 0) > divisionMap[div].maxScore) {
        divisionMap[div].maxScore = s.score ?? 0;
      }
    });

    const divisionStats = Object.entries(divisionMap).map(([name, data]) => ({
      name,
      registered: data.registered,
      submitted: data.submitted,
      avgScore: data.submitted > 0 ? data.totalScore / data.submitted : 0,
      maxScore: data.maxScore,
    })).sort((a, b) => b.registered - a.registered);

    // 2. District Stats
    const districtMap: Record<string, { registered: number; submitted: number }> = {};
    
    students.forEach((st) => {
      const dist = st.district || "Unknown";
      if (!districtMap[dist]) {
        districtMap[dist] = { registered: 0, submitted: 0 };
      }
      districtMap[dist].registered++;
    });

    submittedSessions.forEach((s) => {
      const dist = s.district || "Unknown";
      if (!districtMap[dist]) {
        districtMap[dist] = { registered: 0, submitted: 0 };
      }
      districtMap[dist].submitted++;
    });

    const districtStats = Object.entries(districtMap).map(([name, data]) => ({
      name,
      registered: data.registered,
      submitted: data.submitted,
    })).sort((a, b) => b.registered - a.registered);

    // 3. Top 20 Top Scorer Students
    // Tie-breaker: sort by score desc, then by time taken asc
    const sortedScorers = [...sessions]
      .filter((s) => s.status === "submitted" && s.score !== null && s.submittedAt && s.startedAt)
      .map((s) => {
        const actualTimeMs = s.submittedAt! - s.startedAt;
        const maxTimeMs = 40 * 60 * 1000; // 40 minutes in ms
        const timeTakenMs = Math.min(actualTimeMs, maxTimeMs);
        return {
          ...s,
          timeTakenMs,
          score: s.score ?? 0,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.timeTakenMs - b.timeTakenMs; // lower time wins tie-break
      });

    const top20Scorers = sortedScorers.slice(0, 20);

    // 4. Score Distribution (Histogram)
    const scoreBuckets = [
      { label: "0 - 10", min: 0, max: 10, count: 0 },
      { label: "11 - 20", min: 11, max: 20, count: 0 },
      { label: "21 - 30", min: 21, max: 30, count: 0 },
      { label: "31 - 40", min: 31, max: 40, count: 0 },
      { label: "41 - 50", min: 41, max: 50, count: 0 },
    ];

    submittedSessions.forEach((s) => {
      const score = s.score ?? 0;
      for (const bucket of scoreBuckets) {
        if (score >= bucket.min && score <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    // 5. General Performance Metrics
    const scores = submittedSessions.map((s) => s.score ?? 0);
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    // Median Score calculation
    let medianScore = 0;
    if (scores.length > 0) {
      const sortedScores = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sortedScores.length / 2);
      medianScore = sortedScores.length % 2 !== 0 ? sortedScores[mid] : (sortedScores[mid - 1] + sortedScores[mid]) / 2;
    }

    return {
      divisionStats,
      districtStats,
      top20Scorers,
      scoreBuckets,
      summary: {
        totalRegistered: students.length,
        totalSubmitted: submittedSessions.length,
        topScore,
        avgScore,
        medianScore,
      }
    };
  }, [students, sessions]);

  const loading = !students || !sessions || !processedData;

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
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const { divisionStats, districtStats, top20Scorers, scoreBuckets, summary } = processedData;

  // Chart max counts for SVG scaling
  const activeKey = breakdownMode; // 'registered' | 'submitted'
  const maxDistrictCount = Math.max(...districtStats.map(d => d[activeKey]), 1);
  const maxDivisionCount = Math.max(...divisionStats.map(d => d[activeKey]), 1);
  const maxScoreCount = Math.max(...scoreBuckets.map(b => b.count), 1);
  const maxTopScorerVal = Math.max(...top20Scorers.map(s => s.score), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Registration & Marks Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual statistics for student locations, division comparisons, performance rankings, and mark distribution.
          </p>
        </div>
        
        {/* Toggle registered vs submitted */}
        <div className="flex bg-muted p-1 rounded-xl border">
          <Button
            variant={breakdownMode === "registered" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setBreakdownMode("registered")}
            className="rounded-lg text-xs"
          >
            <Users className="size-3.5 mr-1" /> Registered ({summary.totalRegistered})
          </Button>
          <Button
            variant={breakdownMode === "submitted" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setBreakdownMode("submitted")}
            className="rounded-lg text-xs"
          >
            <BookOpen className="size-3.5 mr-1" /> Participated ({summary.totalSubmitted})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Top Mark</span>
            <Trophy className="size-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {summary.topScore} <span className="text-xs font-medium text-muted-foreground">/ 50</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Highest score recorded
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Average Mark</span>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {summary.avgScore.toFixed(2)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Arithmetic mean score
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Median Mark</span>
            <Percent className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {summary.medianScore.toFixed(1)}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Middle score in rank
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 bg-card rounded-2xl border transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Participation Rate</span>
            <Users className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              {summary.totalRegistered > 0
                ? ((summary.totalSubmitted / summary.totalRegistered) * 100).toFixed(1)
                : 0}
              %
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Submitted out of registered
            </p>
          </div>
        </div>
      </div>

      {/* District & Division Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        
        {/* District Breakdown SVG Horizontal Bar List */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Top Districts by {breakdownMode === "registered" ? "Registration" : "Participation"}
            </h2>
          </div>
          
          {districtStats.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-xs text-muted-foreground">
              No district data available.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {districtStats.slice(0, 10).map((d) => {
                const count = d[activeKey];
                const percentage = maxDistrictCount > 0 ? (count / maxDistrictCount) * 100 : 0;
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground truncate max-w-[200px]">{d.name}</span>
                      <span className="text-muted-foreground font-semibold tabular-nums">{count}</span>
                    </div>
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {districtStats.length > 10 && (
                <p className="text-[10px] text-center text-muted-foreground italic pt-2">
                  Showing top 10 districts out of {districtStats.length} total
                </p>
              )}
            </div>
          )}
        </div>

        {/* Division Breakdown SVG Vertical Column Chart */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Divisions Breakdown ({breakdownMode === "registered" ? "Registrations" : "Participations"})
            </h2>
          </div>

          {divisionStats.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-xs text-muted-foreground">
              No division data available.
            </div>
          ) : (
            <div className="relative w-full h-64 flex flex-col justify-between">
              <svg className="w-full h-52" viewBox="0 0 450 180">
                <g transform="translate(0, 10)">
                  {/* Grid Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const y = (140 / 3) * i;
                    return (
                      <line 
                        key={i} 
                        x1="0" 
                        y1={y} 
                        x2="420" 
                        y2={y} 
                        stroke="hsl(var(--muted)/0.4)" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                    );
                  })}

                  {/* Bars */}
                  {divisionStats.slice(0, 7).map((d, i) => {
                    const count = d[activeKey];
                    const barWidth = 40;
                    const spacing = 18;
                    const x = i * (barWidth + spacing) + 25;
                    const height = (count / maxDivisionCount) * 130;
                    const y = 140 - height;

                    return (
                      <g key={i} className="group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="3"
                          fill="url(#divGrad)"
                          className="transition-all duration-300 hover:opacity-85"
                        />
                        {/* Tooltip text on hover */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          className="text-[9px] font-bold fill-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          {count}
                        </text>
                        {/* Label */}
                        <text
                          x={x + barWidth / 2}
                          y="155"
                          textAnchor="middle"
                          className="text-[9px] fill-muted-foreground font-medium truncate max-w-[50px]"
                        >
                          {d.name.length > 8 ? `${d.name.slice(0, 7)}.` : d.name}
                        </text>
                      </g>
                    );
                  })}
                  <defs>
                    <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="rgb(99, 102, 241)" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
              {divisionStats.length > 7 && (
                <p className="text-[10px] text-center text-muted-foreground italic -mt-2">
                  Showing top 7 divisions out of {divisionStats.length} total
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Marks Distribution Histogram & Division Stats table */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Score Distribution SVG */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">Score Distribution (Brackets of 10)</h2>
          </div>
          
          {summary.totalSubmitted === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-muted-foreground">
              No submitted exams to chart.
            </div>
          ) : (
            <div className="relative w-full h-52 flex flex-col justify-between">
              <svg className="w-full h-44" viewBox="0 0 400 150">
                <g transform="translate(0, 15)">
                  {/* Grid Lines */}
                  {Array.from({ length: 4 }).map((_, i) => {
                    const y = (110 / 3) * i;
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
                  {scoreBuckets.map((d, i) => {
                    const barWidth = 45;
                    const spacing = 20;
                    const x = i * (barWidth + spacing) + 30;
                    const height = (d.count / maxScoreCount) * 100;
                    const y = 110 - height;
                    return (
                      <g key={i} className="group">
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          rx="4"
                          fill="url(#scoreGrad)"
                          className="transition-all duration-300 hover:opacity-85"
                        />
                        {/* Hover Tooltip Value */}
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          textAnchor="middle"
                          className="text-[9px] font-semibold fill-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          {d.count} ({((d.count / summary.totalSubmitted) * 100).toFixed(0)}%)
                        </text>
                        {/* X-axis labels */}
                        <text
                          x={x + barWidth / 2}
                          y="125"
                          textAnchor="middle"
                          className="text-[9px] fill-muted-foreground font-medium"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16, 185, 129)" />
                      <stop offset="100%" stopColor="rgba(16, 185, 129, 0.4)" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Division Summary Table */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="size-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-foreground">Division Performance Summary</h2>
          </div>
          
          <div className="overflow-x-auto rounded-xl border max-h-56 overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs">Division</TableHead>
                  <TableHead className="text-right text-xs">Registered</TableHead>
                  <TableHead className="text-right text-xs">Participated</TableHead>
                  <TableHead className="text-right text-xs">Avg Mark</TableHead>
                  <TableHead className="text-right text-xs">Top Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisionStats.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium text-xs py-2">{d.name}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs py-2">{d.registered}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs py-2">
                      {d.submitted}
                      <span className="text-[9px] text-muted-foreground ml-1">
                        ({d.registered > 0 ? ((d.submitted / d.registered) * 100).toFixed(0) : 0}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-xs py-2">
                      {d.avgScore.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs py-2">{d.maxScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Top 20 Top Scorer Students */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="size-5 text-amber-500" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Top 20 Scorer Leaderboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ranked by highest score, with faster submission times used as a tie-breaker.
            </p>
          </div>
        </div>

        {/* Top 20 ranking graph and table side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top 20 visual ranking bar chart */}
          <div className="lg:col-span-4 border rounded-xl p-4 flex flex-col justify-between bg-muted/20 min-h-[300px]">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Top Scorers Chart</h3>
            {top20Scorers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                No scores to rank.
              </div>
            ) : (
              <div className="flex-1 flex items-end justify-between px-2 pt-4 h-56">
                {top20Scorers.slice(0, 10).map((s, i) => {
                  const percent = maxTopScorerVal > 0 ? (s.score / maxTopScorerVal) * 100 : 0;
                  return (
                    <div key={s.studentId} className="flex flex-col items-center gap-1.5 group w-full max-w-[20px]">
                      <span className="text-[8px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 tabular-nums">
                        {s.score}
                      </span>
                      <div 
                        className="w-3 sm:w-4 bg-amber-500 rounded-t-sm group-hover:bg-amber-400 transition-all duration-300 relative" 
                        style={{ height: `${percent * 1.5}px` }}
                        title={`${s.studentName}: ${s.score} marks`}
                      >
                        {/* Label rank in bar */}
                        <span className="absolute bottom-1 inset-x-0 text-center text-[7px] text-white font-bold leading-none">
                          {i + 1}
                        </span>
                      </div>
                      <span className="text-[8px] font-medium text-muted-foreground truncate w-full text-center" title={s.studentName}>
                        {s.studentName.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground italic text-center mt-3 border-t pt-2">
              Showing top 10 scorer scores comparison
            </p>
          </div>

          {/* Top 20 details table */}
          <div className="lg:col-span-8 overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>District / Division</TableHead>
                  <TableHead className="text-right">Time taken</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top20Scorers.map((s, idx) => {
                  // Format time taken
                  const mins = Math.floor(s.timeTakenMs / 60000);
                  const secs = Math.floor((s.timeTakenMs % 60000) / 1000);
                  const timeFormatted = `${mins}m ${secs}s`;

                  return (
                    <TableRow key={s.studentId} className={idx < 3 ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        {idx + 1 === 1 ? (
                          <span className="text-amber-500">🏆 1</span>
                        ) : idx + 1 === 2 ? (
                          <span className="text-slate-400">🥈 2</span>
                        ) : idx + 1 === 3 ? (
                          <span className="text-amber-700">🥉 3</span>
                        ) : (
                          idx + 1
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground text-sm">{s.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{s.studentId}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.district}, {s.division}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {timeFormatted}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground tabular-nums">
                        {s.score}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {top20Scorers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No submissions found yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
