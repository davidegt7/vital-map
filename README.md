# Vital Map

Find places with real food. Santiago first.

A PWA map of restaurants, cafés, grocers and markets, filterable by **item** and by
**characteristic**: gluten free, sugar free, seed oil free, organic. Free to use;
the money comes from local businesses paying to be featured.

- **Stack** — Vite + React 19 + TypeScript + zustand, same shape as `vision`.
- **Map** — Leaflet + OpenStreetMap tiles. No API key, no billing card.
- **Data** — a static JSON file today, behind a seam that Supabase can slide into later.
- **Deploy** — GitHub Pages on push to `main`, live at
  <https://davidegt7.github.io/vital-map/>. The workflow runs `check-data` before the
  build.

### Hosting

**Today: GitHub Pages, public repo.** Simplest thing that works — no third-party
signup, and the repo is public anyway.

**When the repo goes private, Pages stops.** GitHub only publishes from private repos
on a paid plan, so that day the site goes dark and hosting has to move. The move is
already paid for in advance: `public/_headers` and `public/_redirects` are read by
**both** Netlify and Cloudflare Pages, and `netlify.toml` carries the build step. The
only code change needed is dropping `VITE_BASE_PATH` — Pages serves from a
`/vital-map/` subpath, Netlify and Cloudflare serve from root. Those two files are
inert on Pages, which is why they can sit there costing nothing until needed.

| | Private repo | Ads allowed | Bandwidth |
|---|---|---|---|
| Cloudflare Pages | yes | yes | unlimited (static) |
| Netlify | yes | yes | 100 GB/mo free |
| Vercel Hobby | yes | **no** | — |
| GitHub Pages | paid plans only | yes | 100 GB/mo soft |

**Vercel is disqualified, not merely dispreferred.** The Hobby plan is
[restricted to non-commercial use](https://vercel.com/docs/limits/fair-use-guidelines)
and Vercel's definition of commercial explicitly includes "the inclusion of
advertisements" — this project's entire business model. It would be a terms violation
the day `AdSlot` stops being a stub, not a problem to solve later.

GitHub Pages only publishes from private repos on a paid plan, which is why hosting
moved off it when the source closed.

Note that a private repo does **not** imply a private site — the deployed site is
public on every option above. Only the source is closed. Access-controlled Pages is
GitHub Enterprise Cloud, org-only.

```bash
npm install
npm run dev          # http://localhost:5190
npm run build
npm run check-data   # validate places.json — CI runs this before every deploy
```

## The one idea worth understanding

Every dietary claim carries **two axes instead of a boolean**:

| | |
|---|---|
| `scope` | `all` (whole kitchen) · `some` (options exist) · `none` · `unknown` |
| `confidence` | `verified` (someone checked) · `claimed` (the business says so) · `unverified` |

`glutenFree: true` is the obvious schema and it's the dangerous one. It collapses
"the owner has celiac and the kitchen has never seen wheat" together with "there's
a salad on the menu", and the reader can't tell which they're looking at. People
make medical decisions on this screen.

The axes are orthogonal, so the UI can be honest in both directions: text carries
scope, colour and the ✓/? mark carry confidence. `Sin gluten · 100% ?` means the
place *says* it's a dedicated kitchen and nobody has checked. That's a different
sentence from `Sin gluten · 100% ✓`, and it should look different.

**Absence of evidence never matches a filter.** `unknown` and `none` are excluded
from every diet filter — a place only appears under "gluten free" if something
positive is on record.

## The honest state of the data

14 places, as of the last seed build:

| axis | known | verified |
|---|---|---|
| organic | 8/14 | 0 |
| gluten free | 4/14 | 0 |
| sugar free | 0/14 | 0 |
| seed oil free | 0/14 | 0 |

**Nothing is ground-truth verified yet, and seed-oil-free is 0/14.** That isn't an
oversight — no restaurant on earth publishes its cooking oil, so the answer exists
nowhere except in the head of someone who walked in and asked. Which is precisely
the gap this app exists to fill, and precisely why faking it would defeat the point.
The seed is a skeleton to build on, not a launch dataset.

## Where the data comes from

`npm run geocode "<name>"` and `node scripts/build-seed.mjs` rebuild `public/data/places.json` from:

1. **OpenStreetMap (Overpass)** — real coordinates, real tags, thin coverage.
   Santiago has ~14 usable tagged places, and the tagging is noisy: `Jumbo`, `Líder`
   and `Santa Isabel` all carry `organic=yes` because they stock an organic aisle.
   `CHAIN_DENYLIST` in the build script drops them; importing them would fill the
   map with supermarket chains and burn the reader's trust on day one.
2. **A hand-curated list** — places found by research, geocoded via Nominatim.

Two rules the scripts enforce, because both failures are invisible in a JSON file:

- **No coordinate is ever typed by hand.** If geocoding can't find it, the place is
  dropped and reported — never guessed. This is not hypothetical: searching bare
  `"Quimey"` lands on an unrelated business in Conchalí, and `"Francisco Bilbao 1181"`
  resolves to La Pintana ~17km south, because Bilbao is a long street and no house
  number matches. All three results look equally plausible as a lat/lng.
- **No claim without a source.** Anything above `unverified` needs a URL or a note,
  or `check-data` fails the build.

Where sources genuinely disagree, the record ships a `caveat` and the app shows it
rather than quietly picking a winner (see Quimey's two addresses).

## Adding places (admin mode)

Open `?admin=1` — e.g. <https://davidegt7.github.io/vital-map/?admin=1>. Sign in with
a magic link, and you get a form to add places and to flip claims to `verified`.

**The `?admin=1` flag is not a secret and isn't pretending to be one.** It ships in
the bundle; anyone can type it. It only keeps admin chrome out of a visitor's face.
The real gate is Postgres: an impostor who finds the flag and signs up gets every
write rejected by RLS, because their email isn't in `editors`.

That's also why there's no shared "team code". A shared code can't be revoked, can't
be attributed, and leaks the first time somebody screenshots it — and on a map people
trust with a coeliac diagnosis, *verified by nobody in particular* is worth nothing.
Marking a claim verified stamps your email and the date into the claim's own `source`,
which is then shown to readers.

### One-time setup (David)

Nothing below can be done for you — it needs your Supabase login.

1. **Create a project** at <https://supabase.com/dashboard> (free tier). Use a *new*
   project, not vision's: `auth.users` is per-project, so sharing would give every
   vision user an account here.
2. **Run the schema**: SQL Editor → New query → paste all of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   It creates the tables, the RLS policies, and adds `david.egt7@gmail.com` as the
   first editor. Without that row *nobody* can write, including you.
3. **Seed the 14 places**: `node scripts/seed-sql.mjs > /tmp/seed.sql`, then paste
   that into the SQL editor and run it. (It generates SQL instead of writing over the
   network because seeding needs the service key, and that key should never leave the
   dashboard.)
4. **Set the keys.** Settings → API gives you the URL and the `anon` key. The anon key
   ships in client code by design — it is *not* a secret, RLS is what protects the
   data — so it belongs in a repo **variable**, not a secret:
   ```bash
   gh variable set VITE_SUPABASE_URL      -R davidegt7/vital-map -b "https://<ref>.supabase.co"
   gh variable set VITE_SUPABASE_ANON_KEY -R davidegt7/vital-map -b "<anon-key>"
   ```
   For local dev, put the same two in `.env.local`.
5. **Allow the magic-link redirect.** Authentication → URL Configuration → add
   `https://davidegt7.github.io/vital-map/` and `http://localhost:5190/` to **Redirect
   URLs**. Supabase silently refuses to send a magic link to a URL not on this list —
   this is the single most common reason "I click Entrar and nothing arrives".
6. **Redeploy** (any push, or Actions → Run workflow).

### Adding a teammate

```sql
insert into public.editors (email, name) values ('them@example.com', 'Name');
```
They open `?admin=1`, sign in with that address, and can write. Remove the row and
they can't — immediately, no redeploy.

### Without Supabase configured

The app runs fine: `loadPlaces()` falls back to the static `public/data/places.json`,
and admin mode says it isn't configured. The fallback isn't dead weight — it's also
what keeps the map up if Supabase is ever down. A slightly stale map beats no map when
someone is standing on a street corner.

## Roadmap

- **Verify the seed.** Walk in, ask about oil, set `confidence: 'verified'`. This is
  the whole product — everything else is plumbing around it.
- **Supabase** when reviews or submissions need to leave the phone. Only
  `src/lib/places.ts` changes; that's what the seam is for.
- **Submissions** — let people add places and answer `unknown` axes.
- **Ads** — `AdSlot` is a stub that makes no network calls and loads no third-party
  script. A sponsored-place model (a local shop paying to be featured, disclosed)
  is a better fit than display banners, which earn cents at this scale.
- **i18n** — `DIET_LABELS`/`CATEGORY_LABELS` already carry `en`/`es`; the UI is
  currently Spanish-only.
