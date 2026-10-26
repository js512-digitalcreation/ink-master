// The public half of the push keys, which phones need to turn on notifications.
import { createAdminClient } from "@/lib/supabase/admin";
import { pushKeys } from "@/lib/notify/send";

export const dynamic = "force-dynamic";

export async function GET() {
  const { publicKey } = await pushKeys(createAdminClient());
  return Response.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
