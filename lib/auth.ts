import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The signed-in person and their app profile, or null when signed out. */
export async function getViewer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role, phone")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

/** Like getViewer, but sends signed-out visitors to the login page first. */
export async function requireViewer(returnTo: string) {
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return { ...viewer, user: viewer.user };
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
