import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { gradeSession } from "@/lib/exam/grading";
import { COLLECTIONS } from "@/lib/firestore/schema";

/**
 * Server-side timer enforcement independent of any client: sweeps for
 * sessions whose deadline has passed but were never graded (student closed
 * the tab, lost power, etc.) and grades them now. Security rules already
 * block answer writes past expiresAt regardless of this job's cadence —
 * this just guarantees the session doesn't sit "in_progress" indefinitely
 * waiting for someone to open the app and trigger the lazy-grade check.
 *
 * Wired to Vercel Cron (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` for cron-triggered requests when
 * CRON_SECRET is set as an env var.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const snap = await adminDb
    .collection(COLLECTIONS.examSessions)
    .where("status", "==", "in_progress")
    .where("expiresAt", "<=", Timestamp.now())
    .get();

  const results = await Promise.allSettled(snap.docs.map((d) => gradeSession(d.id)));
  const graded = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ checked: snap.size, graded, failed: results.length - graded });
}
