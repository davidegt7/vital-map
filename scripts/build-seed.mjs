/**
 * Builds public/data/places.json from two sources that are allowed to disagree:
 *
 *   1. OpenStreetMap (Overpass) — real coordinates, real tags, thin coverage.
 *   2. A hand-curated list — places found by research, geocoded via Nominatim.
 *
 * Rules this script exists to enforce:
 *   - No coordinate is ever typed by hand. If geocoding fails, the place is
 *     dropped and reported, never guessed.
 *   - No claim without a source. Anything unsourced stays `unknown`.
 *   - Supermarket chains tagged organic=yes are excluded: that tag means
 *     "has an organic aisle", not "is an organic store". Importing them would
 *     fill the map with Walmart-equivalents and burn the reader's trust.
 *
 * Run: node scripts/build-seed.mjs
 */
import { writeFile } from "node:fs/promises";
import { geocode } from "./geocode.mjs";

const UA = "VitalMap/0.1 (https://github.com/davidegt7/vital-map)";
const BBOX = "-33.65,-70.85,-33.30,-70.50";
const TODAY = new Date().toISOString().slice(0, 10);

const UNKNOWN = { scope: "unknown", confidence: "unverified" };
const blankDiet = () => ({
  glutenFree: { ...UNKNOWN },
  seedOilFree: { ...UNKNOWN },
  sugarFree: { ...UNKNOWN },
  organic: { ...UNKNOWN },
});

/** Chains whose `organic=yes` tag means "stocks an organic aisle". Not organic stores. */
const CHAIN_DENYLIST = [
  "jumbo",
  "lider",
  "líder",
  "santa isabel",
  "unimarc",
  "tottus",
  "supermercado mayorista 10",
  "mayorista 10",
  "ekono",
  "acuenta",
];

const OSM_CATEGORY = {
  restaurant: "restaurant",
  cafe: "cafe",
  fast_food: "restaurant",
  supermarket: "grocery",
  convenience: "grocery",
  greengrocer: "market",
  bakery: "bakery",
  butcher: "butcher",
  health_food: "grocery",
  farm: "market",
  deli: "grocery",
  juice_bar: "juice",
  marketplace: "market",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fromOSM() {
  const query = `
[out:json][timeout:90];
(
  nwr["diet:gluten_free"~"yes|only"](${BBOX});
  nwr["organic"~"yes|only"](${BBOX});
);
out center tags;`;

  // Overpass is free, shared, and hands out 504s and 429s when it's busy.
  // Retrying is the difference between a script that works and one that works
  // on a good day. It still throws on final failure — better to abort than to
  // overwrite good data with a partial harvest.
  let elements;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    if (res.ok) {
      ({ elements } = await res.json());
      break;
    }
    if (attempt >= 4) throw new Error(`Overpass HTTP ${res.status} after ${attempt} attempts`);
    const wait = attempt * 5000;
    console.log(`  Overpass HTTP ${res.status}, retrying in ${wait / 1000}s…`);
    await sleep(wait);
  }

  const places = [];
  const skipped = [];

  for (const el of elements) {
    const t = el.tags ?? {};
    if (!t.name) {
      skipped.push("(unnamed)");
      continue;
    }
    if (CHAIN_DENYLIST.some((c) => t.name.toLowerCase().includes(c))) {
      skipped.push(`${t.name} — supermarket chain, organic aisle only`);
      continue;
    }

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) {
      skipped.push(`${t.name} — no coordinates`);
      continue;
    }

    const kind = t.amenity ?? t.shop;
    const category = OSM_CATEGORY[kind] ?? "grocery";
    const osmUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
    const diet = blankDiet();

    // OSM's own tag semantics, mapped honestly onto our two axes.
    // `only` = whole establishment, `yes` = options exist. Either way the
    // source is a volunteer mapper, not an inspection: confidence is 'claimed'.
    if (t["diet:gluten_free"] === "only") {
      diet.glutenFree = { scope: "all", confidence: "claimed", source: osmUrl, checkedAt: TODAY };
    } else if (t["diet:gluten_free"] === "yes") {
      diet.glutenFree = { scope: "some", confidence: "claimed", source: osmUrl, checkedAt: TODAY };
    }
    if (t.organic === "only") {
      diet.organic = { scope: "all", confidence: "claimed", source: osmUrl, checkedAt: TODAY };
    } else if (t.organic === "yes") {
      diet.organic = { scope: "some", confidence: "claimed", source: osmUrl, checkedAt: TODAY };
    }

    places.push({
      id: `osm_${el.type}_${el.id}`,
      name: t.name,
      category,
      lat,
      lng,
      address: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ") || undefined,
      comuna: t["addr:city"] || undefined,
      city: "Santiago",
      website: t.website || t["contact:website"] || undefined,
      items: [],
      diet,
      sources: [osmUrl],
      addedAt: TODAY,
    });
  }

  return { places, skipped };
}

/**
 * Places found by research. Every claim here cites the source that made it.
 * Note what is NOT here: seedOilFree and sugarFree are `unknown` on every
 * single row, because no restaurant on earth publishes its cooking oil. That
 * gap is not an oversight — it's the thing the app exists to fill, and faking
 * it would defeat the point.
 */
const CURATED = [
  {
    name: "Quimey Sushi Fusion & Gluten Free",
    // Two sources, two addresses: Barros Borgoño 160 and Francisco Bilbao 1181.
    // Searching the bare name lands on an unrelated "Quimey" in Conchalí, and
    // "Francisco Bilbao 1181" resolves to La Pintana because Bilbao is a long
    // street and no house number matches. Barros Borgoño 160 geocodes cleanly
    // to Providencia, which agrees with the venue's own Facebook listing — so
    // that's the pin, and the disagreement ships visible as a caveat.
    query: "Doctor Manuel Barros Borgoño 160 Providencia",
    category: "restaurant",
    items: ["sushi sin gluten", "pizza sin gluten", "sándwiches"],
    caveat:
      "Hay dos direcciones dando vuelta: Barros Borgoño 160 y Francisco Bilbao 1181. El pin está en la primera. Confirma antes de ir.",
    diet: {
      glutenFree: {
        scope: "all",
        confidence: "claimed",
        source: "https://www.quimeysushi.cl/",
        note: "Se presenta como el primer sushi 100% gluten free de Chile.",
        checkedAt: TODAY,
      },
    },
    sources: ["https://www.quimeysushi.cl/"],
  },
  {
    name: "Bar Italia",
    query: "Bar Italia Avenida Italia 1206 Providencia",
    category: "restaurant",
    items: ["pasta sin gluten", "postres sin gluten"],
    diet: {
      glutenFree: {
        scope: "all",
        confidence: "claimed",
        source: "https://viajosingluten.com/santiago-de-chile-sin-gluten-por-segunda-vez/",
        note: "Descrito por terceros como 100% libre de gluten. Sin comprobar en terreno.",
        checkedAt: TODAY,
      },
    },
    sources: ["https://viajosingluten.com/santiago-de-chile-sin-gluten-por-segunda-vez/"],
  },
  {
    name: "El Huerto",
    query: "El Huerto Orrego Luco 054 Providencia",
    category: "restaurant",
    items: ["vegetariano", "ensaladas", "jugos"],
    diet: {},
    sources: ["https://laurenonlocation.com/healthy-santiago-chile/"],
  },
  {
    name: "El Árbol",
    query: "El Árbol restaurant Providencia",
    category: "restaurant",
    items: ["vegetariano", "vegano"],
    diet: {},
    sources: ["https://laurenonlocation.com/healthy-santiago-chile/"],
  },
];

async function fromCurated() {
  const places = [];
  const skipped = [];

  for (const entry of CURATED) {
    // Nominatim's usage policy is 1 request/second. Respect it — this script is
    // a guest on somebody else's free infrastructure.
    await sleep(1100);
    let hit = null;
    try {
      hit = await geocode(entry.query);
    } catch (err) {
      skipped.push(`${entry.name} — geocoder error: ${err.message}`);
      continue;
    }
    if (!hit) {
      skipped.push(`${entry.name} — no match inside the Santiago bbox`);
      continue;
    }

    places.push({
      id: `cur_${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
      name: entry.name,
      category: entry.category,
      lat: hit.lat,
      lng: hit.lng,
      address: hit.address,
      comuna: hit.comuna,
      city: "Santiago",
      items: entry.items ?? [],
      diet: { ...blankDiet(), ...entry.diet },
      caveat: entry.caveat,
      sources: [...entry.sources, hit.osm],
      addedAt: TODAY,
    });
  }

  return { places, skipped };
}

const osm = await fromOSM();
const curated = await fromCurated();

// A curated entry and an OSM node can be the same shop. Prefer curated: it has
// items, notes and a real source, where OSM has a bare tag.
const byKey = new Map();
for (const p of [...osm.places, ...curated.places]) {
  const key = `${p.name.toLowerCase()}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
  const existing = byKey.get(key);
  if (!existing || p.id.startsWith("cur_")) byKey.set(key, p);
}

const all = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
await writeFile(
  new URL("../public/data/places.json", import.meta.url),
  JSON.stringify(all, null, 2) + "\n",
);

console.log(`\nWrote ${all.length} places (${osm.places.length} OSM, ${curated.places.length} curated)`);
console.log("\nSkipped:");
for (const s of [...osm.skipped, ...curated.skipped]) console.log("  -", s);

const gaps = { glutenFree: 0, seedOilFree: 0, sugarFree: 0, organic: 0 };
for (const p of all) {
  for (const k of Object.keys(gaps)) if (p.diet[k].scope === "unknown") gaps[k]++;
}
console.log("\nUnknown claims (the honest state of the data):");
for (const [k, n] of Object.entries(gaps)) console.log(`  ${k}: ${n}/${all.length} unknown`);
