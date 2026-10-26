# Tattoo Try-On — Design

**Date:** 2026-10-26
**Status:** Draft for review

## Goal

Let clients see what an artist's design would look like on their own body
before they book, and make the result fun enough to share, so it brings
new people to Ink Masters.

**Success looks like:**
- A client can go from an artist's flash design to a convincing preview on
  their own photo in under a minute, on any modern phone browser.
- The saved/shared image is branded, so shares advertise the artist and the app.
- A client who likes the result can book that design with the try-on
  image already attached for the artist to see.

## Decisions (agreed in chat)

| Question | Decision |
|---|---|
| Purpose | Preview before booking, plus a fun shareable feature |
| Mode for v1 | Photo try-on (live camera AR is a possible later upgrade) |
| Which designs | All flash, plus portfolio pieces that have an artist-uploaded "try-on version" |
| After try-on | Save/share the image, or "Book this" with the image attached to the booking |
| Technique | Built into the app with the browser's 2D canvas; no new libraries, no paid service |

**Out of scope for v1:** live camera AR, bending the design around curves,
clients uploading their own designs, saving a gallery of try-ons to the
account, any server-side storage of the client's body photo.

## User flow

1. On an artist's profile, each flash card, and each portfolio piece that has
   a try-on version, shows a **Try it on** button.
2. Tapping it opens `/artists/[slug]/try-on/[workId]`. No login is needed.
3. The client taps **Take photo** (opens the camera) or **Choose photo**
   (photo library). Both use a normal file input with `accept="image/*"`;
   `capture` is used only on the "Take photo" button.
4. The design appears centred on the photo. The client can:
   - drag with one finger to move it,
   - pinch with two fingers to resize and twist to rotate,
   - use a **Fade** slider (fresh ink to healed look),
   - tap **Flip** to mirror it,
   - tap **Reset** to re-centre it.
   On desktop: drag with the mouse, scroll to resize, and use sliders for size
   and rotation.
5. Two actions:
   - **Save / Share** makes the final image with a small corner tag,
     "Design by {artist} · inkmasters.art". On phones that support it, the
     share sheet opens with the image (`navigator.share({ files })`).
     Otherwise the image downloads.
   - **Book this** stores the final image in the browser and goes to the
     booking form (`/artists/[slug]/book?flash={id}&tryon=1` for flash, or
     `?work={id}&tryon=1` for portfolio pieces, which pre-fills the idea). The booking
     form picks the image up and adds it as the first reference photo. If the
     client must log in first, the existing login redirect keeps `tryon=1`,
     and the image is still waiting afterwards.

## Privacy

The client's body photo never leaves their phone during try-on. It is only
uploaded if they press **Book this** and then submit the booking. At that
point it goes into the existing private `booking-references` bucket,
visible only to the client and that artist. Sharing is done by the client's
own phone.

## How the blend works

The design is drawn on top of the photo with the canvas `multiply` blend
mode:
- White paper becomes invisible (white × skin = skin).
- Dark ink darkens the skin, and the skin's texture and lighting show
  through, so it looks inked rather than stuck on.
- The Fade slider sets the layer's opacity (default 90%), and a very
  slight blur (≈0.4 px at photo scale) softens the edges like real ink.

**Background cleanup:** photos of paper flash are often grey or cream rather
than pure white, which would tint the skin. When a design loads, pixels that
are close to the paper colour are pushed to pure white. The paper colour is
sampled from the image's border pixels, and a soft threshold avoids hard
edges. This runs once per design, in the browser.

Images are drawn into a canvas, so they must load with
`crossOrigin="anonymous"`. Supabase public storage sends the CORS
headers this needs.

**Photo size:** the client's photo is scaled down to a maximum of 2048 px on
its longest side when it loads, which keeps it fast on older phones. The
correct rotation comes from the browser, which applies the photo's EXIF
orientation automatically when decoding.

## Data changes

One new nullable column, added in a Supabase migration and mirrored in
`supabase/schema.sql` and `lib/supabase/database.types.ts`:

```sql
alter table public.portfolios add column tryon_image_path text;
-- path inside the 'portfolio' bucket, e.g. <user-id>/tryon-<id>.png
```

**Rule:** a piece can be tried on if `kind = 'flash'` OR
`tryon_image_path is not null`. The image used is
`tryon_image_path ?? image_path`, so artists can also give a flash design a
cleaner try-on file if they want.

No changes to `bookings`: the try-on image is a normal reference image.
The existing storage and RLS policies already cover the uploads.

## Artist side

In **Studio → Portfolio** (`PortfolioManager`):
- The add form gets an optional **Try-on version** image picker, for both
  past work and flash, with a one-line hint: "A clean drawing of the design on
  white, without skin. Lets clients try it on."
- Each existing item gets **Add try-on version**, or **Replace** /
  **Remove** if it already has one, so artists can add one to old pieces.
- It uses the existing `uploadPortfolioImage` helper with a `tryon-` prefix.

## Code structure

| Unit | Responsibility |
|---|---|
| `app/artists/[slug]/try-on/[workId]/page.tsx` | Server page: loads artist + work, 404s if the work can't be tried on, renders `TryOn` |
| `components/tryon/TryOn.tsx` | Client screen: photo picking, toolbar, Save/Share, Book this |
| `components/tryon/Stage.tsx` | Canvas preview and pointer/touch gestures; holds the transform state |
| `lib/tryon/transform.ts` | Pure maths: pinch/drag → `{x, y, scale, rotation, flip}`, clamping |
| `lib/tryon/cleanup.ts` | Pure function: paper-colour detection and whitening on `ImageData` |
| `lib/tryon/render.ts` | Draws photo + design + tag to a canvas, exports a JPEG `Blob` |
| `lib/tryon/handoff.ts` | Saves/loads the try-on image for the booking form (IndexedDB, one slot, expires after 1 hour) |

Changes to existing files:
- `ProfileView.tsx`: **Try it on** buttons on cards that qualify.
- `BookingForm.tsx`: on mount, if `tryon=1`, load the handed-off image and add
  it to `refs` as the first reference photo (it counts toward the 6-photo limit).
- `book/page.tsx`: keep `tryon` and `work` in the login return URL. Accept a
  `work` param for portfolio pieces (looked up like `flash`, but not set as
  `flash_id`) and pass a pre-filled idea like *I'd like something like "{title}" from
  your portfolio.*
- `PortfolioManager.tsx`: try-on version upload / replace / remove.
- `upload.ts`: no change.

## Errors and edge cases

| Case | Behaviour |
|---|---|
| Design image fails to load | Message with a **Try again** button; photo is kept |
| Photo isn't an image or can't be decoded | "That photo couldn't be opened, try another" |
| Share sheet unavailable or cancelled | Falls back to download; a cancel is silent |
| Booking form already has 6 references | Try-on image takes the first slot, so the client can still add 5 |
| Handoff image missing or expired | Booking form opens normally with no error |
| Flash is claimed (one-off, taken) | Try-on still works for fun; the **Book this** button is disabled with "Claimed" |
| Artist's books closed | Same as claimed: try-on works, booking is disabled with "Books closed" |

## Testing

- **Unit tests** with Node's built-in test runner (`node --test`, no new
  dependencies) for `transform.ts` and `cleanup.ts`, the two places where
  the maths can go wrong. Add an `npm test` script.
- **Typecheck and build** (`npm run typecheck`, `npm run build`) must pass.
- **Manual check in a real browser** (Playwright with mobile emulation):
  open a flash try-on, load a sample photo, move/resize/rotate, export the
  image and check that the blend and the tag look right; then **Book this**
  → log in → the image appears in the booking form's reference photos.
- **Real phone check by you** after deploy, since the camera and share
  sheet only fully work on a real device.
