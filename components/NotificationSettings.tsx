"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Device = "checking" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

function keyBytes(base64url: string) {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Account → Notifications: email on/off, and phone notifications for this device. */
export function NotificationSettings({ userId, email, notifyEmail, isArtist }: { userId: string; email: string; notifyEmail: boolean; isArtist: boolean }) {
  const [emailOn, setEmailOn] = useState(notifyEmail);
  const [device, setDevice] = useState<Device>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "good" | "error"; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("Notification" in window) || !("PushManager" in window)) return setDevice(ios && !installed ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setDevice("blocked");
      const sub = await (await registration())?.pushManager.getSubscription();
      setDevice(sub ? "on" : "off");
    })().catch(() => setDevice("unsupported"));
  }, []);

  async function toggleEmail() {
    const next = !emailOn;
    setEmailOn(next);
    const { error } = await createClient().from("users").update({ notify_email: next }).eq("id", userId);
    if (error) { setEmailOn(!next); setMessage({ kind: "error", text: error.message }); }
  }

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDevice(permission === "denied" ? "blocked" : "off");
        throw new Error("Notifications weren't allowed.");
      }
      const reg = await registration();
      if (!reg) throw new Error("This page isn't set up for notifications yet. Reload and try again.");
      const { publicKey } = await (await fetch("/api/push-key")).json();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = sub.toJSON();
      const supabase = createClient();
      const { error } = await supabase.from("push_subscriptions").upsert(
        { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw new Error(error.message);
      await supabase.from("users").update({ notify_push: true }).eq("id", userId);
      setDevice("on");
      setMessage({ kind: "good", text: "Notifications are on for this device." });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Couldn't turn on notifications." });
    }
    setBusy(false);
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    const sub = await (await registration())?.pushManager.getSubscription();
    if (sub) {
      await createClient().from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
      await sub.unsubscribe().catch(() => {});
    }
    setDevice("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/notify/test", { method: "POST" }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setMessage(res?.ok ? { kind: "good", text: "Sent. It should pop up in a few seconds." } : { kind: "error", text: body.error ?? "Couldn't send a test." });
    setBusy(false);
  }

  const what = isArtist ? "new booking requests and cancellations" : "when artists reply, plus a reminder the day before";

  return (
    <section className="list-card" id="notifications" aria-labelledby="notif-h">
      <h2 className="section-title" id="notif-h">Notifications</h2>
      <p className="hint">Get told about {what}.</p>

      <label className="check"><input type="checkbox" checked={emailOn} onChange={toggleEmail} /> Email me at {email}</label>

      <div className="notif-device">
        <div>
          <b>Phone notifications</b>
          <span className="hint">
            {device === "checking" && "Checking this device…"}
            {device === "on" && "On for this device."}
            {device === "off" && "Off for this device."}
            {device === "blocked" && "Blocked. Allow notifications for inkmasters.art in your phone's settings, then come back."}
            {device === "unsupported" && "This browser can't show notifications. Try Chrome, or Safari on an iPhone with Ink Masters on the Home Screen."}
            {device === "ios-install" && "On iPhone, first add Ink Masters to your Home Screen (Share → Add to Home Screen), then open it from there and come back here."}
          </span>
        </div>
        {device === "off" && <button type="button" className="btn small" onClick={turnOn} disabled={busy}>{busy ? "Turning on…" : "Turn on"}</button>}
        {device === "on" && <button type="button" className="btn ghost small" onClick={turnOff} disabled={busy}>Turn off</button>}
      </div>
      {device === "on" && <button type="button" className="btn ghost small" onClick={test} disabled={busy}>Send a test notification</button>}

      <p className="hint">Text messages are coming soon.</p>
      {message && <div className={`notice ${message.kind}`} role="status">{message.text}</div>}
    </section>
  );
}
