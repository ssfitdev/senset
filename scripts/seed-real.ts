/**
 * Populates the REAL Firebase project (via the service account in
 * firebase-config.json) with the same sample roster/question bank used for
 * local emulator dev, plus ensures the admin@senset.com account exists with
 * the admin custom claim.
 *
 * Usage: npx tsx scripts/seed-real.ts
 */
import { readFileSync } from "fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { SAMPLE_QUESTIONS, SAMPLE_STUDENTS } from "./sampleData";

const ADMIN_EMAIL = "admin@senset.com";
const ADMIN_PASSWORD = "adminPass123";

const serviceAccount = JSON.parse(readFileSync("firebase-config.json", "utf8"));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

async function main() {
  console.log(`Seeding REAL project "${serviceAccount.project_id}"...`);

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
  console.log("Seeded examConfig/settings (window open now for testing).");

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    await auth.updateUser(existing.uid, { password: ADMIN_PASSWORD });
    uid = existing.uid;
    console.log(`Updated existing admin user: ${ADMIN_EMAIL}`);
  } catch {
    const created = await auth.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    uid = created.uid;
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }
  await auth.setCustomUserClaims(uid, { admin: true });
  console.log(`Set admin custom claim on uid ${uid}`);

  console.log("\nDone. Sample student login (Student ID or phone):");
  console.log(`  ${SAMPLE_STUDENTS[0].studentId}  or  ${SAMPLE_STUDENTS[0].phone}  (${SAMPLE_STUDENTS[0].name})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
