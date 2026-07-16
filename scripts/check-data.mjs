/**
 * Validates public/data/places.json before it can ship.
 *
 * The failure this guards against is specific and bad: a place with a confident
 * dietary claim and no source behind it. That record looks identical to a real
 * one in the UI, and someone with celiac disease acts on it. So an unsourced
 * claim above `unverified` is a hard error, not a warning.
 *
 * Run: node scripts/check-data.mjs
 */
import { readFile } from "node:fs/promises";

const DIET_KEYS = ["glutenFree", "seedOilFree", "sugarFree", "organic"];
const CATEGORIES = ["restaurant", "cafe", "grocery", "bakery", "juice", "butcher", "market"];
const SCOPES = ["all", "some", "none", "unknown"];
const CONFIDENCES = ["verified", "claimed", "unverified"];

// Santiago, Chile. Anything outside this box is a geocoding accident —
// most likely one of the other Santiagos, or the wrong end of a long street.
const BBOX = { minLat: -33.65, maxLat: -33.3, minLng: -70.85, maxLng: -70.5 };

const raw = await readFile(new URL("../public/data/places.json", import.meta.url), "utf8");
const places = JSON.parse(raw);

const errors = [];
const warnings = [];
const ids = new Set();

for (const [i, p] of places.entries()) {
  const at = `[${i}] ${p.name ?? "(no name)"}`;

  if (!p.id) errors.push(`${at}: missing id`);
  if (ids.has(p.id)) errors.push(`${at}: duplicate id ${p.id}`);
  ids.add(p.id);

  if (!p.name?.trim()) errors.push(`${at}: missing name`);
  if (!CATEGORIES.includes(p.category)) errors.push(`${at}: bad category ${p.category}`);
  if (!p.sources?.length) errors.push(`${at}: no sources — every record must cite one`);

  if (typeof p.lat !== "number" || typeof p.lng !== "number") {
    errors.push(`${at}: non-numeric coordinates`);
  } else if (
    p.lat < BBOX.minLat ||
    p.lat > BBOX.maxLat ||
    p.lng < BBOX.minLng ||
    p.lng > BBOX.maxLng
  ) {
    errors.push(`${at}: coordinates outside Santiago (${p.lat}, ${p.lng})`);
  }

  for (const key of DIET_KEYS) {
    const claim = p.diet?.[key];
    if (!claim) {
      errors.push(`${at}: missing diet.${key} — use an explicit unknown, not an absent key`);
      continue;
    }
    if (!SCOPES.includes(claim.scope)) errors.push(`${at}: diet.${key} bad scope ${claim.scope}`);
    if (!CONFIDENCES.includes(claim.confidence)) {
      errors.push(`${at}: diet.${key} bad confidence ${claim.confidence}`);
    }
    if (claim.confidence !== "unverified" && !claim.source) {
      errors.push(`${at}: diet.${key} is '${claim.confidence}' with no source — not allowed`);
    }
    if (claim.scope !== "unknown" && claim.confidence === "unverified") {
      warnings.push(`${at}: diet.${key} asserts a scope but nobody has checked it`);
    }
  }
}

const unknown = Object.fromEntries(
  DIET_KEYS.map((k) => [k, places.filter((p) => p.diet?.[k]?.scope === "unknown").length]),
);
const verified = places.filter((p) =>
  DIET_KEYS.some((k) => p.diet?.[k]?.confidence === "verified"),
).length;

console.log(`${places.length} places checked`);
console.log(
  `coverage — ${Object.entries(unknown)
    .map(([k, n]) => `${k}: ${places.length - n}/${places.length} known`)
    .join(", ")}`,
);
console.log(`${verified}/${places.length} have at least one ground-truth verified claim`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log("  ⚠", w);
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error("  ✗", e);
  process.exit(1);
}

console.log("\n✓ data is valid");
