import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { NewPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the reset email: /auth/callback signs the person in, then sends them here.
export default async function ResetPasswordPage() {
  await requireViewer("/reset-password");
  return <NewPasswordForm />;
}
