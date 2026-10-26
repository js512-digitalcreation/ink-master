import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fileExtension, uid } from "@/lib/format";

export const MAX_IMAGE_MB = 10;

/** Uploads an image to the public 'portfolio' bucket under the artist's own folder. Returns its path. */
export async function uploadPortfolioImage(supabase: SupabaseClient<Database>, userId: string, file: File, prefix = "") {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image.`);
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`${file.name} is over ${MAX_IMAGE_MB} MB.`);
  const path = `${userId}/${prefix}${uid()}.${fileExtension(file)}`;
  const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Couldn't upload ${file.name}: ${error.message}`);
  return path;
}
