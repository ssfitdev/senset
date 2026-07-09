/**
 * Populates the Firebase Emulator Suite with sample data for local dev:
 * ~20 fake students, 100 sample MCQ questions, an exam config window that's
 * open right now, and one admin user (admin@example.com / admin123456).
 *
 * This script refuses to run against anything that isn't an emulator host,
 * so it can never accidentally touch a real Firebase project.
 *
 * Usage: npm run seed:emulator   (run `npm run emulators` in another terminal first)
 */
import { existsSync } from "fs";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { SAMPLE_QUESTIONS, SAMPLE_STUDENTS } from "./sampleData";

// Unlike Next.js, a standalone tsx script doesn't auto-load .env.local — do
// it ourselves so this always targets the same project the dev server uses.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Emulator host env vars missing — refusing to run against a real project.");
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mcq-exam-system";

const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log(`Seeding emulator project "${PROJECT_ID}"...`);

  const studentsBatch = db.batch();
  for (const s of SAMPLE_STUDENTS) {
    const ref = db.collection("students").doc(s.studentId);
    studentsBatch.set(ref, {
      name: s.name,
      phone: s.phone,
      district: s.district,
      division: s.division,
      createdAt: Timestamp.now(),
    });
  }
  await studentsBatch.commit();
  console.log(`Seeded ${SAMPLE_STUDENTS.length} students.`);

  const questionsBatch = db.batch();
  SAMPLE_QUESTIONS.forEach((q, i) => {
    const ref = db.collection("questions").doc(`Q${(i + 1).toString().padStart(3, "0")}`);
    questionsBatch.set(ref, {
      text: q.text,
      optionA: q.options[0],
      optionB: q.options[1],
      optionC: q.options[2],
      optionD: q.options[3],
      correctOption: q.correctOption,
      category: q.category,
      createdAt: Timestamp.now(),
    });
  });
  await questionsBatch.commit();
  console.log(`Seeded ${SAMPLE_QUESTIONS.length} questions.`);

  const now = new Date();
  const startAt = new Date(now.getTime() - 30 * 60 * 1000); // opened 30 min ago
  const endAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // closes in 4 hours

  await db.collection("examConfig").doc("settings").set({
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    durationMinutes: 40,
    questionCount: 50,
    isOpen: true,
    resultsVisibleToStudents: true,
  });
  console.log("Seeded examConfig/settings (window open now for local testing).");

  const adminEmail = "admin@example.com";
  const adminPassword = "admin123456";
  let adminUser;
  try {
    adminUser = await auth.getUserByEmail(adminEmail);
  } catch {
    adminUser = await auth.createUser({ email: adminEmail, password: adminPassword });
  }
  await auth.setCustomUserClaims(adminUser.uid, { admin: true });
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);

  console.log("\nDone. Sample student login (Student ID or phone):");
  console.log(`  ${SAMPLE_STUDENTS[0].studentId}  or  ${SAMPLE_STUDENTS[0].phone}  (${SAMPLE_STUDENTS[0].name})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
