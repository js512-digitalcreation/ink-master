import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { BecomeArtist } from "@/components/dashboard/BecomeArtist";
import { BookingRequests } from "@/components/dashboard/BookingRequests";
import { PortfolioManager } from "@/components/dashboard/PortfolioManager";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

export const metadata: Metadata = { title: "Artist studio" };

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireViewer("/dashboard");

  if (profile?.role !== "artist") {
    return (
      <div className="page">
        <header className="topbar"><h1 className="h-page">Artist studio</h1></header>
        <BecomeArtist userId={user.id} />
      </div>
    );
  }

  const { data: artist } = await supabase.from("artist_profiles").select("*").eq("user_id", user.id).maybeSingle();

  if (!artist) {
    return (
      <div className="page">
        <header className="topbar"><h1 className="h-page">Set up your profile</h1></header>
        <p className="lede" style={{ marginBottom: 18 }}>This is what clients see when they find you. You can change it any time.</p>
        <ProfileEditor userId={user.id} artist={null} defaultName={profile.full_name} />
      </div>
    );
  }

  const [{ data: works }, { data: bookings }] = await Promise.all([
    supabase.from("portfolios").select("*").eq("artist_id", artist.id).order("sort_order").order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, client:users(full_name, email, phone), flash:portfolios(id, title, is_repeatable)")
      .eq("artist_id", artist.id)
      .order("requested_start", { ascending: true }),
  ]);

  // Reference photos are private: make short-lived links the artist can open.
  const paths = (bookings ?? []).flatMap((b) => b.reference_image_paths);
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("booking-references").createSignedUrls(paths, 60 * 60);
    data?.forEach((d) => { if (d.path && d.signedUrl) signed[d.path] = d.signedUrl; });
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="h-page">Artist studio</h1>
        <Link className="btn ghost small" href={`/artists/${artist.slug}`}>View my page</Link>
      </header>
      <nav className="dash-tabs" aria-label="Studio sections">
        <a className="chip" href="#requests">Requests</a>
        <a className="chip" href="#work">Portfolio &amp; flash</a>
        <a className="chip" href="#profile">Profile</a>
      </nav>

      <section className="dash-section" id="requests" aria-labelledby="requests-h">
        <h2 className="section-title" id="requests-h">Booking requests</h2>
        <BookingRequests bookings={bookings ?? []} referenceUrls={signed} />
      </section>

      <section className="dash-section" id="work" aria-labelledby="work-h">
        <h2 className="section-title" id="work-h">Portfolio &amp; flash</h2>
        <PortfolioManager artistId={artist.id} userId={user.id} works={works ?? []} />
      </section>

      <section className="dash-section" id="profile" aria-labelledby="profile-h">
        <h2 className="section-title" id="profile-h">Profile</h2>
        <ProfileEditor userId={user.id} artist={artist} defaultName={profile.full_name} />
      </section>
    </div>
  );
}
