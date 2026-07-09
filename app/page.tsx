import type { Metadata } from "next";
import { LoginHero } from "@/components/exam/LoginHero";

export const metadata: Metadata = {
  title: "SensET",
  description: "Sign in with your Student ID or registered phone number to begin your examination.",
};

export default function Home() {
  return <LoginHero />;
}
