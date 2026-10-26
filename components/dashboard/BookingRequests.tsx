"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Booking, STATUS_LABEL, dollarsToCents, formatWhen, money } from "@/lib/format";

type Request = Booking & {
  client: { full_name: string; email: string; phone: string | null } | null;
  flash: { id: string; title: string | null; is_repeatable: boolean } | null;
};

const FILTERS = [
  { id: "pending", label: "New", match: (b: Request) => b.status === "pending" },
  { id: "upcoming", label: "Accepted", match: (b: Request) => b.status === "accepted" },
  { id: "past", label: "Past", match: (b: Request) => ["completed", "declined", "cancelled"].includes(b.status) },
];

export function BookingRequests({ bookings, referenceUrls }: { bookings: Request[]; referenceUrls: Record<string, string> }) {
  const [filter, setFilter] = useState("pending");
  const active = FILTERS.find((f) => f.id === filter)!;
  const list = bookings.filter(active.match);

  return (
    <div className="stack">
      <div className="row" role="group" aria-label="Filter requests">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label} <span className="mono">{bookings.filter(f.match).length}</span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="empty">{filter === "pending" ? "No new requests. They'll show up here when clients book you." : "Nothing here yet."}</div>
      ) : (
        list.map((b) => <RequestCard key={b.id} booking={b} referenceUrls={referenceUrls} />)
      )}
    </div>
  );
}

function RequestCard({ booking: b, referenceUrls }: { booking: Request; referenceUrls: Record<string, string> }) {
  const router = useRouter();
  const [quote, setQuote] = useState(b.quoted_price_cents != null ? String(b.quoted_price_cents / 100) : "");
  const [note, setNote] = useState(b.artist_note ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: string) {
    setBusy(status);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status, quoted_price_cents: dollarsToCents(quote), artist_note: note.trim() || null })
      .eq("id", b.id);
    if (error) {
      setBusy(null);
      return setError(error.code === "23505" ? "You've already accepted another booking at this time." : error.message);
    }
    // A one-off flash design is gone once it's booked.
    if (status === "accepted" && b.flash && !b.flash.is_repeatable) {
      await supabase.from("portfolios").update({ is_claimed: true }).eq("id", b.flash.id);
    }
    setBusy(null);
    router.refresh();
  }

  async function toggleDeposit() {
    setBusy("deposit");
    setError(null);
    const { error } = await createClient().from("bookings").update({ deposit_paid: !b.deposit_paid }).eq("id", b.id);
    setBusy(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <article className="list-card">
      <div className="list-card-head">
        <div>
          <h3>{b.client?.full_name || b.client?.email || "Client"}</h3>
          <p className="mono">{formatWhen(b.requested_start)}</p>
        </div>
        <span className={`status ${b.status}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
      </div>
      <p className="idea">{b.flash?.title ? `Flash: ${b.flash.title}. ` : ""}{b.idea_description}</p>
      <dl className="kv">
        <dt>Placement</dt><dd>{b.placement}</dd>
        <dt>Size</dt><dd>{b.size_inches} in</dd>
        {b.client?.email && (<><dt>Email</dt><dd>{b.client.email}</dd></>)}
        {b.client?.phone && (<><dt>Phone</dt><dd>{b.client.phone}</dd></>)}
        {b.status !== "pending" && b.quoted_price_cents != null && (<><dt>Quote</dt><dd className="mono">{money(b.quoted_price_cents)}</dd></>)}
      </dl>
      {b.reference_image_paths.length > 0 && (
        <div className="mini-thumbs">
          {b.reference_image_paths.map((p) =>
            referenceUrls[p] ? (
              <a key={p} href={referenceUrls[p]} target="_blank" rel="noopener noreferrer"><img src={referenceUrls[p]} alt="Client reference" /></a>
            ) : null
          )}
        </div>
      )}

      {b.status === "pending" && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor={`quote-${b.id}`}>Quote ($)</label>
              <input id={`quote-${b.id}`} className="input" type="number" inputMode="decimal" min={0} step={10} placeholder="250" value={quote} onChange={(e) => setQuote(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor={`note-${b.id}`}>Note to client <span className="opt">optional</span></label>
              <input id={`note-${b.id}`} className="input" placeholder="See you then!" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn small" onClick={() => update("accepted")} disabled={!!busy}>{busy === "accepted" ? "Accepting…" : "Accept"}</button>
            <button type="button" className="btn danger small" onClick={() => update("declined")} disabled={!!busy}>{busy === "declined" ? "Declining…" : "Decline"}</button>
          </div>
        </div>
      )}
      {b.status === "accepted" && (
        <div className="row">
          <label className="check"><input type="checkbox" checked={b.deposit_paid} onChange={toggleDeposit} disabled={!!busy} /> Deposit received</label>
          <button type="button" className="btn ghost small" onClick={() => update("completed")} disabled={!!busy}>{busy === "completed" ? "Saving…" : "Mark as completed"}</button>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </article>
  );
}
