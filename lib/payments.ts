// Ways an artist can be paid, and links that open the right app with the deposit filled in.
// Kept free of imports so `node --test` can load it directly.

export type MethodId = "cash" | "card" | "venmo" | "paypal" | "cashapp" | "zelle";
export type HandleMethod = "venmo" | "paypal" | "cashapp" | "zelle";
export type Handles = Partial<Record<HandleMethod, string | null>>;

export const METHODS: { id: MethodId; label: string; handle?: { placeholder: string; hint: string } }[] = [
  { id: "venmo", label: "Venmo", handle: { placeholder: "@your-venmo", hint: "Your Venmo username" } },
  { id: "paypal", label: "PayPal", handle: { placeholder: "paypal.me/yourname", hint: "Your PayPal.Me link or name" } },
  { id: "cashapp", label: "Cash App", handle: { placeholder: "$yourcashtag", hint: "Your $Cashtag" } },
  { id: "zelle", label: "Zelle", handle: { placeholder: "email or phone", hint: "The email or phone your Zelle uses" } },
  { id: "card", label: "Card in shop" },
  { id: "cash", label: "Cash" },
];

export const methodLabel = (id: string) => METHODS.find((m) => m.id === id)?.label ?? id;

export function needsHandle(id: string): id is HandleMethod {
  return id === "venmo" || id === "paypal" || id === "cashapp" || id === "zelle";
}

/** "Venmo · PayPal · Cash", or "Cash only". Unknown ids are ignored. */
export function describeMethods(ids: readonly string[]) {
  const known = METHODS.filter((m) => ids.includes(m.id));
  if (known.length === 1 && known[0].id === "cash") return "Cash only";
  return known.map((m) => m.label).join(" · ");
}

/** Turns whatever the artist typed (a link, @name, $tag…) into the bare handle. Returns "" if nothing usable. */
export function cleanHandle(method: HandleMethod, raw: string) {
  let h = raw.trim();
  if (method === "zelle") return h.replace(/\s+/g, " ");
  h = h.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (method === "venmo") h = h.replace(/^venmo\.com\/(u\/)?/i, "").replace(/^@/, "");
  if (method === "paypal") h = h.replace(/^paypal\.me\//i, "").replace(/^@/, "");
  if (method === "cashapp") h = h.replace(/^cash\.app\//i, "").replace(/^\$/, "");
  h = h.split(/[/?#\s]/)[0];
  return /^[A-Za-z0-9_.-]{1,40}$/.test(h) ? h : "";
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

/** A link that opens the payment app with the amount (and a note, where supported). Null for Zelle, cash and card. */
export function payLink(method: string, handle: string | null | undefined, cents: number, note: string) {
  if (!handle || !needsHandle(method) || method === "zelle") return null;
  const h = encodeURIComponent(handle);
  if (method === "venmo") {
    return `https://venmo.com/?txn=pay&recipients=${h}&amount=${dollars(cents)}&note=${encodeURIComponent(note)}`;
  }
  if (method === "paypal") return `https://paypal.me/${h}/${dollars(cents)}USD`;
  return `https://cash.app/$${h}/${dollars(cents)}`;
}
