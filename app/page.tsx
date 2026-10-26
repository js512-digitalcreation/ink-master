import { createClient } from "@/lib/supabase/server";
import { Feed } from "@/components/Feed";

export default async function HomePage() {
  const supabase = await createClient();

  // Every artist, with their three newest portfolio pieces for the card preview.
  const { data: artists, error } = await supabase
    .from("artist_profiles")
    .select(
      "id, slug, display_name, shop_name, city, neighborhood, latitude, longitude, styles, starting_price_cents, rating_avg, rating_count, avatar_url, books_open, portfolios(id, image_path, title, kind, sort_order, created_at)"
    )
    .eq("portfolios.kind", "portfolio")
    .order("sort_order", { referencedTable: "portfolios" })
    .order("created_at", { referencedTable: "portfolios", ascending: false })
    .limit(3, { referencedTable: "portfolios" })
    .order("rating_avg", { ascending: false })
    .order("created_at", { ascending: false });

  return <Feed artists={artists ?? []} loadError={error?.message ?? null} />;
}
