"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MINE = process.env.NEXT_PUBLIC_BUILD_ID;
const CHECK_EVERY_MS = 15 * 60 * 1000;
// Pages where someone may be mid-way through something; never reload these on their own.
const BUSY = /\/(book|try-on|dashboard|account|signup|reset-password)(\/|$)/;

/**
 * Keeps installed and long-open apps on the latest version. Checks when the app is opened or
 * comes back to the front (and every 15 minutes). If a newer version is live it reloads right
 * away when that's safe, or shows a "Refresh" bar on pages with a form in progress.
 */
export function UpdateNotice() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let checking = false;

    async function check(returning: boolean) {
      if (checking || !navigator.onLine) return;
      checking = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { id } = (await res.json()) as { id?: string };
        if (id && id !== MINE) {
          navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
          // Reload by itself at most once per new version, so a stale cache can never cause a loop.
          let tried: string | null = null;
          try { tried = sessionStorage.getItem("ink:reloaded-for"); } catch { /* storage blocked */ }
          if (returning && !BUSY.test(path.current) && tried !== id) {
            try { sessionStorage.setItem("ink:reloaded-for", id); } catch { /* storage blocked */ }
            window.location.reload();
          } else setReady(true);
        }
      } catch {
        /* offline or blocked; try again next time */
      }
      checking = false;
    }

    const onVisible = () => document.visibilityState === "visible" && check(true);
    check(true);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => check(false), CHECK_EVERY_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!ready) return null;
  return (
    <div className="update-bar" role="status">
      <span>A new version of Ink Masters is ready.</span>
      <button type="button" className="btn small" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );
}
