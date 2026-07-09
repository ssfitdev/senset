import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminAuth } from "@/lib/firebase/verify";
import { COLLECTIONS } from "@/lib/firestore/schema";

export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/admin/students/[studentId]">,
) {
  const decoded = await requireAdminAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { studentId } = await ctx.params;
  await adminDb.collection(COLLECTIONS.students).doc(studentId).delete();

  return NextResponse.json({ ok: true });
}
