"use client";

import { useEffect } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window { __inkInstall?: InstallEvent | null }
}

/**
 * Registers /sw.js (production only) and holds on to Android's install prompt,
 * so the "Install app" button can show it later from any page.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__inkInstall = e as InstallEvent;
      window.dispatchEvent(new Event("ink:installable"));
    };
    const onInstalled = () => {
      window.__inkInstall = null;
      window.dispatchEvent(new Event("ink:installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
