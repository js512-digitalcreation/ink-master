import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/format";
import { TryOn } from "@/components/tryon/TryOn";

export const viewport: Viewport = { themeColor: "#0c0d11" };
export const metadata: Metadata = { title: "Try it on" };

type Props = { params: Promise<{ slug: string; workId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TryOnPage({ params }: Props) {
  const { slug, workId } = await params;
  if (!UUID.test(workId)) notFound();

  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artist_profiles")
    .select("id, slug, display_name, books_open")
    .eq("slug", slug)
    .maybeSingle();
  if (!artist) notFound();

  const { data: work } = await supabase
    .from("portfolios")
    .select("id, kind, title, is_claimed, image_path, tryon_image_path")
    .eq("id", workId)
    .eq("artist_id", artist.id)
    .maybeSingle();
  // Past work can only be tried on when the artist has uploaded a clean version of the design.
  if (!work || (work.kind !== "flash" && !work.tryon_image_path)) notFound();

  return (
    <div className="ink">
      <TryOn
        artist={artist}
        work={{ id: work.id, kind: work.kind, title: work.title, is_claimed: work.is_claimed, designUrl: imageUrl(work.tryon_image_path ?? work.image_path)! }}
      />
    </div>
  );
}
