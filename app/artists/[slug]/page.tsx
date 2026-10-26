import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/ProfileView";

export const viewport: Viewport = { themeColor: "#0c0d11" };

type Props = { params: Promise<{ slug: string }> };

async function loadArtist(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_profiles")
    .select("*, portfolios(*)")
    .eq("slug", slug)
    .order("sort_order", { referencedTable: "portfolios" })
    .order("created_at", { referencedTable: "portfolios", ascending: false })
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await loadArtist((await params).slug);
  return { title: artist?.display_name ?? "Artist not found" };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await loadArtist((await params).slug);
  if (!artist) notFound();

  const { portfolios, ...profile } = artist;
  return (
    <div className="ink">
      <ProfileView
        artist={profile}
        portfolio={portfolios.filter((w) => w.kind === "portfolio")}
        flash={portfolios.filter((w) => w.kind === "flash")}
      />
    </div>
  );
}
