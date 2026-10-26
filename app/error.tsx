"use client";

import Link from "next/link";

// Shown if a page crashes or the connection drops while loading.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth">
      <h1 className="h-page">Something went wrong</h1>
      <p className="lede">Check your connection and try again.</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
      <Link className="btn ghost" href="/">Go to home</Link>
    </main>
  );
}
