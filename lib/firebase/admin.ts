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
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase Admin credentials. Environment status: ` +
      `projectId=${projectId ? "set" : "missing"}, ` +
      `clientEmail=${clientEmail ? "set" : "missing"}, ` +
      `privateKey=${privateKey ? "set" : "missing"}.`
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function getAdminApp(): App {
  if (!cachedApp) {
    cachedApp = buildAdminApp();
  }
  return cachedApp;
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    if (!cachedAuth) {
      cachedAuth = getAuth(getAdminApp());
    }
    const value = Reflect.get(cachedAuth, prop, receiver);
    if (typeof value === "function") {
      return value.bind(cachedAuth);
    }
    return value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(target, prop, receiver) {
    if (!cachedDb) {
      cachedDb = getFirestore(getAdminApp());
    }
    const value = Reflect.get(cachedDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(cachedDb);
    }
    return value;
  },
});
