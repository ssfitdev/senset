"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  Loader2,
  PenLine,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useExamWindow, type WindowStatus } from "@/hooks/useExamWindow";
import { formatCountdown, splitCountdown } from "@/lib/format";
import { cn } from "@/lib/utils";
import { studentLoginSchema, type StudentLoginInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function BrandIcon() {
  return (
    <motion.div variants={item} className="relative mb-5">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-2xl bg-primary/40 blur-xl"
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        <GraduationCap className="size-8" />
      </div>
    </motion.div>
  );
}

interface WindowStatusPillProps {
  status: WindowStatus | null;
  startAt: number | null;
  endAt: number | null;
  serverNow: number;
  loading: boolean;
}

function WindowStatusPill({ status, startAt, endAt, serverNow, loading }: WindowStatusPillProps) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Checking exam window…
      </div>
    );
  }

  if (status === "open") {
    const remaining = endAt ? endAt - serverNow : null;
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        Exam is open{remaining !== null ? ` — closes to new starts in ${formatCountdown(remaining)}` : ""}
      </div>
    );
  }

  if (status === "not-open" && startAt) {
    const remaining = startAt - serverNow;
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
        Opens in {formatCountdown(remaining)}
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
        The exam window is currently closed
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground">
      Exam has not been configured yet
    </div>
  );
}

interface FloatingBadgeProps {
  icon: typeof Sparkles;
  className: string;
  iconClassName?: string;
  delay?: number;
  duration?: number;
  distance?: number;
}

function FloatingBadge({
  icon: Icon,
  className,
  iconClassName,
  delay = 0,
  duration = 7,
  distance = 14,
}: FloatingBadgeProps) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -distance, 0],
        rotate: [0, 6, 0, -6, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay: delay * 0.3 },
        scale: { duration: 0.6, delay: delay * 0.3 },
        y: { duration, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: duration * 1.4, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={cn(
        "pointer-events-none absolute flex items-center justify-center rounded-2xl border border-white/40 bg-white/60 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/10",
        className,
      )}
    >
      <Icon className={cn("size-1/2", iconClassName)} />
    </motion.div>
  );
}

function BackgroundDecoration() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-muted-foreground) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 80%)",
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-28 -left-28 size-72 rounded-full bg-primary/25 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, 14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 size-80 rounded-full bg-accent blur-3xl"
        animate={{ x: [0, -16, 0], y: [0, -18, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-0 size-40 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ x: [0, -10, 0], y: [0, 16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg
        aria-hidden
        viewBox="0 0 400 900"
        className="pointer-events-none absolute inset-0 size-full text-primary/25"
        fill="none"
      >
        <motion.path
          d="M -40 120 C 80 60, 140 220, 260 160 S 420 140, 460 260"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.path
          d="M -40 780 C 100 850, 160 700, 280 760 S 420 820, 460 720"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeInOut", delay: 0.5 }}
        />
      </svg>

      <FloatingBadge
        icon={BookOpen}
        className="top-[14%] left-[8%] size-12 text-primary"
        delay={0}
        duration={7}
      />
      <FloatingBadge
        icon={PenLine}
        className="top-[22%] right-[10%] size-11 text-emerald-500"
        delay={1.2}
        duration={8}
      />
      <FloatingBadge
        icon={Lightbulb}
        className="bottom-[26%] left-[10%] size-10 text-amber-500"
        delay={0.6}
        duration={6.5}
      />
      <FloatingBadge
        icon={Trophy}
        className="bottom-[16%] right-[8%] size-12 text-primary"
        delay={1.8}
        duration={7.5}
      />
    </>
  );
}

function DigitBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-20 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-card shadow-lg shadow-primary/10 sm:h-24 sm:w-20">
        <motion.div
          aria-hidden
          className="absolute inset-0 bg-primary/10"
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative text-3xl font-bold tabular-nums text-primary sm:text-4xl"
        >
          {value}
        </motion.span>
      </div>
      <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

function WaitingRoom({ startAt, serverNow }: { startAt: number; serverNow: number }) {
  const { hours, minutes, seconds } = splitCountdown(Math.max(0, startAt - serverNow));

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 flex w-full flex-col items-center text-center sm:max-w-sm"
    >
      <BrandIcon />

      <motion.h1 variants={item} className="text-3xl font-semibold tracking-tight text-balance">
        SensET
      </motion.h1>
      <motion.p variants={item} className="mt-2 text-sm text-muted-foreground text-balance">
        Your exam is almost here. Get ready!
      </motion.p>

      <motion.div variants={item} className="mt-10 flex items-center gap-3">
        <DigitBox value={hours} label="Hours" />
        <span className="pb-6 text-2xl font-bold text-muted-foreground">:</span>
        <DigitBox value={minutes} label="Minutes" />
        <span className="pb-6 text-2xl font-bold text-muted-foreground">:</span>
        <DigitBox value={seconds} label="Seconds" />
      </motion.div>

      <motion.p variants={item} className="mt-10 text-xs text-muted-foreground text-balance">
        Come back the moment this reaches zero to sign in and start your exam.
      </motion.p>
    </motion.div>
  );
}

export function LoginHero() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const examWindow = useExamWindow();
  const windowClosed = examWindow.status === "closed";
  const isWaitingRoom =
    !examWindow.loading && examWindow.status === "not-open" && examWindow.startAt !== null;

  useEffect(() => setMounted(true), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentLoginInput>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { identifier: "" },
  });

  async function onSubmit(values: StudentLoginInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      await signInWithCustomToken(auth, data.token);
      sessionStorage.setItem("mcq_student_profile", JSON.stringify(data.student));
      router.push("/exam/instructions");
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12">
      <BackgroundDecoration />

      {isWaitingRoom && examWindow.startAt !== null ? (
        <WaitingRoom startAt={examWindow.startAt} serverNow={examWindow.serverNow} />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate={mounted ? "show" : "hidden"}
          className="relative z-10 flex w-full flex-col items-center text-center sm:max-w-sm"
        >
          <BrandIcon />

          <motion.h1 variants={item} className="text-3xl font-semibold tracking-tight text-balance">
            SensET
          </motion.h1>
          <motion.p variants={item} className="mt-2 text-sm text-muted-foreground text-balance">
            Enter your Student ID or registered phone number to begin.
          </motion.p>

          <motion.div variants={item} className="mt-5">
            <WindowStatusPill
              status={examWindow.status}
              startAt={examWindow.startAt}
              endAt={examWindow.endAt}
              serverNow={examWindow.serverNow}
              loading={examWindow.loading}
            />
          </motion.div>

          <motion.form
            variants={item}
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 w-full rounded-2xl border bg-card/80 p-6 text-left shadow-xl shadow-primary/5 backdrop-blur"
          >
            <Label htmlFor="identifier">Student ID or Phone Number</Label>
            <Input
              id="identifier"
              placeholder="e.g. STU10001 or 017XXXXXXXX"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={windowClosed}
              className="mt-2 h-12 text-base"
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="mt-2 text-sm text-destructive">{errors.identifier.message}</p>
            )}

            <Button
              type="submit"
              disabled={submitting || windowClosed}
              className="mt-5 h-12 w-full text-base font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying…
                </>
              ) : windowClosed ? (
                "Exam window closed"
              ) : (
                <>
                  Continue <Sparkles className="size-4" />
                </>
              )}
            </Button>
          </motion.form>
        </motion.div>
      )}
    </div>
  );
}
