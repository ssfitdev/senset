import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/verify";
import { computeWindowState, getExamConfig } from "@/lib/exam/config";
import { gradeSession } from "@/lib/exam/grading";
import { COLLECTIONS, type ExamSessionDoc, type StudentDoc } from "@/lib/firestore/schema";

export async function GET(request: Request) {
  const decoded = await requireAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = decoded.uid;
  const [studentSnap, sessionSnap, config] = await Promise.all([
    adminDb.collection(COLLECTIONS.students).doc(studentId).get(),
    adminDb.collection(COLLECTIONS.examSessions).doc(studentId).get(),
    getExamConfig(),
  ]);

  if (!studentSnap.exists) {
    return NextResponse.json({ error: "Student record not found." }, { status: 404 });
  }

  const student = studentSnap.data() as StudentDoc;
  let session = sessionSnap.exists ? (sessionSnap.data() as ExamSessionDoc) : null;

  // Self-heal: if the timer expired but nothing ever called submit (tab
  // closed, crash, ...), grade it now so the student can't be left in an
  // editable-looking state past their deadline.
  if (session && session.status === "in_progress" && Date.now() > session.expiresAt.toMillis()) {
    const graded = await gradeSession(studentId);
    if (graded) {
      session = {
        ...session,
        status: "submitted",
        totalAttempted: graded.totalAttempted,
        totalCorrect: graded.totalCorrect,
        totalWrong: graded.totalWrong,
        score: graded.score,
      };
    }
  }

  const windowState = computeWindowState(config);

  return NextResponse.json({
    student: {
      studentId,
      name: student.name,
      district: student.district,
      division: student.division,
    },
    session: session
      ? {
          status: session.status,
          startedAt: session.startedAt.toMillis(),
          expiresAt: session.expiresAt.toMillis(),
          totalQuestions: session.totalQuestions,
          score: session.score ?? null,
          totalCorrect: session.totalCorrect ?? null,
          totalWrong: session.totalWrong ?? null,
          totalAttempted: session.totalAttempted ?? null,
        }
      : null,
    window: windowState,
    resultsVisibleToStudents: config?.resultsVisibleToStudents ?? false,
  });
}
