"use client";

import { motion } from "framer-motion";
import { formatCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TimerProps {
  remainingMs: number;
  totalMs: number;
}

const SIZE = 56;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Timer({ remainingMs, totalMs }: TimerProps) {
  const pct = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);

  const isDanger = remainingMs <= 60_000;
  const isWarn = !isDanger && remainingMs <= 5 * 60_000;
  const color = isDanger ? "text-destructive" : isWarn ? "text-amber-500" : "text-primary";

  return (
    <div className={cn("relative flex shrink-0 items-center justify-center", color)}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          className="stroke-muted"
          fill="none"
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: "linear" }}
          className={cn(isDanger && "animate-pulse")}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">
        {formatCountdown(remainingMs)}
      </span>
    </div>
  );
}
