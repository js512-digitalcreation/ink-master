// Run once a day by Vercel Cron: reminds clients about sessions in the next ~36 hours.
// Safe to call more than once; each booking gets one reminder.
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver } from "@/lib/notify/deliver";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const now = Date.now();
  const { data: upcoming } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "accepted")
    .gte("requested_start", new Date(now + 60 * 60 * 1000).toISOString())
    .lt("requested_start", new Date(now + 36 * 60 * 60 * 1000).toISOString());

  const results = [];
  for (const b of upcoming ?? []) results.push({ id: b.id, ...(await deliver(admin, b.id, "reminder")) });
  console.log("reminders", JSON.stringify(results));
  return Response.json({ checked: upcoming?.length ?? 0, results });
}
