import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth">
      <h1 className="h-page">Page not found</h1>
      <p className="lede">That artist or page doesn't exist, or the link has changed.</p>
      <Link className="btn" href="/">Browse artists</Link>
    </main>
  );
}
