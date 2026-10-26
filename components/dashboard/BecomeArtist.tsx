"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BecomeArtist({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchRole() {
    setBusy(true);
    const { error } = await createClient().from("users").update({ role: "artist" }).eq("id", userId);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div className="empty">
      <strong>Are you a tattoo artist?</strong>
      Set up a profile to show your portfolio and flash, and take booking requests.
      <button type="button" className="btn small" onClick={switchRole} disabled={busy}>{busy ? "Setting up…" : "Set up my artist profile"}</button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
