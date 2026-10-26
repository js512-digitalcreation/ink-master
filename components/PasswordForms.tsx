"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <main className="auth">
      <Link className="logo" href="/">Ink <span>Masters</span></Link>
      <div>
        <h1 className="h-page">Reset your password</h1>
        <p className="lede">{sent ? `If ${email} has an account, a reset link is on its way. Open it on this device.` : "Enter your email and we'll send you a link to choose a new password."}</p>
      </div>
      {!sent && (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <div className="notice error" role="alert">{error}</div>}
          <button className="btn block" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
      <p className="switch"><Link href="/login">Back to log in</Link></p>
    </main>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/account?password=updated");
    router.refresh();
  }

  return (
    <main className="auth">
      <Link className="logo" href="/">Ink <span>Masters</span></Link>
      <h1 className="h-page">Choose a new password</h1>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" className="input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="hint">At least 6 characters.</p>
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="btn block" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
      </form>
    </main>
  );
}
