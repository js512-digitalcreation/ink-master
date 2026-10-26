"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { STYLES, imageUrl, milesBetween, money } from "@/lib/format";
import { Avatar } from "./Avatar";
import { InstallPrompt } from "./InstallPrompt";
import { NavIcon, PinIcon, SearchIcon, Stars } from "./Icons";

type FeedArtist = {
  id: string;
  slug: string;
  display_name: string;
  shop_name: string | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  styles: string[];
  starting_price_cents: number | null;
  rating_avg: number;
  rating_count: number;
  avatar_url: string | null;
  books_open: boolean;
  portfolios: { id: string; image_path: string; title: string | null }[];
};

type Loc = { lat: number; lng: number };

export function Feed({ artists, loadError }: { artists: FeedArtist[]; loadError: string | null }) {
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("All styles");
  const [near, setNear] = useState(false);
  const [radius, setRadius] = useState(25);
  const [loc, setLoc] = useState<Loc | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  function toggleNear() {
    if (near) return setNear(false);
    if (loc) return setNear(true);
    if (!("geolocation" in navigator)) {
      setLocError("Your browser can't share its location.");
      return;
    }
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNear(true);
      },
      () => setLocError("Location is turned off. Allow location access for this site to filter by distance."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists
      .map((a) => ({
        ...a,
        miles: loc && a.latitude != null && a.longitude != null ? milesBetween(loc, { lat: a.latitude, lng: a.longitude }) : null,
      }))
      .filter((a) => style === "All styles" || a.styles.includes(style))
      .filter((a) => !q || [a.display_name, a.shop_name, a.city, a.neighborhood, ...a.styles].join(" ").toLowerCase().includes(q))
      .filter((a) => !near || (a.miles != null && a.miles <= radius))
      .sort((x, y) => (near && x.miles != null && y.miles != null ? x.miles - y.miles : 0));
  }, [artists, query, style, near, radius, loc]);

  const what = style === "All styles" ? "artists" : `${style} artists`;
  const scope = near ? `within ${radius} mi` : "";

  return (
    <div className="page wide">
      <header className="topbar">
        <h1 className="logo">Ink <span>Masters</span></h1>
      </header>

      <InstallPrompt dismissible />

      <section className="feed-search" aria-label="Search artists" style={{ paddingTop: 14 }}>
        <div className="search-row">
          <label className="search" htmlFor="q">
            <SearchIcon />
            <span className="sr-only">Search</span>
            <input id="q" type="search" placeholder="Artist, shop or style" autoComplete="off" enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className="near" aria-pressed={near} onClick={toggleNear}>
            <NavIcon /> Near Me
          </button>
        </div>
        <div className="radius" data-off={!near}>
          <div className="radius-head">
            <label htmlFor="radius">
              {near ? <>Within <b>{radius} miles</b> of you</> : <>Turn on <b>Near Me</b> to filter by distance</>}
            </label>
            <output className="radius-val" htmlFor="radius">{radius} mi</output>
          </div>
          <input
            id="radius" type="range" min={5} max={50} step={5} value={radius} disabled={!near}
            onChange={(e) => setRadius(+e.target.value)}
            style={{ ["--pct" as string]: `${((radius - 5) / 45) * 100}%` }}
          />
          <div className="radius-scale" aria-hidden="true"><span>5 mi</span><span>50 mi</span></div>
        </div>
        {locError && <p className="err">{locError}</p>}
      </section>

      <div className="rail-wrap">
        <div className="rail" role="toolbar" aria-label="Filter by tattoo style">
          {["All styles", ...STYLES].map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={s === style} onClick={() => setStyle(s)}>{s}</button>
          ))}
        </div>
      </div>

      <main>
        <div className="feed-head">
          <h2>{list.length} {list.length === 1 ? what.replace(/s$/, "") : what} {scope}</h2>
          <p>{near ? "Sorted by distance" : "Top rated first"}</p>
        </div>

        {loadError ? (
          <div className="notice error">Couldn't load artists: {loadError}</div>
        ) : artists.length === 0 ? (
          <div className="empty">
            <strong>No artists yet</strong>
            Artists appear here once they create a profile.
            <Link className="btn small" href="/signup?role=artist">I'm an artist</Link>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <strong>No artists match</strong>
            Try a wider radius or a different style.
            <button type="button" className="btn ghost small" onClick={() => { setQuery(""); setStyle("All styles"); setRadius(50); }}>Clear filters</button>
          </div>
        ) : (
          <div className="feed">
            {list.map((a) => <ArtistCard key={a.id} artist={a} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function ArtistCard({ artist: a }: { artist: FeedArtist & { miles: number | null } }) {
  const area = [a.neighborhood, a.city].filter(Boolean).join(", ");
  const href = `/artists/${a.slug}`;
  return (
    <article className="card">
      <div className="card-head">
        <Avatar name={a.display_name} url={a.avatar_url} />
        <div className="who">
          <h3><Link href={href}>{a.display_name}</Link></h3>
          <p className="shop"><PinIcon /><span>{[a.shop_name, area].filter(Boolean).join(" · ") || "Location not set"}</span></p>
        </div>
      </div>
      <div className="meta">
        {a.rating_count > 0 ? (
          <span className="rating"><Stars rating={a.rating_avg} />{a.rating_avg.toFixed(1)} <small>({a.rating_count})</small></span>
        ) : (
          <span className="rating"><small>New on Ink Masters</small></span>
        )}
        {a.miles != null && (<><span className="sep" aria-hidden="true" /><span className="dist">{a.miles.toFixed(1)} mi</span></>)}
        {!a.books_open && (<><span className="sep" aria-hidden="true" /><span className="dist">Books closed</span></>)}
      </div>
      <Link href={href} className="works" aria-label={`Recent work by ${a.display_name}`}>
        {[0, 1, 2].map((i) => {
          const w = a.portfolios[i];
          return w ? <img key={w.id} src={imageUrl(w.image_path)!} alt={w.title ?? ""} loading="lazy" /> : <span key={i} />;
        })}
      </Link>
      {a.styles.length > 0 && <div className="tags">{a.styles.map((s) => <span key={s} className="tag">{s}</span>)}</div>}
      <div className="card-foot">
        <div className="price"><small>Starting price</small><b>{money(a.starting_price_cents)}</b></div>
        <Link className="btn small" href={href}>View profile</Link>
      </div>
    </article>
  );
}
