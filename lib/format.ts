import type { Tables } from "@/lib/supabase/database.types";

export type Artist = Tables<"artist_profiles">;
export type Work = Tables<"portfolios">;
export type Booking = Tables<"bookings">;

export const STYLES = [
  "Traditional", "Neo-Trad", "Realism", "Fineline", "Blackwork", "Japanese",
  "Tribal", "Watercolor", "Geometric", "Script", "Illustrative", "Micro",
];

export const PLACEMENTS = [
  "Inner forearm", "Outer forearm", "Upper arm", "Calf", "Thigh", "Chest", "Shoulder blade", "Ankle",
];

/** Session start times offered on the booking calendar (shop's local time). */
export const SLOT_TIMES = ["11:00", "12:30", "14:00", "15:30", "17:00", "18:30"];

/** How far ahead clients can request a date. */
export const BOOKING_WINDOW_DAYS = 90;

export const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for reply",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: cents % 100 ? 2 : 0 })}`;
}

export function dollarsToCents(value: string) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function centsToDollars(cents: number | null | undefined) {
  return cents == null ? "" : String(cents / 100);
}

export function duration(minutes: number | null | undefined) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} ${h === 1 ? "hr" : "hrs"}`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/** A stable colour for an artist's initials avatar. */
export function avatarColor(seed: string) {
  const palette = ["#a3362e", "#2c5b8a", "#1c6b60", "#6d5a8f", "#8a5a1c", "#b0567a", "#4b4f58", "#7b4ab0"];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Public URL for an image in the 'portfolio' storage bucket. */
export function imageUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path; // full URL, or an image shipped with the site
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${encoded}`;
}

/** Straight-line distance in miles between two points. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export function fileExtension(file: File) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : "";
  return (fromName || file.type.split("/")[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/** Random id for file names. crypto.randomUUID only exists on HTTPS (or localhost), so fall back. */
export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
