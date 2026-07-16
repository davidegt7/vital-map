# Vital Map

Find places with real food. Santiago first.

A PWA map of restaurants, cafés, grocers and markets, filterable by **item** and by
**characteristic**: gluten free, sugar free, seed oil free, organic. Free to use;
the money comes from local businesses paying to be featured.

- **Stack** — Vite + React 19 + TypeScript + zustand, same shape as `vision`.
- **Map** — Leaflet + OpenStreetMap tiles. No API key, no billing card.
- **Data** — a static JSON file today, behind a seam that Supabase can slide into later.
- **Deploy** — Netlify on push to `main`; `netlify.toml` runs `check-data` before the build.

### Why Netlify and not Vercel or Pages

The repo is private, and GitHub Pages only publishes from private repos on a paid
plan — so Pages is out while the source stays closed.

Vercel's free Hobby plan is out for a different and more permanent reason: it is
[restricted to non-commercial use](https://vercel.com/docs/limits/fair-use-guidelines),
and their definition of commercial explicitly includes "the inclusion of
advertisements". That's this project's entire business model, so Hobby would be a
terms violation the day the ad slots go live. Netlify's free tier permits commercial
use, ads included.

Note that a private repo does **not** imply a private site — the deployed site is
public either way. Only the source is closed.

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
