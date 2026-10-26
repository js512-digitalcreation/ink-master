import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { BookingForm } from "@/components/BookingForm";

export const viewport: Viewport = { themeColor: "#0c0d11" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ flash?: string; work?: string; tryon?: string }> };

export const metadata: Metadata = { title: "Booking request" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const flashId = query.flash;
  const workId = query.work;
  const tryon = query.tryon === "1";
  const keep = new URLSearchParams();
  if (flashId) keep.set("flash", flashId);
  if (workId) keep.set("work", workId);
  if (tryon) keep.set("tryon", "1");
  const { supabase, user } = await requireViewer(`/artists/${slug}/book${keep.size ? `?${keep}` : ""}`);

  const { data: artist } = await supabase
    .from("artist_profiles")
    .select("id, user_id, slug, display_name, shop_name, avatar_url, deposit_cents, books_open")
    .eq("slug", slug)
    .maybeSingle();
  if (!artist) notFound();

  let flash = null;
  if (flashId && UUID.test(flashId)) {
    const { data } = await supabase
      .from("portfolios")
      .select("id, title, image_path, price_cents, estimated_minutes, size_inches, is_claimed")
      .eq("id", flashId)
      .eq("artist_id", artist.id)
      .eq("kind", "flash")
      .maybeSingle();
    if (data && !data.is_claimed) flash = data;
  }

  // A past-work piece the client tried on: used to pre-fill the idea, not linked as flash.
  let work = null;
  if (!flash && workId && UUID.test(workId)) {
    const { data } = await supabase
      .from("portfolios")
      .select("id, title")
      .eq("id", workId)
      .eq("artist_id", artist.id)
      .maybeSingle();
    work = data;
  }

  const blocked =
    artist.user_id === user.id
      ? "This is your own profile. Clients will see the booking form here."
      : !artist.books_open
        ? `${artist.display_name} isn't taking new bookings right now.`
        : null;

  return (
    <div className="ink">
      {blocked ? (
        <div className="auth">
          <h1 className="h-page">Booking request</h1>
          <div className="notice">{blocked}</div>
          <Link className="btn ghost" href={`/artists/${artist.slug}`}>Back to profile</Link>
        </div>
      ) : (
        <BookingForm artist={artist} flash={flash} work={work} tryOnId={tryon ? (flash?.id ?? work?.id ?? null) : null} userId={user.id} />
      )}
    </div>
  );
}
