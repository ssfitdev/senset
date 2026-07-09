import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { studentLoginSchema } from "@/lib/validation/schemas";
import { COLLECTIONS, type ExamSessionDoc, type StudentDoc } from "@/lib/firestore/schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = studentLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const identifier = parsed.data.identifier;
  const studentsRef = adminDb.collection(COLLECTIONS.students);

  let studentId: string;
  let student: StudentDoc;

  const byId = await studentsRef.doc(identifier).get();
  const byIdUpper = byId.exists ? byId : await studentsRef.doc(identifier.toUpperCase()).get();

  if (byIdUpper.exists) {
    studentId = byIdUpper.id;
    student = byIdUpper.data() as StudentDoc;
  } else {
    const byPhone = await studentsRef.where("phone", "==", identifier).limit(1).get();
    if (byPhone.empty) {
      return NextResponse.json(
        { error: "We couldn't find a registered student with that ID or phone number." },
        { status: 404 },
      );
    }
    studentId = byPhone.docs[0].id;
    student = byPhone.docs[0].data() as StudentDoc;
  }

  const sessionSnap = await adminDb.collection(COLLECTIONS.examSessions).doc(studentId).get();
  const session = sessionSnap.exists ? (sessionSnap.data() as ExamSessionDoc) : null;

  if (session?.status === "submitted") {
    return NextResponse.json(
      { error: "You have already completed this examination. Only one attempt is allowed." },
      { status: 403 },
    );
  }

  const token = await adminAuth.createCustomToken(studentId, { role: "student" });

  return NextResponse.json({
    token,
    student: {
      studentId,
      name: student.name,
      district: student.district,
      division: student.division,
    },
    hasActiveSession: session?.status === "in_progress",
  });
}
