"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AdminUserState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Resolves the signed-in user's `admin` custom claim. Forces a token
 * refresh once per sign-in since claims set via the Admin SDK right before
 * login (e.g. a freshly-seeded account) won't be in a cached ID token.
 */
export function useAdminUser(): AdminUserState {
  const [state, setState] = useState<AdminUserState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, isAdmin: false, loading: false });
        return;
      }
      const result = await user.getIdTokenResult(true);
      setState({ user, isAdmin: result.claims.admin === true, loading: false });
    });
  }, []);

  return state;
}
