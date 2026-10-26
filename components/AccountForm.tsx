"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Lets anyone update the name and phone number artists see on their booking requests. */
export function AccountForm({ userId, fullName, phone }: { userId: string; fullName: string; phone: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "good" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().from("users").update({ full_name: name.trim(), phone: tel.trim() || null }).eq("id", userId);
    setBusy(false);
    setMessage(error ? { kind: "error", text: error.message } : { kind: "good", text: "Saved." });
    if (!error) router.refresh();
  }

  return (
    <form className="list-card" onSubmit={onSubmit}>
      <h2 className="section-title">Your details</h2>
      <div className="field">
        <label htmlFor="acc-name">Full name</label>
        <input id="acc-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="acc-phone">Phone <span className="opt">shared with artists you book</span></label>
        <input id="acc-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
      </div>
      {message && <div className={`notice ${message.kind}`} role="status">{message.text}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
