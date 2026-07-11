/**
 * Shared Firestore document shapes. Imported by both client and server code,
 * so this file must stay free of any firebase/firebase-admin runtime imports —
 * only structural types.
 */

export interface TimestampLike {
  toDate(): Date;
  toMillis(): number;
}

export const COLLECTIONS = {
  students: "students",
  questions: "questions",
  examConfig: "examConfig",
  examSessions: "examSessions",
  feedback: "feedback",
} as const;

export const EXAM_CONFIG_DOC_ID = "settings";

export type OptionKey = "A" | "B" | "C" | "D";

export interface StudentDoc {
  name: string;
  phone: string;
  district: string;
  division: string;
  createdAt: TimestampLike;
}

export interface QuestionDoc {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionKey;
  category?: string;
  createdAt: TimestampLike;
}

export interface ExamConfigDoc {
  /** Absolute instant the exam window opens — computed once by the admin UI, not re-derived from timezone strings. */
  startAt: TimestampLike;
  /** Absolute instant the exam window closes to new starts. */
  endAt: TimestampLike;
  durationMinutes: number;
  questionCount: number;
  isOpen: boolean;
  resultsVisibleToStudents: boolean;
}

export type SessionStatus = "in_progress" | "submitted";

export interface ExamSessionDoc {
  studentId: string;
  /** Denormalized from students/{studentId} at session creation so admin
   * screens can read attendance/results directly without needing access to
   * the (fully locked) students collection. */
  studentName: string;
  district: string;
  division: string;
  status: SessionStatus;
  startedAt: TimestampLike;
  expiresAt: TimestampLike;
  submittedAt?: TimestampLike | null;
  totalQuestions: number;
  totalAttempted?: number;
  totalCorrect?: number;
  totalWrong?: number;
  score?: number;
  lastViewedOrder?: number;
}

export interface SessionQuestionDoc {
  questionId: string;
  order: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface AnswerDoc {
  selectedOption: OptionKey;
  answeredAt: TimestampLike;
}

export interface FeedbackDoc {
  studentId: string;
  studentName: string;
  message: string;
  createdAt: TimestampLike;
  isIssueReport?: boolean;
  issueType?: string;
}

export type SessionEventType =
  | "tab-hidden"
  | "tab-visible"
  | "fullscreen-exit"
  | "fullscreen-enter";

export interface SessionEventDoc {
  type: SessionEventType;
  at: TimestampLike;
}
