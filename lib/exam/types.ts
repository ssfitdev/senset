import type { SessionStatus } from "@/lib/firestore/schema";
import type { WindowState } from "@/lib/exam/config";

export interface StudentProfile {
  studentId: string;
  name: string;
  district: string;
  division: string;
}

export interface SessionSummary {
  status: SessionStatus;
  startedAt: number;
  expiresAt: number;
  totalQuestions: number;
  score: number | null;
  totalCorrect: number | null;
  totalWrong: number | null;
  totalAttempted: number | null;
}

export interface ExamStatusResponse {
  student: StudentProfile;
  session: SessionSummary | null;
  window: WindowState;
  resultsVisibleToStudents: boolean;
}
