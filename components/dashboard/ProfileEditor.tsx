"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Artist, STYLES, centsToDollars, dollarsToCents, imageUrl, slugify } from "@/lib/format";
import { type HandleMethod, type Handles, METHODS, cleanHandle, methodLabel, needsHandle } from "@/lib/payments";
import { uploadPortfolioImage } from "./upload";

type Props = { userId: string; artist: Artist | null; defaultName: string; handles?: Handles | null };

export function ProfileEditor({ userId, artist, defaultName, handles }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    display_name: artist?.display_name ?? defaultName,
    slug: artist?.slug ?? slugify(defaultName),
    shop_name: artist?.shop_name ?? "",
    bio: artist?.bio ?? "",
    instagram_handle: artist?.instagram_handle ?? "",
    address: artist?.address ?? "",
    neighborhood: artist?.neighborhood ?? "",
    city: artist?.city ?? "",
    latitude: artist?.latitude?.toString() ?? "",
    longitude: artist?.longitude?.toString() ?? "",
    starting_price: centsToDollars(artist?.starting_price_cents),
    hourly_rate: centsToDollars(artist?.hourly_rate_cents),
    deposit: centsToDollars(artist?.deposit_cents ?? 5000),
    years_experience: artist?.years_experience?.toString() ?? "",
    books_open: artist?.books_open ?? true,
  });
  const [styles, setStyles] = useState<string[]>(artist?.styles ?? []);
  const startMethods = artist?.payment_methods ?? ["cash"];
  const [cashOnly, setCashOnly] = useState(startMethods.length === 1 && startMethods[0] === "cash");
  const [methods, setMethods] = useState<string[]>(startMethods);
  const [payHandles, setPayHandles] = useState<Record<HandleMethod, string>>({
    venmo: handles?.venmo ?? "", paypal: handles?.paypal ?? "", cashapp: handles?.cashapp ?? "", zelle: handles?.zelle ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(artist?.avatar_url ?? null);
  const [headerUrl, setHeaderUrl] = useState(artist?.header_image_url ?? null);
  const [slugTouched, setSlugTouched] = useState(!!artist);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "good" | "error"; text: string } | null>(null);

  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [key]: e.target.value }));

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setMessage({ kind: "error", text: "This browser can't share its location." });
    navigator.geolocation.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude.toFixed(5), longitude: p.coords.longitude.toFixed(5) })),
      () => setMessage({ kind: "error", text: "Location is turned off. Allow location access for this site, or type the numbers in." })
    );
  }

  async function uploadImage(file: File | undefined, which: "avatar" | "header") {
    if (!file) return;
    setBusy(which);
    setMessage(null);
    try {
      const path = await uploadPortfolioImage(createClient(), userId, file, `${which}-`);
      (which === "avatar" ? setAvatarUrl : setHeaderUrl)(imageUrl(path));
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Upload failed." });
    }
    setBusy(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(f.slug);
    if (!f.display_name.trim()) return setMessage({ kind: "error", text: "Add the name clients will see." });
    if (!slug) return setMessage({ kind: "error", text: "Add a profile link, for example your name." });
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const lat = num(f.latitude), lng = num(f.longitude);
    if ((lat != null && (isNaN(lat) || lat < -90 || lat > 90)) || (lng != null && (isNaN(lng) || lng < -180 || lng > 180))) {
      return setMessage({ kind: "error", text: "Latitude must be between -90 and 90, longitude between -180 and 180." });
    }

    const chosen = cashOnly ? ["cash"] : METHODS.map((m) => m.id).filter((id) => methods.includes(id));
    if (!chosen.length) return setMessage({ kind: "error", text: "Pick at least one way clients can pay you." });
    const cleaned: Handles = { venmo: null, paypal: null, cashapp: null, zelle: null };
    for (const id of chosen) {
      if (!needsHandle(id)) continue;
      const h = cleanHandle(id, payHandles[id]);
      const label = methodLabel(id);
      if (!h) return setMessage({ kind: "error", text: `Add your ${label} ${id === "zelle" ? "email or phone" : "username"}, or untick ${label}.` });
      cleaned[id] = h;
    }

    const payload = {
      display_name: f.display_name.trim(),
      slug,
      shop_name: f.shop_name.trim() || null,
      bio: f.bio.trim() || null,
      instagram_handle: f.instagram_handle.trim().replace(/^@/, "") || null,
      address: f.address.trim() || null,
      neighborhood: f.neighborhood.trim() || null,
      city: f.city.trim() || null,
      latitude: lat,
      longitude: lng,
      styles,
      starting_price_cents: dollarsToCents(f.starting_price),
      hourly_rate_cents: dollarsToCents(f.hourly_rate),
      deposit_cents: dollarsToCents(f.deposit) ?? 0,
      years_experience: f.years_experience ? Math.max(0, Math.round(Number(f.years_experience))) : null,
      books_open: f.books_open,
      avatar_url: avatarUrl,
      header_image_url: headerUrl,
      payment_methods: chosen,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver",
    };

    setBusy("save");
    setMessage(null);
    const supabase = createClient();
    const { data: saved, error } = artist
      ? await supabase.from("artist_profiles").update(payload).eq("id", artist.id).select("id").single()
      : await supabase.from("artist_profiles").insert({ ...payload, user_id: userId }).select("id").single();
    const handleError = saved
      ? (await supabase.from("artist_payment_handles").upsert({ artist_id: saved.id, ...cleaned })).error
      : null;
    setBusy(null);

    if (handleError) {
      // The profile exists now, so refresh to pick it up and make the next Save an update.
      router.refresh();
      return setMessage({ kind: "error", text: `Profile saved, but your payment details didn't: ${handleError.message}` });
    }
    if (error) {
      const taken = error.code === "23505" && error.message.includes("slug");
      return setMessage({ kind: "error", text: taken ? `The link /artists/${slug} is taken. Try another.` : error.message });
    }
    setF((x) => ({ ...x, slug }));
    setPayHandles((x) => ({ ...x, ...Object.fromEntries(Object.entries(cleaned).map(([k, v]) => [k, v ?? x[k as HandleMethod]])) }));
    setMessage({ kind: "good", text: artist ? "Profile saved." : "Profile created. Now add your portfolio and flash." });
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="grid-2">
        <div className="field">
          <span className="label">Profile photo</span>
          <div className="img-pick">
            {avatarUrl ? <img className="thumb-sm" src={avatarUrl} alt="" style={{ borderRadius: "50%" }} /> : <span className="thumb-sm" />}
            <label className="btn ghost small" htmlFor="avatar">{busy === "avatar" ? "Uploading…" : "Choose"}</label>
            <input id="avatar" type="file" accept="image/*" className="sr-only" onChange={(e) => uploadImage(e.target.files?.[0], "avatar")} />
          </div>
        </div>
        <div className="field">
          <span className="label">Header image <span className="opt">optional</span></span>
          <div className="img-pick">
            {headerUrl ? <img className="thumb-sm" src={headerUrl} alt="" /> : <span className="thumb-sm" />}
            <label className="btn ghost small" htmlFor="header">{busy === "header" ? "Uploading…" : "Choose"}</label>
            <input id="header" type="file" accept="image/*" className="sr-only" onChange={(e) => uploadImage(e.target.files?.[0], "header")} />
          </div>
        </div>
      </div>
      <p className="hint">Without a header image, your page shows a collage of your portfolio.</p>

      <div className="field">
        <label htmlFor="display_name">Artist name</label>
        <input id="display_name" className="input" required value={f.display_name}
          onChange={(e) => setF((x) => ({ ...x, display_name: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} />
      </div>
      <div className="field">
        <label htmlFor="slug">Profile link</label>
        <input id="slug" className="input" value={f.slug} onChange={(e) => { setSlugTouched(true); setF((x) => ({ ...x, slug: e.target.value })); }} />
        <p className="hint mono">/artists/{slugify(f.slug) || "your-name"}</p>
      </div>
      <div className="grid-2">
        <div className="field"><label htmlFor="shop_name">Shop name</label><input id="shop_name" className="input" value={f.shop_name} onChange={set("shop_name")} /></div>
        <div className="field"><label htmlFor="instagram_handle">Instagram</label><input id="instagram_handle" className="input" placeholder="@yourhandle" value={f.instagram_handle} onChange={set("instagram_handle")} /></div>
      </div>
      <div className="field">
        <label htmlFor="bio">Bio</label>
        <textarea id="bio" className="input" maxLength={800} placeholder="Your style, experience, and what clients should know before booking." value={f.bio} onChange={set("bio")} />
      </div>

      <div className="field">
        <span className="label">Styles you tattoo</span>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={styles.includes(s)}
              onClick={() => setStyles((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))}>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="field"><label htmlFor="starting_price">Starting price ($)</label><input id="starting_price" className="input" type="number" inputMode="decimal" min={0} value={f.starting_price} onChange={set("starting_price")} /></div>
        <div className="field"><label htmlFor="hourly_rate">Hourly rate ($)</label><input id="hourly_rate" className="input" type="number" inputMode="decimal" min={0} value={f.hourly_rate} onChange={set("hourly_rate")} /></div>
        <div className="field"><label htmlFor="deposit">Deposit ($)</label><input id="deposit" className="input" type="number" inputMode="decimal" min={0} value={f.deposit} onChange={set("deposit")} /></div>
        <div className="field"><label htmlFor="years_experience">Years tattooing</label><input id="years_experience" className="input" type="number" inputMode="numeric" min={0} value={f.years_experience} onChange={set("years_experience")} /></div>
      </div>

      <div className="field"><label htmlFor="address">Shop address <span className="opt">optional</span></label><input id="address" className="input" value={f.address} onChange={set("address")} /></div>
      <div className="grid-2">
        <div className="field"><label htmlFor="neighborhood">Neighborhood</label><input id="neighborhood" className="input" value={f.neighborhood} onChange={set("neighborhood")} /></div>
        <div className="field"><label htmlFor="city">City</label><input id="city" className="input" value={f.city} onChange={set("city")} /></div>
      </div>
      <div className="field">
        <span className="label">Map location <span className="opt">needed for Near Me search</span></span>
        <div className="grid-2">
          <input aria-label="Latitude" className="input mono" placeholder="Latitude" value={f.latitude} onChange={set("latitude")} />
          <input aria-label="Longitude" className="input mono" placeholder="Longitude" value={f.longitude} onChange={set("longitude")} />
        </div>
        <div className="row"><button type="button" className="btn ghost small" onClick={useMyLocation}>Use my current location</button></div>
        <p className="hint">Tap this while you're at the shop, or look up the shop on a map and copy its coordinates.</p>
      </div>

      <fieldset className="field pay-methods">
        <legend className="label">How clients pay</legend>
        <div className="row" role="radiogroup" aria-label="Payment">
          <button type="button" role="radio" className="chip" aria-checked={cashOnly} aria-pressed={cashOnly} onClick={() => setCashOnly(true)}>Cash only</button>
          <button type="button" role="radio" className="chip" aria-checked={!cashOnly} aria-pressed={!cashOnly} onClick={() => setCashOnly(false)}>Choose methods</button>
        </div>
        {!cashOnly && (
          <div className="pay-list">
            {METHODS.map((m) => {
              const on = methods.includes(m.id);
              return (
                <div key={m.id} className="pay-item">
                  <label className="check">
                    <input type="checkbox" checked={on} onChange={() => setMethods((x) => (on ? x.filter((y) => y !== m.id) : [...x, m.id]))} /> {m.label}
                  </label>
                  {on && m.handle && needsHandle(m.id) && (
                    <input
                      className="input"
                      aria-label={m.handle.hint}
                      placeholder={m.handle.placeholder}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={payHandles[m.id]}
                      onChange={(e) => setPayHandles((x) => ({ ...x, [m.id]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="hint">Your profile shows only which methods you take. Usernames are shown to a client after you accept their booking, so they can pay the deposit.</p>
      </fieldset>

      <label className="check"><input type="checkbox" checked={f.books_open} onChange={(e) => setF((x) => ({ ...x, books_open: e.target.checked }))} /> Taking new bookings</label>

      {message && <div className={`notice ${message.kind}`} role="status">{message.text}</div>}
      <button type="submit" className="btn block" disabled={!!busy}>{busy === "save" ? "Saving…" : artist ? "Save profile" : "Create profile"}</button>
    </form>
  );
}
