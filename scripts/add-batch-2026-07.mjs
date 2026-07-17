/**
 * One-off: geocode and emit 11 researched Santiago places as Place records,
 * merged into public/data/places.json.
 *
 * Provenance discipline, same as the original seed:
 *  - Coordinates come only from geocoding. No hand-typed lat/lng.
 *  - A diet axis is 'claimed' ONLY where a real source asserts it (the venue's
 *    own site, or a directory that specifically says so). Everything else stays
 *    'unknown' — these are candidates from web listings, not ground-truth. Not
 *    one of them is 'verified'; that still needs a human to walk in and ask.
 *  - seedOilFree is unknown for all 11. Nobody publishes their cooking oil.
 *
 * Run: node scripts/add-batch-2026-07.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const TODAY = "2026-07-17";
const VIEWBOX = "-70.85,-33.65,-70.50,-33.30";
const UA = "VitalMap-research/0.1 (david.egt7@gmail.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const U = { scope: "unknown", confidence: "unverified" };
/** A sourced 'claimed' claim. */
const C = (scope, source, note) => ({ scope, confidence: "claimed", source, note, checkedAt: TODAY });

// query = what to geocode; claims/items/sources reflect only what a source supports.
const DEFS = [
  {
    name: "Biomercado Sin Gluten",
    query: "Barcelona 2077, Providencia",
    category: "grocery",
    items: ["sin gluten", "productos orgánicos"],
    diet: {
      glutenFree: C("all", "https://www.biomercado.cl/", "Biomercado especializado sin gluten."),
      organic: C("some", "https://www.biomercado.cl/"),
    },
    sources: ["https://www.biomercado.cl/"],
  },
  {
    name: "Be Free",
    query: "Avenida Manquehue Sur 31, Las Condes",
    category: "grocery",
    items: ["sin gluten", "suplementos", "granel"],
    diet: {
      glutenFree: C("some", "https://chilebefree.com/", "Sección de alimentos sin gluten."),
    },
    sources: ["https://chilebefree.com/"],
  },
  {
    name: "Central Orgánica",
    query: "Avenida Apoquindo 2730, Las Condes",
    category: "grocery",
    items: ["productos orgánicos"],
    diet: {
      organic: C("all", "https://www.casafen.cl/listado-productos-organicos-en-santiago-chile/"),
    },
    sources: ["https://www.casafen.cl/listado-productos-organicos-en-santiago-chile/"],
  },
  {
    name: "Sin Envase",
    query: "Avenida Irarrazaval 3620, Nunoa",
    category: "grocery",
    items: ["granel"],
    // Zero-waste / bulk. That's not one of the four diet axes, so all stay unknown.
    diet: {},
    sources: ["https://loquemaspuedo.cl/donde-y-como-comprar-a-granel-en-chile/"],
  },
  {
    name: "Ecotienda Pewen",
    query: "Sucre 431, Nunoa",
    category: "grocery",
    items: ["granel", "productos naturales"],
    diet: {},
    sources: ["https://www.casafen.cl/listado-productos-organicos-en-santiago-chile/"],
  },
  {
    name: "El Naturista",
    query: "Huerfanos 1046, Santiago Centro",
    category: "restaurant",
    items: ["vegetariano", "almuerzo"],
    // Historic vegetarian (est. ~1938). Vegetarian isn't a diet axis here; the
    // four axes are genuinely undocumented, so unknown is the honest state.
    diet: {},
    sources: [
      "https://www.theclinic.cl/2024/02/16/el-naturista-el-primer-restaurante-vegetariano-de-chile-santiago-centro/",
    ],
  },
  {
    name: "Sapiens Comida Saludable",
    query: "Sapiens Barrio Italia Providencia",
    category: "restaurant",
    items: ["vegano", "bowls", "hamburguesas"],
    diet: {},
    sources: ["https://wanderlog.com/list/geoCategory/93379/best-vegan-restaurants-in-santiago"],
  },
  {
    name: "Pastelería Mango",
    query: "Diagonal Rancagua 988, Providencia",
    category: "bakery",
    items: ["postres", "tortas sin azúcar"],
    diet: {
      sugarFree: C("all", "https://pasteleriamango.com/", "Repostería sin azúcar."),
      glutenFree: C("all", "https://pasteleriamango.com/", "Repostería sin gluten."),
    },
    sources: ["https://pasteleriamango.com/"],
  },
  {
    name: "Bonheur Keto Pâtisserie",
    query: "Avenida Apoquindo 2730, Las Condes",
    category: "bakery",
    items: ["postres", "tortas", "croissants"],
    diet: {
      sugarFree: C("all", "https://bonheurketopatisserie.com/", "Sin azúcar."),
      glutenFree: C("all", "https://bonheurketopatisserie.com/", "Sin gluten ni conservantes."),
    },
    sources: ["https://bonheurketopatisserie.com/"],
    caveat: "Está dentro del mall MUT (Apoquindo 2730), mismo edificio que otras tiendas del mapa.",
  },
  {
    name: "Jo Pastelería",
    query: "Avenida Tobalaba 1499, Providencia",
    category: "bakery",
    items: ["postres"],
    diet: {
      sugarFree: C(
        "some",
        "https://www.lanacion.cl/que-hacer-en-santiago-lugares-donde-probar-postres-sin-azucar/",
        "Aparece en guías de repostería sin azúcar; alcance sin confirmar en terreno.",
      ),
    },
    sources: [
      "https://www.lanacion.cl/que-hacer-en-santiago-lugares-donde-probar-postres-sin-azucar/",
    ],
  },
  {
    name: "Quinoa",
    query: "Quinoa Luis Pasteur Vitacura Santiago",
    category: "cafe",
    items: ["bowls", "ensaladas", "vegetariano"],
    diet: {},
    sources: [
      "https://wanderlog.com/list/geoCategory/95164/best-vegetarian-restaurants-in-santiago",
    ],
  },
];

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

async function geocode(q) {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: q + ", Santiago, Chile",
      format: "json",
      limit: "1",
      viewbox: VIEWBOX,
      bounded: "1",
      addressdetails: "1",
    });
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("Nominatim HTTP " + r.status);
  const h = (await r.json())[0];
  if (!h) return null;
  const a = h.address || {};
  return {
    lat: +h.lat,
    lng: +h.lon,
    address: [a.road, a.house_number].filter(Boolean).join(" ") || undefined,
    comuna: a.city_district || a.suburb || a.town || a.city || undefined,
    osm: `https://www.openstreetmap.org/${h.osm_type}/${h.osm_id}`,
  };
}

const blankDiet = () => ({ glutenFree: { ...U }, seedOilFree: { ...U }, sugarFree: { ...U }, organic: { ...U } });

const existing = JSON.parse(await readFile(new URL("../public/data/places.json", import.meta.url), "utf8"));
const haveIds = new Set(existing.map((p) => p.id));
const haveNames = new Set(existing.map((p) => p.name.toLowerCase()));

const added = [];
const skipped = [];

for (const d of DEFS) {
  await sleep(1200);
  let hit;
  try {
    hit = await geocode(d.query);
  } catch (e) {
    skipped.push(`${d.name} — geocode error: ${e.message}`);
    continue;
  }
  if (!hit) {
    skipped.push(`${d.name} — no match in Santiago`);
    continue;
  }
  const id = `cur_${slug(d.name)}`;
  if (haveIds.has(id) || haveNames.has(d.name.toLowerCase())) {
    skipped.push(`${d.name} — already in places.json`);
    continue;
  }
  added.push({
    id,
    name: d.name,
    category: d.category,
    lat: hit.lat,
    lng: hit.lng,
    address: hit.address,
    comuna: hit.comuna,
    city: "Santiago",
    items: d.items ?? [],
    diet: { ...blankDiet(), ...d.diet },
    ...(d.caveat ? { caveat: d.caveat } : {}),
    sources: [...d.sources, hit.osm],
    addedAt: TODAY,
  });
}

const merged = [...existing, ...added].sort((a, b) => a.name.localeCompare(b.name, "es"));
await writeFile(
  new URL("../public/data/places.json", import.meta.url),
  JSON.stringify(merged, null, 2) + "\n",
);

console.log(`Added ${added.length} of ${DEFS.length}. Total now ${merged.length}.`);
for (const p of added) {
  const claimed = Object.entries(p.diet).filter(([, c]) => c.confidence !== "unverified").map(([k]) => k);
  console.log(`  + ${p.name.padEnd(26)} ${p.comuna ?? "?"}  claims: ${claimed.join(", ") || "(none — all unknown)"}`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log("  -", s);
}
