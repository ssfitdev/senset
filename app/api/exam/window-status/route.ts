import { NextResponse } from "next/server";
import { computeWindowState, getExamConfig } from "@/lib/exam/config";

export async function GET() {
  const config = await getExamConfig();
  const state = computeWindowState(config);
  return NextResponse.json(state);
}
