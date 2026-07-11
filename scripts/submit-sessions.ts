/**
 * Force-submits and grades exam sessions that are currently in progress.
 * Can target either specific student IDs or all currently in-progress sessions.
 *
 * Usage:
 *   # Submit specific students:
 *   npx tsx scripts/submit-sessions.ts studentId1 studentId2 ...
 *
 *   # Submit all in-progress students:
 *   npx tsx scripts/submit-sessions.ts --all
 *
 * Environment:
 *   Loads .env.local if present, targeting either the emulator or real project.
 */

import { existsSync, readFileSync } from "fs";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { COLLECTIONS, type ExamSessionDoc, type AnswerDoc, type SessionQuestionDoc, type QuestionDoc } from "../lib/firestore/schema";
import { computeScore } from "../lib/exam/scoring";

// Load environment variables before any firebase-admin config starts
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Initialize Firebase Admin App
function getAdminDb() {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0]);
  }

  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mcq-exam-system";

  if (useEmulators) {
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    console.log(`[EMULATOR] Connecting to emulator project: ${projectId}`);
    const app = initializeApp({ projectId });
    return getFirestore(app);
  }

  const serviceAccountPath = "firebase-config.json";
  if (existsSync(serviceAccountPath)) {
    console.log(`[PRODUCTION] Initializing Firebase Admin with service account file: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    const app = initializeApp({ credential: cert(serviceAccount) });
    return getFirestore(app);
  }

  console.log(`[PRODUCTION] Initializing Firebase Admin with environment variables...`);
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials (firebase-config.json or env vars)");
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return getFirestore(app);
}

const db = getAdminDb();

interface GradedResult {
  status: "submitted";
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  score: number;
  submittedAt: number;
}

/**
 * Grades and locks a session. Self-contained version of gradeSession to avoid RSC server-only imports.
 */
async function forceGradeSession(studentId: string): Promise<GradedResult | null> {
  const sessionRef = db.collection(COLLECTIONS.examSessions).doc(studentId);
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
    questionIds.map((id) => db.collection(COLLECTIONS.questions).doc(id).get()),
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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: Please specify student IDs or pass --all.");
    console.error("Usage:");
    console.error("  npx tsx scripts/submit-sessions.ts studentId1 studentId2 ...");
    console.error("  npx tsx scripts/submit-sessions.ts --all");
    process.exit(1);
  }

  let studentIds: string[] = [];

  if (args.includes("--all")) {
    console.log("Fetching all exam sessions currently in_progress...");
    const snap = await db
      .collection(COLLECTIONS.examSessions)
      .where("status", "==", "in_progress")
      .get();

    if (snap.empty) {
      console.log("No in_progress exam sessions found.");
      return;
    }

    studentIds = snap.docs.map(doc => doc.id);
    console.log(`Found ${studentIds.length} in_progress session(s): ${studentIds.join(", ")}`);
  } else {
    // Filter out flags if any, just in case
    studentIds = args.filter(arg => !arg.startsWith("-"));
    if (studentIds.length === 0) {
      console.error("Error: No student IDs specified.");
      process.exit(1);
    }
  }

  console.log(`Starting force-submit for ${studentIds.length} student(s)...`);

  let successCount = 0;
  let failCount = 0;

  for (const studentId of studentIds) {
    try {
      console.log(`Processing student: ${studentId}...`);
      // Check session status first
      const sessionRef = db.collection(COLLECTIONS.examSessions).doc(studentId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        console.warn(`  [-] Session does not exist for student: ${studentId}`);
        failCount++;
        continue;
      }

      const sessionData = sessionSnap.data();
      if (sessionData?.status === "submitted") {
        console.log(`  [!] Session already submitted for student: ${studentId} (Score: ${sessionData.score ?? 0})`);
        successCount++;
        continue;
      }

      const result = await forceGradeSession(studentId);
      if (result) {
        console.log(`  [+] Successfully submitted! Score: ${result.score}, Correct: ${result.totalCorrect}/${result.totalQuestions}`);
        successCount++;
      } else {
        console.warn(`  [-] Failed to submit session for student: ${studentId}`);
        failCount++;
      }
    } catch (error) {
      console.error(`  [x] Error submitting session for student ${studentId}:`, error);
      failCount++;
    }
  }

  console.log(`\nSubmission complete: ${successCount} succeeded, ${failCount} failed.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unhandled execution error:", err);
    process.exit(1);
  });
