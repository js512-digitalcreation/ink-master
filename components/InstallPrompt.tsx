"use client";

import { useEffect, useState } from "react";
import { CloseIcon, ShareIcon } from "./Icons";

const DISMISS_KEY = "ink:install-dismissed";

/**
 * "Install app" help. Android/Chrome: a button that opens the system install prompt.
 * iPhone/iPad Safari: instructions, since iOS only installs from the Share menu.
 * Hidden once the app is installed. `dismissible` lets the home page hide it for good.
 */
export function InstallPrompt({ dismissible = false }: { dismissible?: boolean }) {
  const [mode, setMode] = useState<"android" | "ios" | "ios-other" | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (dismissible) {
      try { if (localStorage.getItem(DISMISS_KEY)) return; } catch { /* storage blocked */ }
    }
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      // Only Safari can add to the home screen on older iOS; other iOS browsers get a hint to switch.
      const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
      setMode(isSafari ? "ios" : "ios-other");
      return;
    }
    const update = () => setMode(window.__inkInstall ? "android" : null);
    update();
    window.addEventListener("ink:installable", update);
    return () => window.removeEventListener("ink:installable", update);
  }, [dismissible]);

  if (!mode) return null;

  async function install() {
    const prompt = window.__inkInstall;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.__inkInstall = null;
    setMode(null);
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* storage blocked */ }
    setMode(null);
  }

  return (
    <div className="install">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <b>Get the Ink Masters app</b>
        {mode === "android" && <span>Install it on your home screen. It opens full screen, like any app.</span>}
        {mode === "ios" && <span>Tap <ShareIcon className="inline-icon" /> Share, then <b>Add to Home Screen</b>.</span>}
        {mode === "ios-other" && <span>Open this page in Safari, then tap Share and <b>Add to Home Screen</b>.</span>}
      </div>
      {mode === "android" && <button type="button" className="btn small" onClick={install}>Install</button>}
      {dismissible && (
        <button type="button" className="install-close" onClick={dismiss} aria-label="Hide install tip"><CloseIcon /></button>
      )}
    </div>
  );
}
