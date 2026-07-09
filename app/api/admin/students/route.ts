import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminAuth } from "@/lib/firebase/verify";
import { studentsUploadSchema } from "@/lib/validation/schemas";
import { COLLECTIONS } from "@/lib/firestore/schema";

const BATCH_SIZE = 450;

export async function POST(request: Request) {
  const decoded = await requireAdminAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = studentsUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid student rows." },
      { status: 400 },
    );
  }

  const rows = parsed.data;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    chunk.forEach((row) => {
      const ref = adminDb.collection(COLLECTIONS.students).doc(row.studentId);
      batch.set(
        ref,
        {
          name: row.name,
          phone: row.phone,
          district: row.district,
          division: row.division,
          createdAt: Timestamp.now(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }

  return NextResponse.json({ count: rows.length });
}
