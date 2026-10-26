import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { STATUS_LABEL, formatWhen, money } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { CancelBookingButton } from "@/components/CancelBookingButton";
import { PayDeposit } from "@/components/PayDeposit";

export const metadata: Metadata = { title: "My bookings" };

export default async function BookingsPage() {
  const { supabase, user } = await requireViewer("/bookings");
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, status, requested_start, placement, size_inches, idea_description, quoted_price_cents, artist_note, deposit_paid, created_at, artist_id, artist:artist_profiles(display_name, slug, shop_name, avatar_url, deposit_cents, payment_methods), flash:portfolios(title)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // How to pay each artist who has accepted a booking (only readable once they accept).
  const acceptedArtists = [...new Set((bookings ?? []).filter((b) => b.status === "accepted").map((b) => b.artist_id))];
  const { data: handleRows } = acceptedArtists.length
    ? await supabase.from("artist_payment_handles").select("artist_id, venmo, paypal, cashapp, zelle").in("artist_id", acceptedArtists)
    : { data: [] };
  const handles = new Map((handleRows ?? []).map((h) => [h.artist_id, h]));

  return (
    <div className="page">
      <header className="topbar"><h1 className="h-page">My bookings</h1></header>
      {error ? (
        <div className="notice error">Couldn't load your bookings: {error.message}</div>
      ) : !bookings?.length ? (
        <div className="empty">
          <strong>No booking requests yet</strong>
          Find an artist you like and tap Book Consultation.
          <Link className="btn small" href="/">Browse artists</Link>
        </div>
      ) : (
        <div className="stack">
          {bookings.map((b) => (
            <article key={b.id} className="list-card">
              <div className="list-card-head">
                <div className="card-head">
                  {b.artist && <Avatar name={b.artist.display_name} url={b.artist.avatar_url} />}
                  <div className="who">
                    <h3>{b.artist ? <Link href={`/artists/${b.artist.slug}`}>{b.artist.display_name}</Link> : "Artist"}</h3>
                    <p className="shop"><span className="mono">{formatWhen(b.requested_start)}</span></p>
                  </div>
                </div>
                <span className={`status ${b.status}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
              </div>
              <p className="idea">{b.flash?.title ? `Flash: ${b.flash.title}. ` : ""}{b.idea_description}</p>
              <dl className="kv">
                <dt>Placement</dt><dd>{b.placement}</dd>
                <dt>Size</dt><dd>{b.size_inches} in</dd>
                {b.quoted_price_cents != null && (<><dt>Quote</dt><dd className="mono">{money(b.quoted_price_cents)}</dd></>)}
                {b.status === "accepted" && b.artist && b.artist.deposit_cents > 0 && (<><dt>Deposit</dt><dd className="mono">{money(b.artist.deposit_cents)}</dd></>)}
              </dl>
              {b.artist_note && <div className="notice">“{b.artist_note}”</div>}
              {b.status === "accepted" && b.artist && b.artist.deposit_cents > 0 && (
                b.deposit_paid
                  ? <p className="paid">✓ Deposit received</p>
                  : <PayDeposit artistName={b.artist.display_name} cents={b.artist.deposit_cents} methods={b.artist.payment_methods} handles={handles.get(b.artist_id) ?? null} />
              )}
              {b.status === "pending" && <CancelBookingButton id={b.id} />}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
