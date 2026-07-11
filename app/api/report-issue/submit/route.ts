import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/schema";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body.studentId !== "string" ||
      typeof body.issueType !== "string" ||
      typeof body.description !== "string"
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { studentId, issueType, description } = body;

    if (!description.trim() || description.trim().length < 10) {
      return NextResponse.json({ error: "Description must be at least 10 characters long." }, { status: 400 });
    }

    // Double check that student exists
    const studentSnap = await adminDb.collection(COLLECTIONS.students).doc(studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json({ error: "Invalid student reference." }, { status: 404 });
    }
    const studentData = studentSnap.data();

    // Map user-friendly labels
    const issueLabels: Record<string, string> = {
      progress_lost: "Answers not saving / Progress lost",
      delayed_submit: "Exam hung / Slow submission timeout",
      login_issue: "Could not log in to my exam",
      crash: "Website crashed / Went blank",
      other: "Other technical server issue",
    };

    const typeLabel = issueLabels[issueType] || "Other Issue";
    const formattedMessage = `[ISSUE REPORT: ${typeLabel}]\n\n${description.trim()}`;

    // Write to feedback collection so administrators see it instantly
    await adminDb.collection(COLLECTIONS.feedback).add({
      studentId,
      studentName: studentData?.name || "Unknown Student",
      message: formattedMessage,
      createdAt: Timestamp.now(),
      // Add custom flag fields for filtering in analytics dashboards
      isIssueReport: true,
      issueType: issueType,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error in submit route:", error);
    return NextResponse.json({ error: "A server error occurred during submission." }, { status: 500 });
  }
}
