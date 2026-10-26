import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer, safeNext } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const { next, role } = await searchParams;
  const { user } = await getViewer();
  if (user) redirect(safeNext(next));
  return <AuthForm mode="signup" next={safeNext(next)} initialRole={role === "artist" ? "artist" : "client"} />;
}
