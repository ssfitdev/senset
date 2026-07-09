import type { Metadata } from "next";
import { InstructionsView } from "@/components/exam/InstructionsView";

export const metadata: Metadata = {
  title: "Instructions",
};

export default function InstructionsPage() {
  return <InstructionsView />;
}
