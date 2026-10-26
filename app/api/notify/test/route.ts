// "Send a test notification" from Account: pushes to the signed-in person's own devices only.
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/notify/send";

export async function POST() {
  const { user } = await getViewer();
  if (!user) return Response.json({ error: "Log in first." }, { status: 401 });
  const result = await sendPush(createAdminClient(), user.id, {
    to: "client", title: "Ink Masters", body: "Notifications are working on this device.", path: "/account", button: "Open",
  });
  return result.startsWith("sent to 0") || result.startsWith("skipped")
    ? Response.json({ error: "No device found. Turn notifications off and on again." }, { status: 400 })
    : Response.json({ result });
}
