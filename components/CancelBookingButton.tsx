"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CancelBookingButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    const { error } = await createClient().from("bookings").update({ status: "cancelled" }).eq("id", id);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  if (!confirming) {
    return <div className="row"><button type="button" className="btn danger small" onClick={() => setConfirming(true)}>Cancel request</button></div>;
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <span className="hint">Cancel this request?</span>
        <button type="button" className="btn danger small" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Yes, cancel"}</button>
        <button type="button" className="btn ghost small" onClick={() => setConfirming(false)}>Keep it</button>
      </div>
      {error && <p className="err">{error}</p>}
    </div>
  );
}
