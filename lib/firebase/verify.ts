import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";

export async function requireAuth(request: Request): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

/** Same as requireAuth, but also requires the `admin` custom claim. */
export async function requireAdminAuth(request: Request): Promise<DecodedIdToken | null> {
  const decoded = await requireAuth(request);
  if (!decoded || decoded.admin !== true) return null;
  return decoded;
}
