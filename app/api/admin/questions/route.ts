import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminAuth } from "@/lib/firebase/verify";
import { questionsUploadSchema } from "@/lib/validation/schemas";
import { COLLECTIONS } from "@/lib/firestore/schema";

const BATCH_SIZE = 450;

export async function POST(request: Request) {
  const decoded = await requireAdminAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = questionsUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid question rows." },
      { status: 400 },
    );
  }

  const rows = parsed.data;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    chunk.forEach((row) => {
      const ref = adminDb.collection(COLLECTIONS.questions).doc();
      batch.set(ref, {
        text: row.text,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctOption: row.correctOption,
        ...(row.category ? { category: row.category } : {}),
        createdAt: Timestamp.now(),
      });
    });
    await batch.commit();
  }

  return NextResponse.json({ count: rows.length });
}
