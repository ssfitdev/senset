/**
 * Queries all exam sessions and analyzes them for issues (e.g. expired but not submitted,
 * zero attempts, extreme delays, mismatch in timestamps).
 */
import { existsSync, readFileSync } from "fs";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
    console.log(`[EMULATOR] Connecting to: ${projectId}`);
    return getFirestore(initializeApp({ projectId }));
  }

  const serviceAccountPath = "firebase-config.json";
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    return getFirestore(initializeApp({ credential: cert(serviceAccount) }));
  }
  throw new Error("Credentials missing");
}

const db = getAdminDb();

async function main() {
  console.log("Analyzing Firestore examSessions...");
  const snapshot = await db.collection("examSessions").get();
  
  const sessions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`Total sessions: ${sessions.length}`);
  
  const stats = {
    submitted: 0,
    inProgress: 0,
    expiredNotSubmitted: 0,
    zeroAttempted: 0,
  };

  const now = Date.now();
  const anomalies: any[] = [];

  for (const s of sessions as any[]) {
    const started = s.startedAt ? s.startedAt.toMillis() : 0;
    const expires = s.expiresAt ? s.expiresAt.toMillis() : 0;
    const submitted = s.submittedAt ? s.submittedAt.toMillis() : null;
    const status = s.status;
    const attempted = s.totalAttempted ?? 0;
    const name = s.studentName;

    if (status === "submitted") {
      stats.submitted++;
      // Check if submission was extremely late or had other timestamp weirdness
      const duration = submitted - started;
      const extraTime = submitted - expires;
      if (extraTime > 60000) { // Submitted more than 1 minute after expiration
        anomalies.push({
          id: s.id,
          name,
          status,
          attempted,
          started,
          expires,
          submitted,
          issue: "Overtime Submission",
          details: `Submitted ${Math.round(extraTime / 1000)}s after expiration. Likely due to network lag/server timeout during autosubmit.`,
          severity: extraTime > 300000 ? 3 : 2 // High severity if > 5m late
        });
      }
    } else if (status === "in_progress") {
      stats.inProgress++;
      if (expires < now) {
        stats.expiredNotSubmitted++;
        
        // This is a major issue: the session expired but was never submitted/graded by the server!
        // Let's count how many answers they actually had saved in Firestore to see if their progress was lost.
        const answersSnap = await db.collection("examSessions").doc(s.id).collection("answers").get();
        const answersSaved = answersSnap.size;
        
        anomalies.push({
          id: s.id,
          name,
          status,
          attempted: answersSaved,
          started,
          expires,
          submitted: null,
          issue: "Stuck In Progress / Expired",
          details: `Expired at ${new Date(expires).toLocaleTimeString()}. Had ${answersSaved} saved answers but the session was never submitted or closed by the server due to outage.`,
          severity: 5 // Maximum severity - student got 0 score because session wasn't submitted
        });
      }
    }

    if (attempted === 0 && status === "submitted") {
      stats.zeroAttempted++;
      anomalies.push({
        id: s.id,
        name,
        status,
        attempted: 0,
        started,
        expires,
        submitted,
        issue: "Submitted with 0 Attempts",
        details: "Session was submitted but has 0 questions attempted. Could indicate immediate crash or failure to write any answers.",
        severity: 4
      });
    }
  }

  console.log("\nSummary Stats:", stats);
  console.log(`\nAnomalies Found (${anomalies.length}):`);
  
  // Sort by severity descending
  anomalies.sort((a, b) => b.severity - a.severity);
  
  anomalies.forEach((a, i) => {
    console.log(`[${i + 1}] Severity ${a.severity} | ${a.name} (${a.id}) - ${a.issue}`);
    console.log(`    Details: ${a.details}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
