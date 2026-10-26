"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { type Handles, METHODS, payLink } from "@/lib/payments";

/** On an accepted booking: buttons that open the artist's payment apps with the deposit filled in. */
export function PayDeposit({ artistName, cents, methods, handles }: { artistName: string; cents: number; methods: string[]; handles: Handles | null }) {
  const [copied, setCopied] = useState(false);
  const note = `Tattoo deposit · ${artistName} · Ink Masters`;
  const offered = METHODS.filter((m) => methods.includes(m.id));
  const links = offered.flatMap((m) => {
    const href = payLink(m.id, handles?.[m.id as keyof Handles], cents, note);
    return href ? [{ ...m, href }] : [];
  });
  const zelle = methods.includes("zelle") ? handles?.zelle : null;
  const inShop = offered.filter((m) => m.id === "cash" || m.id === "card").map((m) => m.label.replace(" in shop", "").toLowerCase());

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the text is on screen */
    }
  }

  return (
    <div className="pay-box">
      <h4>Pay your {money(cents)} deposit</h4>
      {links.length > 0 && (
        <div className="row">
          {links.map((l) => (
            <a key={l.id} className="btn small" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          ))}
        </div>
      )}
      {zelle && (
        <div className="pay-zelle">
          <span>Zelle: <b>{zelle}</b></span>
          <button type="button" className="btn ghost small" onClick={() => copy(zelle)}>{copied ? "Copied" : "Copy"}</button>
        </div>
      )}
      {inShop.length > 0 && <p className="hint">Or pay by {inShop.join(" or ")} at the shop.</p>}
      {!links.length && !zelle && !inShop.length && <p className="hint">Ask {artistName} how they'd like the deposit paid.</p>}
      <p className="hint">{artistName} will mark it received.</p>
    </div>
  );
}
