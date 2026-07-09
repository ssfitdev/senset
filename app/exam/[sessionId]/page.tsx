import type { Metadata } from "next";
import { ExamRunner } from "@/components/exam/ExamRunner";

export const metadata: Metadata = {
  title: "Exam in progress",
};

export default async function ExamSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ExamRunner sessionId={sessionId} />;
}
