# Ink Masters

A mobile-first Next.js app for finding tattoo artists and requesting bookings. It runs in any
phone browser and can be installed to the home screen on Android and iPhone. Data, logins and
images live in Supabase.

## What's in the app

| Page | Who | What it does |
| --- | --- | --- |
| `/` | Everyone | Artist feed: search, Near Me with a 5 to 50 mile radius, style filters, artist cards |
| `/artists/[slug]` | Everyone | Artist profile: header, bio, Instagram, stats, Portfolio and Flash Designs tabs |
| `/artists/[slug]/book` | Signed-in clients | 3-step booking request: idea, reference photos, calendar and time slot, then review |
| `/bookings` | Signed-in | Your booking requests and their status; cancel a pending request |
| `/dashboard` | Artists | Studio: accept or decline requests with a quote, upload portfolio and flash, edit profile |
| `/account` | Signed-in | Name and phone, install-app tip, log out |
| `/login`, `/signup`, `/forgot-password` | Everyone | Email and password accounts (client or artist) |

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # on Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. `.env.example` already holds your "ink masters" Supabase project's
URL and publishable key; `.env.local` is the copy Next.js reads (and Git ignores).

## 2. Supabase settings to change (one time)

In the Supabase dashboard for your project:

1. **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:3000` for now. Change it to your live address after deploying.
   - **Redirect URLs:** add `http://localhost:3000/**`. After deploying, also add `https://YOUR-APP.vercel.app/**`.
   These let the email links (confirm account, reset password) come back to the app.

2. **Emails while you're testing.** Supabase's built-in email service only delivers to the
   email addresses of your Supabase team members, and only a few per hour. You can either:
   - test sign-ups with your own email address, or
   - turn off **Authentication → Sign In / Providers → Email → Confirm email**, so new accounts
     can log in straight away.
   Before launch, set up your own email sender under **Authentication → Emails → SMTP Settings**
   (for example Resend or Postmark), then turn confirmation back on.

The database tables, security rules and image storage are already set up. The SQL is in
`supabase/schema.sql` if you ever need to recreate them.

## 3. Put it online (Vercel, free)

1. Put this folder in a GitHub repository.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
3. Under **Environment Variables**, add both lines from `.env.example`:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Click **Deploy**.
5. Back in Supabase, set the Site URL to your Vercel address and add it to Redirect URLs (step 2).

## 4. Install on a phone

The live address must be HTTPS (Vercel is). Phones won't install the app, share their
location or run the offline screen from a plain `http://192.168…` address.

- **Android (Chrome):** open the site, then tap **Install** on the banner, or **⋮ → Install app**.
- **iPhone / iPad (Safari):** open the site, tap **Share**, then **Add to Home Screen**.
  (On iOS 16.4 and later, Chrome and Edge also show Add to Home Screen in their share menu.)

Once installed, it opens full screen with its own icon. Long-press the icon on Android for
shortcuts to My bookings and Artist studio.

## Phone compatibility built in

- App manifest with PNG icons (Android adaptive "maskable" icon, iPhone home-screen icon)
- Notch, Dynamic Island and home-indicator safe areas on every screen
- Text fields are 16px, so iPhones don't zoom in when you tap them
- Android keyboard resizes the page, so the booking form's Continue button stays visible
- The phone's back button or swipe-back gesture steps back through the booking form
- Large tap targets; no hover states stuck on after a tap
- Photo uploads use the phone's camera roll or camera
- An offline screen when there's no signal, and cached app files for a fast start
- Light and dark mode on the feed and account pages; artist pages are always dark

## Things to know

- **Times:** booking slots are shown in the client's phone time zone. That's right when the
  client and the shop are in the same time zone. Session times are set in `SLOT_TIMES` in
  `lib/format.ts`, and the shop is closed on Mondays.
- **Ratings:** profiles show "New" until there's a reviews feature. `rating_avg` and
  `rating_count` are ready in the database for it.
- **Deposits** are shown but not collected. Taking payment would need Stripe or similar.
- **iPhone app and email links:** on iPhone, links in emails open in Safari rather than in the
  installed app. After confirming an account or resetting a password, open the app and log in.
- **Near Me** needs the artist's map location. Artists set it in the studio with "Use my
  current location" while at the shop.

## Project layout

```
app/                 pages (Next.js App Router)
components/          screens and UI pieces
components/dashboard artist studio pieces
lib/supabase/        Supabase clients and generated database types
lib/format.ts        shared constants and helpers (styles, time slots, money)
proxy.ts             keeps users signed in (named middleware.ts on Next.js 15)
public/              icons, service worker, offline page
supabase/schema.sql  database tables, security rules, storage buckets
```

After changing tables in Supabase, regenerate `lib/supabase/database.types.ts` (ask Claude,
or run `npx supabase gen types typescript --project-id wpwdcrttlnbadrzdtlld`).
