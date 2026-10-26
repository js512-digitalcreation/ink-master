// What each person is told when a booking changes. Pure functions, so `node --test` can load them.

export type NotifyEvent = "requested" | "accepted" | "declined" | "cancelled" | "reminder";

export type BookingInfo = {
  status: string;
  requested_start: string;
  artistName: string;
  clientName: string;
  flashTitle: string | null;
  quoteCents: number | null;
  depositCents: number;
  artistNote: string | null;
  timeZone: string;
};

export type Message = {
  to: "artist" | "client";
  title: string;
  body: string;
  /** Path in the app to open. */
  path: string;
  button: string;
};

/** The event a booking's current status stands for (each is sent at most once). */
export function eventForStatus(status: string): NotifyEvent | null {
  if (status === "pending") return "requested";
  if (status === "accepted" || status === "declined" || status === "cancelled") return status;
  return null;
}

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

export function when(iso: string, timeZone: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function messageFor(event: NotifyEvent, b: BookingInfo): Message {
  const at = when(b.requested_start, b.timeZone);
  const what = b.flashTitle ? `the "${b.flashTitle}" flash` : "a tattoo";
  const firstName = (name: string) => name.split(" ")[0] || name;
  switch (event) {
    case "requested":
      return {
        to: "artist",
        title: "New booking request",
        body: `${b.clientName || "A client"} wants ${what} on ${at}.`,
        path: "/dashboard#requests",
        button: "Review request",
      };
    case "cancelled":
      return {
        to: "artist",
        title: "Booking request cancelled",
        body: `${b.clientName || "A client"} cancelled their request for ${at}. The time is free again.`,
        path: "/dashboard#requests",
        button: "Open studio",
      };
    case "accepted": {
      const quote = b.quoteCents != null ? ` Quote: ${money(b.quoteCents)}.` : "";
      const deposit = b.depositCents > 0 ? ` Pay your ${money(b.depositCents)} deposit to lock it in.` : "";
      return {
        to: "client",
        title: `${firstName(b.artistName)} accepted your booking`,
        body: `See you ${at}.${quote}${deposit}`,
        path: "/bookings",
        button: b.depositCents > 0 ? "Pay deposit" : "View booking",
      };
    }
    case "declined":
      return {
        to: "client",
        title: `${firstName(b.artistName)} can't take this booking`,
        body: b.artistNote ? `"${b.artistNote}"` : "Try another time or another artist.",
        path: "/bookings",
        button: "View booking",
      };
    case "reminder":
      return {
        to: "client",
        title: "Tattoo tomorrow",
        body: `Reminder: your session with ${b.artistName} is ${at}.`,
        path: "/bookings",
        button: "View booking",
      };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, mobile-friendly email for a message. */
export function emailFor(m: Message, siteUrl: string) {
  const href = `${siteUrl}${m.path}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f2f3f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#161922">
<div style="max-width:480px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 18px;font-size:20px;font-weight:700">Ink <span style="color:#1c6b60">Masters</span></p>
<div style="background:#fff;border-radius:14px;padding:22px">
<h1 style="margin:0 0 10px;font-size:19px">${esc(m.title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3b404b">${esc(m.body)}</p>
<a href="${esc(href)}" style="display:inline-block;background:#1c6b60;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px">${esc(m.button)}</a>
</div>
<p style="font-size:12px;color:#5c6371;margin:16px 4px 0">You get these because of a booking on Ink Masters. Turn emails off any time in Account → Notifications.</p>
</div></body></html>`;
  const text = `${m.title}\n\n${m.body}\n\n${m.button}: ${href}\n\nTurn emails off any time in Account → Notifications.`;
  return { subject: m.title, html, text };
}
