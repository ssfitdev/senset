"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

// Persistent local (IndexedDB) cache: exam progress reads/writes hit the
// local cache first and sync in the background, so a refresh or a brief
// network drop never loses in-flight answers — they're already on disk and
// queued writes flush once connectivity returns. Falls back to the default
// in-memory Firestore instance on the server or if persistence can't be
// enabled (e.g. private browsing, multiple tabs racing initialization).
function createFirestore(): Firestore {
  if (typeof window === "undefined") return getFirestore(firebaseApp);
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const db: Firestore = createFirestore();

// Wire up to the local Firebase Emulator Suite in development so nothing
// ever touches production data while iterating.
declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_EMULATORS_CONNECTED__: boolean | undefined;
}

if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
  typeof window !== "undefined" &&
  !globalThis.__FIREBASE_EMULATORS_CONNECTED__
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalThis.__FIREBASE_EMULATORS_CONNECTED__ = true;
}
