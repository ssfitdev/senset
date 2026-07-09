import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function buildAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (useEmulators) {
    // Emulators don't validate credentials; a bare projectId is enough.
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY (or enable NEXT_PUBLIC_USE_FIREBASE_EMULATORS for local dev).",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = buildAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
