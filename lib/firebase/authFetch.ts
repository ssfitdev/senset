"use client";

import { auth } from "@/lib/firebase/client";

/** Fetch wrapper that attaches the signed-in student/admin's Firebase ID token. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in.");
  }
  const token = await user.getIdToken();

  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
