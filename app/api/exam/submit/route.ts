import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verify";
import { gradeSession } from "@/lib/exam/grading";
import { getExamConfig } from "@/lib/exam/config";

export async function POST(request: Request) {
  const decoded = await requireAuth(request);
  if (!decoded) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const result = await gradeSession(decoded.uid);
  if (!result) {
    return NextResponse.json({ error: "No exam session found to submit." }, { status: 404 });
  }

  const config = await getExamConfig();

  return NextResponse.json({
    ...result,
    resultsVisibleToStudents: config?.resultsVisibleToStudents ?? false,
  });
}
