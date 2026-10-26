// Delivers a message by email (Resend) and phone notification (Web Push). Server only.
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type Message, emailFor } from "./messages";

type Admin = SupabaseClient<Database>;
export const SITE_URL = "https://inkmasters.art";
const FROM = process.env.EMAIL_FROM || "Ink Masters <bookings@inkmasters.art>";

/**
 * The push keys. Created by the server the first time they're needed and kept in app_config,
 * which only the server can read, so the private key never has to be copied anywhere.
 */
export async function pushKeys(admin: Admin) {
  const read = async () => {
    const { data } = await admin.from("app_config").select("key, value").in("key", ["vapid_public", "vapid_private"]);
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    return map.get("vapid_public") && map.get("vapid_private")
      ? { publicKey: map.get("vapid_public")!, privateKey: map.get("vapid_private")! }
      : null;
  };
  const existing = await read();
  if (existing) return existing;
  const fresh = webpush.generateVAPIDKeys();
  // If two requests race, the first insert wins and both read it back.
  await admin.from("app_config").upsert(
    [{ key: "vapid_public", value: fresh.publicKey }, { key: "vapid_private", value: fresh.privateKey }],
    { onConflict: "key", ignoreDuplicates: true }
  );
  return (await read())!;
}

export async function sendEmail(to: string, m: Message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "skipped: email not set up";
  const e = emailFor(m, SITE_URL);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: e.subject, html: e.html, text: e.text }),
  });
  return res.ok ? "sent" : `failed: ${res.status} ${(await res.text()).slice(0, 200)}`;
}

export async function sendPush(admin: Admin, userId: string, m: Message) {
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (!subs?.length) return "skipped: no devices";
  const keys = await pushKeys(admin);
  webpush.setVapidDetails(SITE_URL, keys.publicKey, keys.privateKey);
  const payload = JSON.stringify({ title: m.title, body: m.body, url: m.path });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      // The phone unsubscribed or the app was removed: forget that device.
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return `sent to ${sent}/${subs.length} devices`;
}
