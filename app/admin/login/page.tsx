import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
