"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackIcon, CalendarIcon, ShareIcon } from "@/components/Icons";
import { type Placement, clampPlacement, initialPlacement } from "@/lib/tryon/transform";
import { exportImage, loadDesign, loadPhoto } from "@/lib/tryon/render";
import { saveTryOn } from "@/lib/tryon/handoff";
import { Stage } from "./Stage";

type Props = {
  artist: { slug: string; display_name: string; books_open: boolean };
  work: { id: string; kind: string; title: string | null; is_claimed: boolean; designUrl: string };
};

const DEG = Math.PI / 180;

export function TryOn({ artist, work }: Props) {
  const router = useRouter();
  const [design, setDesign] = useState<HTMLCanvasElement | null>(null);
  const [designError, setDesignError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [fade, setFade] = useState(0.9);
  const [busy, setBusy] = useState<"share" | "book" | null>(null);
  const [ready, setReady] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const title = work.title ?? (work.kind === "flash" ? "Flash design" : "Tattoo design");
  const tag = `Design by ${artist.display_name} · inkmasters.art`;
  const bookBlocked = work.is_claimed ? "Claimed" : !artist.books_open ? "Books closed" : null;
  const bookHref = `/artists/${artist.slug}/book?${work.kind === "flash" ? "flash" : "work"}=${work.id}&tryon=1`;

  useEffect(() => {
    let cancelled = false;
    setDesignError(false);
    loadDesign(work.designUrl)
      .then((c) => !cancelled && setDesign(c))
      .catch(() => !cancelled && setDesignError(true));
    return () => { cancelled = true; };
  }, [work.designUrl, attempt]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      const c = await loadPhoto(file);
      setPhoto(c);
      setPlacement(initialPlacement(c.width, c.height));
      setReady(null);
    } catch {
      setPhotoError("That photo couldn't be opened. Try another one.");
    }
  }

  const change = useCallback((p: Placement) => { setPlacement(p); setReady(null); }, []);

  function tweak(fn: (p: Placement) => Placement) {
    if (photo && placement) change(clampPlacement(fn(placement), photo.width, photo.height));
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareFile(file: File) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${title} · Ink Masters` });
        setReady(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Some phones only allow sharing straight from a tap; the image is ready, so offer a second tap.
        if (e instanceof DOMException && e.name === "NotAllowedError") return setReady(file);
        download(file);
      }
    } else {
      download(file);
    }
  }

  async function share() {
    if (!photo || !design || !placement) return;
    if (ready) return shareFile(ready);
    setBusy("share");
    setError(null);
    try {
      const blob = await exportImage(photo, design, placement, fade, tag);
      await shareFile(new File([blob], "ink-masters-try-on.jpg", { type: "image/jpeg" }));
    } catch {
      setError("Couldn't make the image. Try again.");
    }
    setBusy(null);
  }

  async function book() {
    if (!photo || !design || !placement) return;
    setBusy("book");
    setError(null);
    try {
      await saveTryOn(await exportImage(photo, design, placement, fade, tag), work.id);
      router.push(bookHref);
    } catch {
      setError("Couldn't attach the image. You can still book and add photos yourself.");
      setBusy(null);
    }
  }

  return (
    <div className="to">
      <header className="to-top">
        <Link className="glass" href={`/artists/${artist.slug}`} aria-label="Back to profile"><BackIcon /></Link>
        <div>
          <h1>{title}</h1>
          <span>by {artist.display_name}</span>
        </div>
      </header>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={libraryInput} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

      {designError ? (
        <div className="to-empty">
          <p className="notice error">The design didn&apos;t load.</p>
          <button type="button" className="btn ghost" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
        </div>
      ) : !photo || !placement ? (
        <div className="to-empty">
          <div className="to-design">
            {design ? <img src={design.toDataURL("image/png")} alt={title} /> : <div className="skeleton" style={{ height: "100%" }} />}
          </div>
          <h2>See it on your skin</h2>
          <p>Take a photo of where you want it, then move, resize and turn the design into place.</p>
          <div className="to-pick">
            <button type="button" className="btn" onClick={() => cameraInput.current?.click()}>Take photo</button>
            <button type="button" className="btn ghost" onClick={() => libraryInput.current?.click()}>Choose photo</button>
          </div>
          {photoError && <p className="err" role="alert">{photoError}</p>}
          <p className="to-privacy">Your photo stays on your phone. It&apos;s only sent if you book and include it.</p>
        </div>
      ) : !design ? (
        <div className="to-empty"><div className="skeleton" style={{ height: 320 }} /></div>
      ) : (
        <>
          <div className="to-frame">
            <Stage photo={photo} design={design} placement={placement} fade={fade} onChange={change} />
          </div>
          <p className="to-hint">Drag to move · pinch to resize and turn</p>

          <div className="to-controls">
            <label className="to-slider">
              <span>Ink</span>
              <input type="range" min={0.35} max={1} step={0.01} value={fade} onChange={(e) => { setFade(+e.target.value); setReady(null); }} />
              <output>{fade > 0.8 ? "Fresh" : fade > 0.6 ? "Healed" : "Faded"}</output>
            </label>
            <label className="to-slider">
              <span>Size</span>
              <input
                type="range"
                min={0.05}
                max={1.5}
                step={0.01}
                value={placement.width / Math.max(photo.width, photo.height)}
                onChange={(e) => tweak((p) => ({ ...p, width: +e.target.value * Math.max(photo.width, photo.height) }))}
              />
            </label>
            <label className="to-slider">
              <span>Turn</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={Math.round((((placement.rotation / DEG + 180) % 360) + 360) % 360 - 180)}
                onChange={(e) => tweak((p) => ({ ...p, rotation: +e.target.value * DEG }))}
              />
            </label>
            <div className="to-row">
              <button type="button" className="chip" aria-pressed={placement.flip} onClick={() => tweak((p) => ({ ...p, flip: !p.flip }))}>Flip</button>
              <button type="button" className="chip" onClick={() => change(initialPlacement(photo.width, photo.height))}>Reset</button>
              <button type="button" className="chip" onClick={() => libraryInput.current?.click()}>New photo</button>
            </div>
          </div>

          {error && <p className="err to-err" role="alert">{error}</p>}

          <div className="to-dock">
            <button type="button" className="btn ghost" onClick={share} disabled={busy !== null}>
              <ShareIcon /> {busy === "share" ? "Making image…" : ready ? "Tap to share" : "Save / Share"}
            </button>
            {bookBlocked ? (
              <button type="button" className="btn" disabled>{bookBlocked}</button>
            ) : (
              <button type="button" className="btn" onClick={book} disabled={busy !== null}>
                <CalendarIcon /> {busy === "book" ? "Attaching…" : "Book this"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
