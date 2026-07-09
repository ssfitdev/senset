import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/verify";
import { computeWindowState, getExamConfig } from "@/lib/exam/config";
import {
  COLLECTIONS,
  type ExamSessionDoc,
  type QuestionDoc,
  type SessionQuestionDoc,
  type StudentDoc,
} from "@/lib/firestore/schema";

export async function POST(request: Request) {
  const decoded = await requireAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const studentId = decoded.uid;
  const studentSnap = await adminDb.collection(COLLECTIONS.students).doc(studentId).get();
  if (!studentSnap.exists) {
    return NextResponse.json({ error: "Student record not found." }, { status: 404 });
  }
  const student = studentSnap.data() as StudentDoc;

  const sessionRef = adminDb.collection(COLLECTIONS.examSessions).doc(studentId);
  const existing = await sessionRef.get();

  if (existing.exists) {
    const data = existing.data() as ExamSessionDoc;

    if (data.status === "submitted") {
      return NextResponse.json(
        { error: "You have already completed this examination. Only one attempt is allowed." },
        { status: 403 },
      );
    }

    // Idempotent resume: a paper already exists for this student, so we
    // return it as-is regardless of whether the exam window has since
    // closed — the individual 40-minute timer is what governs them now.
    return NextResponse.json({
      sessionId: studentId,
      status: data.status,
      startedAt: data.startedAt.toMillis(),
      expiresAt: data.expiresAt.toMillis(),
      totalQuestions: data.totalQuestions,
    });
  }

  const config = await getExamConfig();
  const windowState = computeWindowState(config);
  if (windowState.status !== "open" || !config) {
    return NextResponse.json(
      { error: "The exam window is not currently open." },
      { status: 403 },
    );
  }

  const questionsSnap = await adminDb.collection(COLLECTIONS.questions).get();
  const allQuestions = questionsSnap.docs;
  if (allQuestions.length < config.questionCount) {
    return NextResponse.json(
      { error: "The question bank isn't fully set up yet. Please contact the exam administrator." },
      { status: 500 },
    );
  }

  const shuffled = [...allQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, config.questionCount);

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + config.durationMinutes * 60_000);

  const sessionData: ExamSessionDoc = {
    studentId,
    studentName: student.name,
    district: student.district,
    division: student.division,
    status: "in_progress",
    startedAt: now,
    expiresAt,
    totalQuestions: picked.length,
  };

  const batch = adminDb.batch();
  batch.set(sessionRef, sessionData);
  picked.forEach((doc, index) => {
    const q = doc.data() as QuestionDoc;
    const sessionQuestion: SessionQuestionDoc = {
      questionId: doc.id,
      order: index,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    };
    batch.set(sessionRef.collection("sessionQuestions").doc(String(index)), sessionQuestion);
  });
  await batch.commit();

  return NextResponse.json({
    sessionId: studentId,
    status: "in_progress",
    startedAt: now.toMillis(),
    expiresAt: expiresAt.toMillis(),
    totalQuestions: picked.length,
  });
}
