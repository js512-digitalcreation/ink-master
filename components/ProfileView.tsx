"use client";

import Link from "next/link";
import { useState } from "react";
import { type Artist, type Work, duration, imageUrl, money } from "@/lib/format";
import { describeMethods } from "@/lib/payments";
import { Avatar } from "./Avatar";
import { BackIcon, CalendarIcon, InstagramIcon, PinIcon, ShareIcon } from "./Icons";

export function ProfileView({ artist, portfolio, flash }: { artist: Artist; portfolio: Work[]; flash: Work[] }) {
  const [tab, setTab] = useState<"portfolio" | "flash">("portfolio");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const bookHref = `/artists/${artist.slug}/book`;
  const area = [artist.neighborhood, artist.city].filter(Boolean).join(", ");
  const ig = artist.instagram_handle?.replace(/^@/, "");
  const heroImages = portfolio.slice(0, 6);
  const flashList = onlyAvailable ? flash.filter((f) => !f.is_claimed) : flash;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: artist.display_name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMsg("Link copied");
      }
    } catch {
      /* the person closed the share sheet */
    }
    setTimeout(() => setShareMsg(null), 1800);
  }

  return (
    <div className="prof">
      <header className="prof-hero">
        {artist.header_image_url ? (
          <img className="prof-hero-img" src={artist.header_image_url} alt="" />
        ) : heroImages.length >= 3 ? (
          <div className="prof-hero-grid" aria-hidden="true">
            {heroImages.map((w) => <img key={w.id} src={imageUrl(w.image_path)!} alt="" />)}
          </div>
        ) : (
          <div className="prof-hero-pattern" aria-hidden="true" />
        )}
        <div className="prof-bar">
          <Link className="glass" href="/" aria-label="Back to artists"><BackIcon /></Link>
          <button type="button" className="glass" onClick={share} aria-label="Share profile"><ShareIcon /></button>
        </div>
      </header>

      <section className="prof-identity pad">
        <div className="prof-avatar-row">
          <Avatar name={artist.display_name} url={artist.avatar_url} />
          <span className={`books-pill ${artist.books_open ? "" : "closed"}`}>
            <i />{artist.books_open ? "Books open" : "Books closed"}
          </span>
        </div>

        <div>
          <h1 className="prof-name">{artist.display_name}</h1>
          <div className="prof-sub">
            {ig && (
              <a className="ig" href={`https://www.instagram.com/${encodeURIComponent(ig)}/`} target="_blank" rel="noopener noreferrer">
                <InstagramIcon /> @{ig}
              </a>
            )}
            {(artist.shop_name || area) && <span><PinIcon /> {[artist.shop_name, area].filter(Boolean).join(" · ")}</span>}
          </div>
        </div>

        {artist.bio && <p className="prof-bio">{artist.bio}</p>}

        <div className="stats" role="list">
          <div className="stat" role="listitem">
            <b>{artist.rating_count > 0 ? <><span className="star">★</span> {artist.rating_avg.toFixed(1)}</> : "New"}</b>
            <span>{artist.rating_count} reviews</span>
          </div>
          <div className="stat" role="listitem"><b>{artist.years_experience ?? "—"}</b><span>Years</span></div>
          <div className="stat" role="listitem"><b>{money(artist.starting_price_cents)}</b><span>Shop min.</span></div>
          <div className="stat" role="listitem"><b>{money(artist.hourly_rate_cents)}</b><span>Per hour</span></div>
        </div>

        {artist.books_open ? (
          <>
            <div className="cta-row">
              <Link className="btn" href={bookHref}><CalendarIcon /> Book Consultation</Link>
            </div>
            <p className="note">Free consultation · {money(artist.deposit_cents)} deposit goes toward your tattoo, due only after {artist.display_name.split(" ")[0]} accepts</p>
            <p className="note">Pays with: {describeMethods(artist.payment_methods)}</p>
          </>
        ) : (
          <div className="notice">{artist.display_name} isn't taking new bookings right now.</div>
        )}
        {shareMsg && <p className="hint" role="status">{shareMsg}</p>}
      </section>

      <div className="tabs-wrap">
        <div className="tabs pad" role="tablist" aria-label="Artist work" data-tab={tab}>
          <button role="tab" id="tab-portfolio" aria-controls="panel-portfolio" aria-selected={tab === "portfolio"} onClick={() => setTab("portfolio")}>
            Portfolio <small>{portfolio.length}</small>
          </button>
          <button role="tab" id="tab-flash" aria-controls="panel-flash" aria-selected={tab === "flash"} onClick={() => setTab("flash")}>
            Flash Designs <small>{flash.length}</small>
          </button>
          <span className="ink-bar" aria-hidden="true" />
        </div>
      </div>

      {tab === "portfolio" ? (
        <section className="panel" id="panel-portfolio" role="tabpanel" aria-labelledby="tab-portfolio">
          {portfolio.length === 0 ? (
            <div className="pad"><div className="empty"><strong>No portfolio yet</strong>Check back soon.</div></div>
          ) : (
            <div className="mosaic">
              {portfolio.map((w, i) => (
                <figure key={w.id} className={`piece ${i % 7 === 0 && portfolio.length > 3 ? "big" : ""}`}>
                  <img src={imageUrl(w.image_path)!} alt={w.title ?? `Tattoo by ${artist.display_name}`} loading="lazy" />
                  {w.is_healed && <span className="healed">Healed</span>}
                  {w.tryon_image_path && <Link className="try" href={`/artists/${artist.slug}/try-on/${w.id}`}>Try it on</Link>}
                  {(w.placement || w.session_hours) && (
                    <figcaption>
                      <span>{w.placement}</span>
                      <span className="mono">{w.session_hours ? `${w.session_hours} hrs` : ""}</span>
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="panel pad" id="panel-flash" role="tabpanel" aria-labelledby="tab-flash">
          <div className="panel-head">
            <p>Pick a design, book the session</p>
            <div className="row">
              <button type="button" className="chip" aria-pressed={!onlyAvailable} onClick={() => setOnlyAvailable(false)}>All</button>
              <button type="button" className="chip" aria-pressed={onlyAvailable} onClick={() => setOnlyAvailable(true)}>Available</button>
            </div>
          </div>
          {flashList.length === 0 ? (
            <div className="empty"><strong>No flash designs {onlyAvailable ? "available" : "yet"}</strong></div>
          ) : (
            <div className="flash-grid">
              {flashList.map((f) => (
                <article key={f.id} className={`flash ${f.is_claimed ? "claimed" : ""}`}>
                  <div className="flash-art">
                    <img src={imageUrl(f.image_path)!} alt={f.title ?? "Flash design"} loading="lazy" />
                    <span className={`flash-kind ${f.is_repeatable ? "rep" : ""}`}>{f.is_repeatable ? "Repeatable" : "One-off"}</span>
                    {f.size_inches && <span className="flash-size">{f.size_inches} in</span>}
                    {f.is_claimed && <div className="claimed-stamp"><span>Claimed</span></div>}
                  </div>
                  <div className="flash-body">
                    <h3>{f.title ?? "Untitled design"}</h3>
                    <div className="flash-meta">
                      <span className="flash-price">{money(f.price_cents)}</span>
                      <span className="flash-time" title="Estimated time">≈ {duration(f.estimated_minutes)}</span>
                    </div>
                    <div className="flash-actions">
                      <Link className="btn ghost" href={`/artists/${artist.slug}/try-on/${f.id}`}>Try it on</Link>
                      {f.is_claimed || !artist.books_open ? (
                        <button type="button" className="btn ghost" disabled>{f.is_claimed ? "Claimed" : "Closed"}</button>
                      ) : (
                        <Link className="btn ghost" href={`${bookHref}?flash=${f.id}`}>Book</Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {artist.books_open && (
        <div className="dock">
          <div className="dock-in">
            <div className="dock-who"><b>{artist.display_name}</b><span>From {money(artist.starting_price_cents)}</span></div>
            <Link className="btn" href={bookHref}>Book Consultation</Link>
          </div>
        </div>
      )}
    </div>
  );
}
