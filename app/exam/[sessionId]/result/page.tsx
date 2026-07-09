import type { Metadata } from "next";
import { ResultView } from "@/components/exam/ResultView";

export const metadata: Metadata = {
  title: "Result",
};

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ResultView sessionId={sessionId} />;
}
