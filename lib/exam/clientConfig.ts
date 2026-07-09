import { type ExamConfigDoc } from "@/lib/firestore/schema";

export type WindowStatus = "unconfigured" | "not-open" | "open" | "closed";

export interface WindowState {
  status: WindowStatus;
  startAt: number | null;
  endAt: number | null;
  durationMinutes: number | null;
  serverNow: number;
}

export function computeClientWindowState(config: ExamConfigDoc | null, now = Date.now()): WindowState {
  if (!config) {
    return { status: "unconfigured", startAt: null, endAt: null, durationMinutes: null, serverNow: now };
  }

  const startAt = config.startAt.toMillis();
  const endAt = config.endAt.toMillis();

  let status: WindowStatus;
  if (!config.isOpen) status = "closed";
  else if (now < startAt) status = "not-open";
  else if (now > endAt) status = "closed";
  else status = "open";

  return { status, startAt, endAt, durationMinutes: config.durationMinutes, serverNow: now };
}
