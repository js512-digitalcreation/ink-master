// Works out who to tell about a booking event and tells them, at most once per event.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type NotifyEvent, messageFor } from "./messages";
import { sendEmail, sendPush } from "./send";

type Admin = SupabaseClient<Database>;

export async function deliver(admin: Admin, bookingId: string, event: NotifyEvent) {
  const { data: b } = await admin
    .from("bookings")
    .select("id, status, requested_start, quoted_price_cents, artist_note, client_id, flash:portfolios(title), artist:artist_profiles(user_id, display_name, deposit_cents, time_zone)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b || !b.artist) return { skipped: "booking not found" };

  // Claim this event first; if it was already claimed, someone has been told.
  const { data: claimed } = await admin
    .from("notification_log")
    .upsert({ booking_id: b.id, event }, { onConflict: "booking_id,event", ignoreDuplicates: true })
    .select("booking_id");
  if (!claimed?.length) return { skipped: "already sent" };

  const { data: people } = await admin.from("users").select("id, full_name, email, notify_email, notify_push").in("id", [b.client_id, b.artist.user_id]);
  const client = people?.find((p) => p.id === b.client_id);
  const artistUser = people?.find((p) => p.id === b.artist!.user_id);

  const m = messageFor(event, {
    status: b.status,
    requested_start: b.requested_start,
    artistName: b.artist.display_name,
    clientName: client?.full_name || "",
    flashTitle: b.flash?.title ?? null,
    quoteCents: b.quoted_price_cents,
    depositCents: b.artist.deposit_cents,
    artistNote: b.artist_note,
    timeZone: b.artist.time_zone,
  });
  const to = m.to === "artist" ? artistUser : client;
  if (!to) return { skipped: "recipient not found" };

  const attempt = async (fn: () => Promise<string>) => {
    try { return await fn(); } catch (err) { return `error: ${err instanceof Error ? err.message : String(err)}`; }
  };
  const result = {
    to: m.to,
    push: to.notify_push ? await attempt(() => sendPush(admin, to.id, m)) : "off",
    email: to.notify_email && to.email ? await attempt(() => sendEmail(to.email, m)) : "off",
  };
  await admin.from("notification_log").update({ result }).eq("booking_id", b.id).eq("event", event);
  return result;
}
