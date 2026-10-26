"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BOOKING_WINDOW_DAYS, PLACEMENTS, SLOT_TIMES, duration, fileExtension, imageUrl, money, uid } from "@/lib/format";
import { Avatar } from "./Avatar";
import { ArrowIcon, BackIcon, CheckIcon, CloseIcon, ImageIcon, NextIcon } from "./Icons";

type Props = {
  artist: { id: string; slug: string; display_name: string; shop_name: string | null; avatar_url: string | null; deposit_cents: number };
  flash: { id: string; title: string | null; image_path: string; price_cents: number | null; estimated_minutes: number | null; size_inches: number | null } | null;
  userId: string;
};

type Ref = { file: File; url: string };

const STEP_NAMES = ["Your idea", "Reference images", "Date & time", "Review", "Sent"];
const MAX_FILES = 6;
const MAX_MB = 10;
const SIZE_REFS: [number, string][] = [
  [1, "about the size of a quarter"], [2.5, "about the size of a matchbox"], [3.6, "about the width of a credit card"],
  [5.5, "about the length of a phone"], [7, "about the length of a dollar bill"], [10, "about the size of a paperback book"],
  [14, "a large piece, often split into two sessions"], [24, "a large-scale piece, usually several sessions"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slotKey = (d: Date) => `${dayKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
};

export function BookingForm({ artist, flash, userId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const firstName = artist.display_name.split(" ")[0];

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [idea, setIdea] = useState(flash ? `I'd like the "${flash.title ?? "flash"}" design from your flash. ` : "");
  const [placement, setPlacement] = useState("");
  const [size, setSize] = useState(flash?.size_inches ? String(flash.size_inches) : "");
  const [refs, setRefs] = useState<Ref[]>([]);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Calendar
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const lastDay = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + BOOKING_WINDOW_DAYS); return d; }, [today]);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [busyError, setBusyError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    supabase
      .rpc("artist_busy_slots", { p_artist_id: artist.id, p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data, error }) => {
        if (cancelled) return;
        setBusyError(!!error);
        setBusy(new Set((data ?? []).map((r) => slotKey(new Date(r.starts_at)))));
      });
    return () => { cancelled = true; };
  }, [supabase, artist.id, month]);

  function slotsFor(d: Date) {
    if (d <= today || d > lastDay || d.getDay() === 1) return null; // closed Mondays
    return SLOT_TIMES.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      return { t, open: !busy.has(slotKey(at)) };
    });
  }

  // ---------- Validation & navigation ----------
  const sizeNum = parseFloat(size);
  function validate(s: number) {
    if (s === 0) {
      const e = {
        idea: idea.trim().length < 20,
        placement: !placement.trim(),
        size: !(sizeNum >= 0.5 && sizeNum <= 24),
      };
      setErrors(e);
      const first = e.idea ? "idea" : e.placement ? "placement" : e.size ? "size" : null;
      if (first) document.getElementById(first)?.focus();
      return !first;
    }
    if (s === 2) {
      const bad = !date || !time;
      setErrors({ date: bad });
      return !bad;
    }
    return true;
  }
  // Each step gets its own browser history entry, so the phone's back button or swipe-back
  // gesture (Android and iOS) returns to the previous step instead of leaving the form.
  const sentRef = useRef(false);
  function show(s: number) {
    setStep(s);
    setReached((r) => Math.max(r, s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function go(s: number) {
    show(s);
    if (s === 4) {
      sentRef.current = true;
      window.history.replaceState({ ...window.history.state, inkStep: 4 }, "");
    } else {
      window.history.pushState({ ...window.history.state, inkStep: s }, "");
    }
  }
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, inkStep: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      // After sending, going back shouldn't reopen the form.
      if (sentRef.current) return router.replace("/bookings");
      const s = e.state?.inkStep;
      show(typeof s === "number" ? s : 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [router]);
  function next() {
    if (step === 3) return submit();
    if (validate(step)) go(step + 1);
  }

  // ---------- Files ----------
  function addFiles(list: FileList | File[]) {
    const problems: string[] = [];
    const added: Ref[] = [];
    for (const file of Array.from(list)) {
      if (refs.length + added.length >= MAX_FILES) { problems.push(`You can add up to ${MAX_FILES} images.`); break; }
      if (!file.type.startsWith("image/")) { problems.push(`${file.name} isn't an image.`); continue; }
      if (file.size > MAX_MB * 1024 * 1024) { problems.push(`${file.name} is over ${MAX_MB} MB.`); continue; }
      added.push({ file, url: URL.createObjectURL(file) });
    }
    setRefs((r) => [...r, ...added]);
    setFileErr(problems.length ? problems.join(" ") : null);
  }
  function removeFile(i: number) {
    setRefs((r) => { URL.revokeObjectURL(r[i].url); return r.filter((_, j) => j !== i); });
  }

  // ---------- Submit ----------
  async function submit() {
    if (!date || !time) return go(2);
    setSubmitting(true);
    setSubmitError(null);
    const uploaded: string[] = [];
    try {
      for (const { file } of refs) {
        const path = `${userId}/${uid()}.${fileExtension(file)}`;
        const { error } = await supabase.storage.from("booking-references").upload(path, file, { contentType: file.type });
        if (error) throw new Error(`Couldn't upload ${file.name}: ${error.message}`);
        uploaded.push(path);
      }
      const [h, m] = time.split(":").map(Number);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
      const { error } = await supabase.from("bookings").insert({
        client_id: userId,
        artist_id: artist.id,
        flash_id: flash?.id ?? null,
        idea_description: idea.trim(),
        placement: placement.trim(),
        size_inches: Math.round(sizeNum * 10) / 10,
        reference_image_paths: uploaded,
        requested_start: start.toISOString(),
      });
      if (error) throw new Error(`Couldn't send your request: ${error.message}`);
      go(4);
      router.refresh();
    } catch (e) {
      if (uploaded.length) await supabase.storage.from("booking-references").remove(uploaded);
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const whenText = date && time
    ? `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${fmtTime(time)}`
    : "";

  return (
    <>
      <header className="bk-top">
        <div className="bk-wrap">
          <div className="bk-top-row">
            <Link className="icon-btn" href={`/artists/${artist.slug}`} aria-label="Close booking request"><CloseIcon /></Link>
            <div className="bk-title">
              <h1>Booking request</h1>
              <p>{[artist.display_name, artist.shop_name].filter(Boolean).join(" · ")}</p>
            </div>
            <Avatar name={artist.display_name} url={artist.avatar_url} />
          </div>
          <div className="bk-progress">
            <div className="bk-progress-meta">
              <b>{STEP_NAMES[step]}</b>
              <span>{step < 3 ? `Step ${step + 1} of 3` : step === 3 ? "All steps done" : "Request sent"}</span>
            </div>
            <div className="bk-bars" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(step, 3)} aria-label="Booking progress">
              {[0, 1, 2].map((i) => <div key={i} className="bk-bar" data-state={i < step ? "done" : i === step ? "now" : "todo"}><i /></div>)}
            </div>
            <div className="bk-steps">
              {["Idea", "References", "Date & time"].map((label, i) => (
                <button
                  key={label} type="button" className="bk-step"
                  data-state={i < step ? "done" : i === step ? "now" : "todo"}
                  aria-current={i === step ? "step" : undefined}
                  disabled={i > reached || step === 4}
                  onClick={() => (i < step || validate(step)) && go(i)}
                >
                  <b>{i + 1}</b><span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="bk-wrap bk-main">
        {step === 0 && (
          <section className="bk-pane" aria-labelledby="s1">
            <div>
              <h2 className="h-page" id="s1">Tell {firstName} about your tattoo</h2>
              <p className="lede">The more detail you give, the more accurate your quote will be.</p>
            </div>
            {flash && (
              <div className="bk-flash">
                <img src={imageUrl(flash.image_path)!} alt="" />
                <div><b>{flash.title ?? "Flash design"}</b>{money(flash.price_cents)} · ≈ {duration(flash.estimated_minutes)}</div>
              </div>
            )}
            <div className="field" data-invalid={!!errors.idea}>
              <div className="label-row"><label htmlFor="idea">Tattoo Idea Description</label><span className="hint mono">{idea.length} / 600</span></div>
              <textarea
                id="idea" className="input" maxLength={600} value={idea}
                onChange={(e) => { setIdea(e.target.value); if (e.target.value.trim().length >= 20) setErrors((x) => ({ ...x, idea: false })); }}
                placeholder="A traditional swallow carrying a banner that says “Home”. Red, yellow and black, bold outline. My first tattoo."
              />
              <p className="hint">Include style, colors, and anything that must appear in the design.</p>
              {errors.idea && <p className="err">Add a few more words so {firstName} can picture it (at least 20 characters).</p>}
            </div>
            <div className="field" data-invalid={!!errors.placement}>
              <label htmlFor="placement">Placement on Body</label>
              <input id="placement" className="input" type="text" autoComplete="off" placeholder="e.g. Left inner forearm" value={placement}
                onChange={(e) => { setPlacement(e.target.value); setErrors((x) => ({ ...x, placement: false })); }} />
              <div className="chips" aria-label="Common placements">
                {PLACEMENTS.map((p) => (
                  <button key={p} type="button" className="chip" aria-pressed={placement.toLowerCase() === p.toLowerCase()}
                    onClick={() => { setPlacement(p); setErrors((x) => ({ ...x, placement: false })); }}>{p}</button>
                ))}
              </div>
              {errors.placement && <p className="err">Tell {firstName} where on your body the tattoo will go.</p>}
            </div>
            <div className="field" data-invalid={!!errors.size}>
              <label htmlFor="size">Estimated Size (in inches)</label>
              <div className="size-row">
                <button type="button" className="step-btn" aria-label="Decrease size by half an inch"
                  onClick={() => setSize(String(Math.max(0.5, (sizeNum || 0) - 0.5)))}>−</button>
                <div className="size-input">
                  <input id="size" className="input" type="number" inputMode="decimal" min={0.5} max={24} step={0.5} placeholder="4" value={size}
                    onChange={(e) => { setSize(e.target.value); setErrors((x) => ({ ...x, size: false })); }} />
                  <span className="unit">in</span>
                </div>
                <button type="button" className="step-btn" aria-label="Increase size by half an inch"
                  onClick={() => setSize(String(Math.min(24, (sizeNum || 0) + 0.5)))}>+</button>
              </div>
              <Ruler value={sizeNum} />
              {errors.size && <p className="err">Enter a size between 0.5 and 24 inches.</p>}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="bk-pane" aria-labelledby="s2">
            <div>
              <h2 className="h-page" id="s2">Add reference images</h2>
              <p className="lede">Photos of designs you like, the placement area, or an existing tattoo you want to work around.</p>
            </div>
            <label
              className="drop" htmlFor="files" data-over={dragOver}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <input id="files" type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <span className="drop-icon"><ImageIcon /></span>
              <strong>Drag images here</strong>
              <span>or <span className="browse">browse your photos</span></span>
              <span className="drop-limits"><em>JPG · PNG · HEIC</em><em>up to {MAX_FILES} images</em><em>{MAX_MB} MB each</em></span>
            </label>
            {fileErr && <p className="err">{fileErr}</p>}
            {refs.length > 0 && (
              <div className="thumbs" aria-live="polite">
                {refs.map((r, i) => (
                  <figure key={r.url} className="thumb">
                    <img src={r.url} alt={`Reference ${i + 1}`} />
                    <button type="button" onClick={() => removeFile(i)} aria-label={`Remove ${r.file.name}`}><CloseIcon /></button>
                  </figure>
                ))}
              </div>
            )}
            <p className="hint">Optional. Screenshots from Instagram or Pinterest are fine.</p>
          </section>
        )}

        {step === 2 && (
          <section className="bk-pane" aria-labelledby="s3">
            <div>
              <h2 className="h-page" id="s3">Pick a date and time</h2>
              <p className="lede">Choose when you'd like your session. {firstName} confirms the final time with your quote.</p>
            </div>
            <Calendar
              month={month} today={today} lastDay={lastDay} selected={date} slotsFor={slotsFor}
              onMonth={(d) => setMonth(d)}
              onPick={(d) => { setDate(d); setTime(null); }}
            />
            {busyError && <p className="hint">Couldn't check which times are taken. {firstName} will confirm availability.</p>}
            {date ? (
              <TimePicker date={date} slots={slotsFor(date) ?? []} time={time} onPick={(t) => { setTime(t); setErrors({}); }} />
            ) : (
              <div className="empty">Select a date to see open times.</div>
            )}
            {errors.date && <p className="err">Pick a date and a time slot to continue.</p>}
          </section>
        )}

        {step === 3 && (
          <section className="bk-pane" aria-labelledby="s4">
            <div>
              <h2 className="h-page" id="s4">Review your request</h2>
              <p className="lede">Check everything before sending it to {firstName}.</p>
            </div>
            <div className="stack">
              <div className="rcard">
                <div className="rcard-head"><h3 className="section-title">Your idea</h3><button type="button" className="link-btn" onClick={() => go(0)}>Edit</button></div>
                <p>{idea.trim()}</p>
                <dl className="kv"><dt>Placement</dt><dd>{placement}</dd><dt>Size</dt><dd>{size} in</dd>{flash && (<><dt>Flash</dt><dd>{flash.title}</dd></>)}</dl>
              </div>
              <div className="rcard">
                <div className="rcard-head"><h3 className="section-title">References · {refs.length}</h3><button type="button" className="link-btn" onClick={() => go(1)}>Edit</button></div>
                {refs.length ? <div className="mini-thumbs">{refs.map((r) => <img key={r.url} src={r.url} alt="" />)}</div> : <p className="hint">No images added</p>}
              </div>
              <div className="rcard">
                <div className="rcard-head"><h3 className="section-title">Preferred time</h3><button type="button" className="link-btn" onClick={() => go(2)}>Edit</button></div>
                <p className="mono" style={{ fontSize: 17 }}>{whenText}</p>
              </div>
              <div className="deposit"><span>Deposit, due only after {firstName} accepts</span><b>{money(artist.deposit_cents)}</b></div>
              {submitError && <div className="notice error" role="alert">{submitError}</div>}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="bk-pane sent" aria-labelledby="s5">
            <div className="seal"><CheckIcon /></div>
            <h2 id="s5">Request sent</h2>
            <span className="status pending">{whenText}</span>
            <p>{firstName} will reply with a quote. You can follow the status under Bookings.</p>
          </section>
        )}
      </main>

      <footer className="bk-foot">
        <div className="bk-wrap">
          {step > 0 && step < 4 && (
            <button type="button" className="btn ghost" onClick={() => window.history.back()} disabled={submitting}>Back</button>
          )}
          {step === 1 && refs.length === 0 && (
            <button type="button" className="btn ghost" onClick={() => go(2)}>Skip</button>
          )}
          {step === 4 ? (
            <Link className="btn grow" href="/bookings">See my bookings <ArrowIcon /></Link>
          ) : (
            <button type="button" className="btn grow" onClick={next} disabled={submitting}>
              {submitting ? "Sending…" : ["Continue", refs.length ? `Continue with ${refs.length}` : "Continue", "Review request", "Send request"][step]}
              {!submitting && <ArrowIcon />}
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

function Ruler({ value }: { value: number }) {
  const max = 12, w = 320, x0 = 6, span = w - 12;
  const ticks = [];
  for (let i = 0; i <= max * 4; i++) {
    const x = x0 + (span * i) / (max * 4);
    const h = i % 4 === 0 ? 10 : i % 2 === 0 ? 6 : 3.5;
    ticks.push(<line key={i} x1={x} x2={x} y1={10} y2={10 + h} style={{ stroke: "var(--muted)" }} strokeWidth={1} />);
    if (i % 8 === 0) ticks.push(<text key={`t${i}`} x={x} y={40} fontSize={9} textAnchor="middle" style={{ fill: "var(--muted)", fontFamily: "var(--font-data)" }}>{i / 4}</text>);
  }
  const has = value > 0;
  const cw = has ? (span * Math.min(value, max)) / max : 0;
  const ref = has ? SIZE_REFS.find((r) => value <= r[0]) ?? SIZE_REFS[SIZE_REFS.length - 1] : null;
  return (
    <div className="ruler">
      <svg viewBox="0 0 320 40" aria-hidden="true">
        <rect x={x0} y={10} width={span} height={22} rx={4} style={{ fill: "var(--raised)", stroke: "var(--line-strong)" }} />
        {ticks}
        {has && (
          <>
            <rect x={x0} y={10} width={cw} height={22} rx={4} style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} />
            <circle cx={x0 + cw} cy={21} r={5} style={{ fill: "var(--accent)" }} />
          </>
        )}
      </svg>
      <p>{ref ? <><b>{value} in</b> is {ref[1]}.</> : <>Measure the longest side. A credit card is <b>3.4 in</b> wide.</>}</p>
    </div>
  );
}

function Calendar({ month, today, lastDay, selected, slotsFor, onMonth, onPick }: {
  month: Date; today: Date; lastDay: Date; selected: Date | null;
  slotsFor: (d: Date) => { t: string; open: boolean }[] | null;
  onMonth: (d: Date) => void; onPick: (d: Date) => void;
}) {
  const y = month.getFullYear(), m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const canPrev = !(y === today.getFullYear() && m === today.getMonth());
  const canNext = new Date(y, m + 1, 1) <= lastDay;
  return (
    <div className="cal">
      <div className="cal-head">
        <h3 aria-live="polite">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
        <div className="cal-nav">
          <button type="button" className="icon-btn" disabled={!canPrev} onClick={() => onMonth(new Date(y, m - 1, 1))} aria-label="Previous month"><BackIcon /></button>
          <button type="button" className="icon-btn" disabled={!canNext} onClick={() => onMonth(new Date(y, m + 1, 1))} aria-label="Next month"><NextIcon /></button>
        </div>
      </div>
      <div className="grid7" aria-hidden="true">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d} className="dow">{d}</span>)}
      </div>
      <div className="grid7">
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: count }, (_, i) => {
          const d = new Date(y, m, i + 1);
          const slots = slotsFor(d);
          const open = slots ? slots.filter((s) => s.open).length : 0;
          const full = !!slots && open === 0;
          const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) +
            (!slots ? (d.getDay() === 1 && d > today ? ", closed" : ", unavailable") : full ? ", fully booked" : `, ${open} open times`);
          return (
            <button
              key={i} type="button" className="day" aria-label={label} data-full={full}
              aria-pressed={!!selected && selected.getTime() === d.getTime()}
              disabled={!slots || full} onClick={() => onPick(d)}
            >
              {i + 1}
              {open > 0 && <span className="dots">{Array.from({ length: Math.min(3, Math.ceil(open / 2)) }, (_, k) => <i key={k} />)}</span>}
            </button>
          );
        })}
      </div>
      <div className="legend"><span><i />Open times</span><span><i className="full" />Fully booked</span><span><i className="closed" />Closed Mondays</span></div>
    </div>
  );
}

function TimePicker({ date, slots, time, onPick }: { date: Date; slots: { t: string; open: boolean }[]; time: string | null; onPick: (t: string) => void }) {
  const group = (title: string, list: typeof slots) => (
    <div className="stack" style={{ gap: 8 }}>
      <h4 className="section-title" style={{ fontSize: 11 }}>{title}</h4>
      <div className="times">
        {list.map((s) => (
          <button key={s.t} type="button" className="time" disabled={!s.open} aria-pressed={time === s.t}
            aria-label={s.open ? fmtTime(s.t) : `${fmtTime(s.t)}, taken`} onClick={() => onPick(s.t)}>
            {fmtTime(s.t)}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="times-head">
        <h3>{date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h3>
        <span>{slots.filter((s) => s.open).length} of {slots.length} open</span>
      </div>
      {group("Daytime", slots.slice(0, 3))}
      {group("Evening", slots.slice(3))}
    </div>
  );
}
