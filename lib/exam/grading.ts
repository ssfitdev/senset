import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { computeScore } from "@/lib/exam/scoring";
import {
  COLLECTIONS,
  type AnswerDoc,
  type ExamSessionDoc,
  type QuestionDoc,
  type SessionQuestionDoc,
} from "@/lib/firestore/schema";

export interface GradedResult {
  status: "submitted";
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  score: number;
  submittedAt: number;
}

/**
 * Grades and locks a session. Idempotent: if the session is already
 * submitted, returns the previously-stored result instead of re-grading —
 * safe to call from both the student's Submit button and the timer/refresh
 * self-healing path without ever double-scoring.
 */
export async function gradeSession(studentId: string): Promise<GradedResult | null> {
  const sessionRef = adminDb.collection(COLLECTIONS.examSessions).doc(studentId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return null;

  const session = sessionSnap.data() as ExamSessionDoc;

  if (session.status === "submitted") {
    return {
      status: "submitted",
      totalQuestions: session.totalQuestions,
      totalAttempted: session.totalAttempted ?? 0,
      totalCorrect: session.totalCorrect ?? 0,
      totalWrong: session.totalWrong ?? 0,
      score: session.score ?? 0,
      submittedAt: (session.submittedAt ?? session.startedAt).toMillis(),
    };
  }

  const [sessionQuestionsSnap, answersSnap] = await Promise.all([
    sessionRef.collection("sessionQuestions").get(),
    sessionRef.collection("answers").get(),
  ]);

  const answersByOrder = new Map<number, AnswerDoc["selectedOption"]>();
  answersSnap.docs.forEach((doc) => {
    answersByOrder.set(Number(doc.id), (doc.data() as AnswerDoc).selectedOption);
  });

  const questionIds = sessionQuestionsSnap.docs.map(
    (doc) => (doc.data() as SessionQuestionDoc).questionId,
  );
  const questionDocs = await Promise.all(
    questionIds.map((id) => adminDb.collection(COLLECTIONS.questions).doc(id).get()),
  );
  const correctById = new Map<string, string>();
  questionDocs.forEach((doc) => {
    if (doc.exists) correctById.set(doc.id, (doc.data() as QuestionDoc).correctOption);
  });

  let totalCorrect = 0;
  sessionQuestionsSnap.docs.forEach((doc) => {
    const data = doc.data() as SessionQuestionDoc;
    const selected = answersByOrder.get(data.order);
    if (selected && selected === correctById.get(data.questionId)) {
      totalCorrect += 1;
    }
  });

  const totalAttempted = answersByOrder.size;
  const totalWrong = totalAttempted - totalCorrect;
  const score = computeScore(totalCorrect, totalWrong);
  const submittedAt = Timestamp.now();

  const result: GradedResult = {
    status: "submitted",
    totalQuestions: session.totalQuestions,
    totalAttempted,
    totalCorrect,
    totalWrong,
    score,
    submittedAt: submittedAt.toMillis(),
  };

  await sessionRef.update({
    status: "submitted",
    submittedAt,
    totalAttempted,
    totalCorrect,
    totalWrong,
    score,
  });

  return result;
}
