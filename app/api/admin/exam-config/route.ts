import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminAuth } from "@/lib/firebase/verify";
import { getExamConfig } from "@/lib/exam/config";
import { examConfigSchema } from "@/lib/validation/schemas";
import { COLLECTIONS, EXAM_CONFIG_DOC_ID } from "@/lib/firestore/schema";

export async function GET(request: Request) {
  try {
    const decoded = await requireAdminAuth(request);
    if (!decoded) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const config = await getExamConfig();
    if (!config) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({
      config: {
        startAt: config.startAt.toMillis(),
        endAt: config.endAt.toMillis(),
        durationMinutes: config.durationMinutes,
        questionCount: config.questionCount,
        isOpen: config.isOpen,
        resultsVisibleToStudents: config.resultsVisibleToStudents,
      },
    });
  } catch (err: any) {
    console.error("GET exam-config error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const decoded = await requireAdminAuth(request);
    if (!decoded) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = examConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const { startAt, endAt, durationMinutes, questionCount, isOpen, resultsVisibleToStudents } =
      parsed.data;

    await adminDb
      .collection(COLLECTIONS.examConfig)
      .doc(EXAM_CONFIG_DOC_ID)
      .set({
        startAt: Timestamp.fromMillis(startAt),
        endAt: Timestamp.fromMillis(endAt),
        durationMinutes,
        questionCount,
        isOpen,
        resultsVisibleToStudents,
      });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT exam-config error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
