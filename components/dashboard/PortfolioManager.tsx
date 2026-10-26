"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Work, PLACEMENTS, STYLES, dollarsToCents, duration, imageUrl, isStoragePath, money } from "@/lib/format";
import { uploadPortfolioImage } from "./upload";

const EMPTY = { title: "", placement: "", style: "", session_hours: "", is_healed: false, price: "", hours: "", size: "", is_repeatable: true };

export function PortfolioManager({ artistId, userId, works }: { artistId: string; userId: string; works: Work[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"portfolio" | "flash">("portfolio");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tryFile, setTryFile] = useState<File | null>(null);
  const [tryKey, setTryKey] = useState(0); // remounts the try-on file input to clear it
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"portfolio" | "flash">("portfolio");

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function pick(next: File | undefined) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next ?? null);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose an image first.");
    const price = dollarsToCents(f.price);
    const minutes = f.hours ? Math.round(parseFloat(f.hours) * 60) : null;
    if (kind === "flash" && (price == null || !minutes || minutes <= 0)) return setError("Flash designs need a price and an estimated time.");

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      const path = await uploadPortfolioImage(supabase, userId, file);
      uploaded.push(path);
      const tryonPath = tryFile ? await uploadPortfolioImage(supabase, userId, tryFile, "tryon-") : null;
      if (tryonPath) uploaded.push(tryonPath);
      const { error } = await supabase.from("portfolios").insert({
        artist_id: artistId,
        kind,
        image_path: path,
        title: f.title.trim() || null,
        placement: f.placement.trim() || null,
        style: f.style || null,
        session_hours: kind === "portfolio" && f.session_hours ? parseFloat(f.session_hours) : null,
        is_healed: kind === "portfolio" && f.is_healed,
        price_cents: kind === "flash" ? price : null,
        estimated_minutes: kind === "flash" ? minutes : null,
        size_inches: f.size ? parseFloat(f.size) : null,
        is_repeatable: f.is_repeatable,
        tryon_image_path: tryonPath,
      });
      if (error) throw new Error(error.message);
      pick(undefined);
      setTryFile(null);
      setTryKey((k) => k + 1);
      setF(EMPTY);
      setView(kind);
      router.refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("portfolio").remove(uploaded);
      setError(err instanceof Error ? err.message : "Couldn't add that image.");
    }
    setBusy(false);
  }

  const shown = works.filter((w) => w.kind === view);

  return (
    <div className="stack">
      <form className="uploader" onSubmit={add}>
        <div className="row" role="group" aria-label="Type">
          <button type="button" className="chip" aria-pressed={kind === "portfolio"} onClick={() => setKind("portfolio")}>Past work</button>
          <button type="button" className="chip" aria-pressed={kind === "flash"} onClick={() => setKind("flash")}>Flash design</button>
        </div>
        <label className="drop" htmlFor="work-file" style={{ padding: preview ? 12 : 24 }}>
          <input id="work-file" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
          {preview ? <img className="preview" src={preview} alt="Selected image" /> : <><strong>Choose an image</strong><span>JPG or PNG, up to 10 MB</span></>}
        </label>
        <div className="grid-2">
          <div className="field"><label htmlFor="w-title">Title {kind === "portfolio" && <span className="opt">optional</span>}</label><input id="w-title" className="input" value={f.title} onChange={set("title")} placeholder={kind === "flash" ? "Homeward Swallow" : "Rose sleeve"} /></div>
          <div className="field">
            <label htmlFor="w-style">Style</label>
            <select id="w-style" className="input" value={f.style} onChange={set("style")}>
              <option value="">—</option>
              {STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {kind === "portfolio" ? (
          <>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="w-place">Placement</label>
                <input id="w-place" className="input" list="placements" value={f.placement} onChange={set("placement")} />
                <datalist id="placements">{PLACEMENTS.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="field"><label htmlFor="w-hours">Session length (hrs)</label><input id="w-hours" className="input" type="number" inputMode="decimal" min={0} step={0.5} value={f.session_hours} onChange={set("session_hours")} /></div>
            </div>
            <label className="check"><input type="checkbox" checked={f.is_healed} onChange={set("is_healed")} /> Healed photo</label>
          </>
        ) : (
          <>
            <div className="grid-2">
              <div className="field"><label htmlFor="w-price">Price ($)</label><input id="w-price" className="input" type="number" inputMode="decimal" min={0} value={f.price} onChange={set("price")} /></div>
              <div className="field"><label htmlFor="w-time">Estimated time (hrs)</label><input id="w-time" className="input" type="number" inputMode="decimal" min={0.25} step={0.25} value={f.hours} onChange={set("hours")} /></div>
              <div className="field"><label htmlFor="w-size">Size (in)</label><input id="w-size" className="input" type="number" inputMode="decimal" min={0.5} step={0.5} value={f.size} onChange={set("size")} /></div>
            </div>
            <label className="check"><input type="checkbox" checked={f.is_repeatable} onChange={set("is_repeatable")} /> Repeatable (can be tattooed more than once)</label>
          </>
        )}
        <div className="field">
          <label htmlFor="w-tryon">Try-on version <span className="opt">optional</span></label>
          <input key={tryKey} id="w-tryon" className="input" type="file" accept="image/*" onChange={(e) => setTryFile(e.target.files?.[0] ?? null)} />
          <span className="hint">{kind === "flash"
            ? "Flash can already be tried on. Add a cleaner scan here if the main image isn't on plain white."
            : "A clean drawing of the design on white, without skin. Lets clients try it on."}</span>
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button type="submit" className="btn" disabled={busy}>{busy ? "Uploading…" : kind === "flash" ? "Add flash design" : "Add to portfolio"}</button>
      </form>

      <div className="row" role="group" aria-label="Show">
        <button type="button" className="chip" aria-pressed={view === "portfolio"} onClick={() => setView("portfolio")}>Portfolio <span className="mono">{works.filter((w) => w.kind === "portfolio").length}</span></button>
        <button type="button" className="chip" aria-pressed={view === "flash"} onClick={() => setView("flash")}>Flash <span className="mono">{works.filter((w) => w.kind === "flash").length}</span></button>
      </div>
      {shown.length === 0 ? (
        <div className="empty">Nothing here yet. Add your first {view === "flash" ? "flash design" : "piece"} above.</div>
      ) : (
        <div className="manage-grid">{shown.map((w) => <ManageItem key={w.id} work={w} userId={userId} />)}</div>
      )}
    </div>
  );
}

function ManageItem({ work: w, userId }: { work: Work; userId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("portfolios").delete().eq("id", w.id);
    if (error) { setBusy(false); return setError(error.message); }
    const files = [w.image_path, w.tryon_image_path].filter((p): p is string => !!p && isStoragePath(p));
    if (files.length) await supabase.storage.from("portfolio").remove(files);
    router.refresh();
  }

  async function setTryOn(file: File | null) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      const old = w.tryon_image_path;
      let path: string | null = null;
      if (file) path = await uploadPortfolioImage(supabase, userId, file, "tryon-");
      const { error } = await supabase.from("portfolios").update({ tryon_image_path: path }).eq("id", w.id);
      if (error) {
        if (path) await supabase.storage.from("portfolio").remove([path]);
        throw new Error(error.message);
      }
      if (old && isStoragePath(old)) await supabase.storage.from("portfolio").remove([old]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the try-on version.");
    }
    setBusy(false);
  }

  async function toggleClaimed() {
    setBusy(true);
    const { error } = await createClient().from("portfolios").update({ is_claimed: !w.is_claimed }).eq("id", w.id);
    setBusy(false);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <div className="manage-item">
      <img src={imageUrl(w.image_path)!} alt={w.title ?? ""} loading="lazy" />
      <div>
        <b>{w.title || w.placement || "Untitled"}</b>
        {w.kind === "flash" && <span className="mono">{money(w.price_cents)} · ≈ {duration(w.estimated_minutes)}</span>}
        {w.kind === "flash" && (
          <label className="check"><input type="checkbox" checked={w.is_claimed} onChange={toggleClaimed} disabled={busy} /> Claimed</label>
        )}
        <div className="row">
          <input id={`tryon-${w.id}`} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) setTryOn(file); }} />
          <label className="btn ghost small" htmlFor={`tryon-${w.id}`}>{w.tryon_image_path ? "Replace try-on" : "Add try-on version"}</label>
          {w.tryon_image_path && <button type="button" className="btn ghost small" onClick={() => setTryOn(null)} disabled={busy}>Remove try-on</button>}
        </div>
        {confirm ? (
          <div className="row">
            <button type="button" className="btn danger small" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
            <button type="button" className="btn ghost small" onClick={() => setConfirm(false)}>Keep</button>
          </div>
        ) : (
          <button type="button" className="btn ghost small" onClick={() => setConfirm(true)}>Remove</button>
        )}
        {error && <p className="err">{error}</p>}
      </div>
    </div>
  );
}
