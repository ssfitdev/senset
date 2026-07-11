import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.identifier !== "string" || !body.identifier.trim()) {
      return NextResponse.json({ error: "Please enter your Student ID or Phone number." }, { status: 400 });
    }

    const identifier = body.identifier.trim();
    const studentsRef = adminDb.collection(COLLECTIONS.students);

    let studentId = "";
    let studentName = "";
    let district = "";
    let division = "";

    // 1. Check by ID (case-insensitive)
    const docById = await studentsRef.doc(identifier).get();
    const docByIdUpper = docById.exists ? docById : await studentsRef.doc(identifier.toUpperCase()).get();

    if (docByIdUpper.exists) {
      studentId = docByIdUpper.id;
      const data = docByIdUpper.data();
      studentName = data?.name || "";
      district = data?.district || "";
      division = data?.division || "";
    } else {
      // 2. Check by phone number
      const querySnap = await studentsRef.where("phone", "==", identifier).limit(1).get();
      if (querySnap.empty) {
        return NextResponse.json({
          error: "No registered student was found with that ID or Phone number. Make sure it is entered correctly."
        }, { status: 404 });
      }
      studentId = querySnap.docs[0].id;
      const data = querySnap.docs[0].data();
      studentName = data?.name || "";
      district = data?.district || "";
      division = data?.division || "";
    }

    // 3. Verify that they attempted the exam (have a record in examSessions)
    const sessionSnap = await adminDb.collection(COLLECTIONS.examSessions).doc(studentId).get();
    if (!sessionSnap.exists) {
      return NextResponse.json({
        error: "Only students who have started or attempted the exam are allowed to submit issue reports."
      }, { status: 403 });
    }

    return NextResponse.json({
      verified: true,
      student: {
        studentId,
        studentName,
        district,
        division
      }
    });

  } catch (error) {
    console.error("Error in verify route:", error);
    return NextResponse.json({ error: "A server error occurred during lookup." }, { status: 500 });
  }
}
