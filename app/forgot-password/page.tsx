import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
