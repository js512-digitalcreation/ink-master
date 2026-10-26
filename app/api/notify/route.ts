// Called by the database whenever a booking is created or its status changes.
// It only carries the booking id; everything else is read fresh, and each event is sent once.
import { createAdminClient } from "@/lib/supabase/admin";
import { deliver } from "@/lib/notify/deliver";
import { eventForStatus } from "@/lib/notify/messages";
import { UUID } from "@/lib/format";

export async function POST(request: Request) {
  const { booking_id } = (await request.json().catch(() => ({}))) as { booking_id?: string };
  if (!booking_id || !UUID.test(booking_id)) return Response.json({ error: "booking_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: b } = await admin.from("bookings").select("status").eq("id", booking_id).maybeSingle();
  const event = b && eventForStatus(b.status);
  if (!event) return Response.json({ skipped: "nothing to send" });

  const result = await deliver(admin, booking_id, event);
  console.log("notify", booking_id, event, JSON.stringify(result));
  return Response.json(result);
}
