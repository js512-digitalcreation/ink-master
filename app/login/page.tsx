import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer, safeNext } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const { user } = await getViewer();
  if (user) redirect(safeNext(next));
  return (
    <AuthForm
      mode="login"
      next={safeNext(next)}
      initialError={error === "link" ? "That sign-in link has expired or was already used. Log in with your password instead." : null}
    />
  );
}
