/**
 * Deletes the specified dummy test student data from Cloud Firestore.
 * This includes the students themselves, their exam sessions (and subcollections),
 * and any feedback they submitted.
 *
 * Usage:
 *   npx tsx scripts/remove-test-students.ts
 */

import { existsSync, readFileSync } from "fs";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load environment variables before any firebase-admin config starts
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

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

// Roster of dummy students to delete
const DUMMY_STUDENT_IDS = [
  "0000",
  "1",
  "11111",
  "1231231234",
  "1234",
  "21",
  "4321",
];

async function deleteSubcollection(docRef: FirebaseFirestore.DocumentReference, subcollectionName: string) {
  const snapshot = await docRef.collection(subcollectionName).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return snapshot.size;
}

async function removeStudentData(studentId: string) {
  console.log(`\nRemoving data for Student ID: "${studentId}"...`);

  // 1. Delete student feedback
  const feedbackSnapshot = await db.collection("feedback").where("studentId", "==", studentId).get();
  if (!feedbackSnapshot.empty) {
    const batch = db.batch();
    feedbackSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  - Deleted ${feedbackSnapshot.size} feedback entries.`);
  }

  // 2. Delete exam session and its subcollections (answers, sessionQuestions, events)
  const sessionRef = db.collection("examSessions").doc(studentId);
  const sessionSnap = await sessionRef.get();
  if (sessionSnap.exists) {
    const deletedAnswers = await deleteSubcollection(sessionRef, "answers");
    const deletedQuestions = await deleteSubcollection(sessionRef, "sessionQuestions");
    const deletedEvents = await deleteSubcollection(sessionRef, "events");
    
    await sessionRef.delete();
    console.log(`  - Deleted exam session (with ${deletedAnswers} answers, ${deletedQuestions} questions, ${deletedEvents} events).`);
  } else {
    console.log(`  - No exam session found.`);
  }

  // 3. Delete the student document
  const studentRef = db.collection("students").doc(studentId);
  const studentSnap = await studentRef.get();
  if (studentSnap.exists) {
    await studentRef.delete();
    console.log(`  - Deleted student document.`);
  } else {
    console.log(`  - No student document found.`);
  }
}

async function main() {
  console.log("Starting cleanup of dummy test students...");
  for (const id of DUMMY_STUDENT_IDS) {
    await removeStudentData(id);
  }
  console.log("\nCleanup finished successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error during cleanup:", err);
    process.exit(1);
  });
