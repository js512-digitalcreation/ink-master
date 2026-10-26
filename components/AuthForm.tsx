"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  mode: "login" | "signup";
  next: string;
  initialRole?: "client" | "artist";
  initialError?: string | null;
};

export function AuthForm({ mode, next, initialRole = "client", initialError = null }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "artist">(initialRole);
  const [error, setError] = useState<string | null>(initialError);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  // New artists go straight to their studio to set up a profile.
  const destination = isSignup && role === "artist" && next === "/" ? "/dashboard" : next;
  const qs = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim(), role },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
      setBusy(false);
      if (error) return setError(error.message);
      if (!data.session) return setCheckEmail(true); // email confirmation is on
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        return setError(
          error.message === "Email not confirmed"
            ? "Confirm your email first. Check your inbox for the link we sent."
            : error.message === "Invalid login credentials"
              ? "That email and password don't match. Try again."
              : error.message
        );
      }
    }
    router.replace(destination);
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="auth">
        <Link className="logo" href="/">Ink <span>Masters</span></Link>
        <h1 className="h-page">Check your email</h1>
        <p className="lede">We sent a confirmation link to <b>{email}</b>. Open it on this device to finish creating your account.</p>
      </main>
    );
  }

  return (
    <main className="auth">
      <Link className="logo" href="/">Ink <span>Masters</span></Link>
      <div>
        <h1 className="h-page">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="lede">{isSignup ? "Book artists, or list your own work." : "Log in to book and manage your appointments."}</p>
      </div>

      <form onSubmit={onSubmit} noValidate={false}>
        {isSignup && (
          <>
            <div className="field">
              <span className="label">I am a</span>
              <div className="role-pick">
                <input type="radio" name="role" id="role-client" checked={role === "client"} onChange={() => setRole("client")} />
                <label htmlFor="role-client"><b>Client</b><span>Find and book artists</span></label>
                <input type="radio" name="role" id="role-artist" checked={role === "artist"} onChange={() => setRole("artist")} />
                <label htmlFor="role-artist"><b>Artist</b><span>Show work, take bookings</span></label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="full_name">Full name</label>
              <input id="full_name" className="input" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          {isSignup ? <p className="hint">At least 6 characters.</p> : <p className="hint"><Link href="/forgot-password">Forgot your password?</Link></p>}
        </div>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "One moment…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="switch">
        {isSignup ? <>Already have an account? <Link href={`/login${qs}`}>Log in</Link></> : <>New to Ink Masters? <Link href={`/signup${qs}`}>Create an account</Link></>}
      </p>
    </main>
  );
}
