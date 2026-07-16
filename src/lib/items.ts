import type { Category, Place } from "../types";

/**
 * The item taxonomy: WHAT the food is. Never what property it has.
 *
 * Two worlds, because "what are you looking for" is a different question in a
 * shop than in a restaurant. Nobody orders chucrut by the jar at a café, and
 * nobody asks a butcher for brunch.
 *
 * The rule that shapes this list: **items are plain nouns, never health claims.**
 * There is no "pizza sin gluten" item — there is `pizza`, and the diet filter
 * supplies "sin gluten". Composing the two axes is what the whole app is built
 * on, and duplicating the claim here would reintroduce exactly the bug the
 * two-axis Claim model exists to prevent: a place listing plain "pan" matching a
 * "Pan sin gluten" filter, or any "chocolate" matching "Chocolate sin azúcar".
 * A generic item must never silently acquire a property nobody claimed.
 *
 * The exceptions are products where the qualifier IS the product and there's no
 * diet axis for it — raw milk is not "milk with a property", it's a different
 * thing on a different shelf. Those keep tight aliases (never the bare noun) so
 * ordinary milk can't match them.
 */
export type ItemWorld = "shop" | "eat" | "both";

export interface ItemDef {
  id: string;
  label: { es: string; en: string };
  world: ItemWorld;
  /** Extra spellings found in Place.items, which is free text. Never the bare
   *  noun of a *more specific* item — that's how false positives get in. */
  aliases?: string[];
}

export const SHOP_CATEGORIES: Category[] = ["grocery", "bakery", "butcher", "market"];
export const EAT_CATEGORIES: Category[] = ["restaurant", "cafe", "juice"];

export const WORLD_LABELS: Record<"shop" | "eat", { es: string; en: string }> = {
  shop: { es: "Para llevar", en: "To take home" },
  eat: { es: "Para comer acá", en: "To eat here" },
};

export const ITEMS: ItemDef[] = [
  // ---- para llevar ----
  { id: "chucrut", label: { es: "Chucrut", en: "Sauerkraut" }, world: "shop", aliases: ["sauerkraut", "fermentados"] },
  { id: "pan", label: { es: "Pan", en: "Bread" }, world: "shop" },
  { id: "masa-madre", label: { es: "Masa madre", en: "Sourdough" }, world: "shop", aliases: ["sourdough"] },
  { id: "huevos", label: { es: "Huevos", en: "Eggs" }, world: "shop" },
  { id: "leche-cruda", label: { es: "Leche cruda", en: "Raw milk" }, world: "shop", aliases: ["raw milk"] },
  { id: "carne-pastoreo", label: { es: "Carne de pastoreo", en: "Grass-fed meat" }, world: "shop", aliases: ["grass fed", "pastoreo", "libre pastoreo"] },
  { id: "kombucha", label: { es: "Kombucha", en: "Kombucha" }, world: "shop" },
  { id: "kefir", label: { es: "Kéfir", en: "Kefir" }, world: "shop" },
  { id: "miel", label: { es: "Miel", en: "Honey" }, world: "shop" },
  { id: "aceite-oliva", label: { es: "Aceite de oliva", en: "Olive oil" }, world: "shop", aliases: ["oliva"] },
  { id: "frutos-secos", label: { es: "Frutos secos", en: "Nuts" }, world: "shop", aliases: ["nueces", "almendras", "mani"] },
  { id: "verduras", label: { es: "Verduras y frutas", en: "Produce" }, world: "shop", aliases: ["verdura", "hortalizas", "frutas"] },
  { id: "quesos", label: { es: "Quesos", en: "Cheese" }, world: "shop", aliases: ["queso"] },
  { id: "harina", label: { es: "Harina", en: "Flour" }, world: "shop" },
  { id: "ghee", label: { es: "Ghee y mantequilla", en: "Ghee & butter" }, world: "shop", aliases: ["mantequilla"] },
  { id: "chocolate", label: { es: "Chocolate", en: "Chocolate" }, world: "shop", aliases: ["cacao"] },

  // ---- para comer acá ----
  { id: "desayuno", label: { es: "Desayuno", en: "Breakfast" }, world: "eat", aliases: ["brunch"] },
  { id: "almuerzo", label: { es: "Almuerzo", en: "Lunch" }, world: "eat", aliases: ["menu del dia"] },
  { id: "ensaladas", label: { es: "Ensaladas", en: "Salads" }, world: "eat", aliases: ["ensalada"] },
  { id: "bowls", label: { es: "Bowls", en: "Bowls" }, world: "eat", aliases: ["bowl"] },
  { id: "caldo-huesos", label: { es: "Caldo de huesos", en: "Bone broth" }, world: "eat", aliases: ["bone broth", "caldo"] },
  { id: "jugos", label: { es: "Jugos naturales", en: "Fresh juice" }, world: "eat", aliases: ["jugo", "zumo"] },
  { id: "pizza", label: { es: "Pizza", en: "Pizza" }, world: "eat" },
  { id: "pasta", label: { es: "Pasta", en: "Pasta" }, world: "eat" },
  { id: "sushi", label: { es: "Sushi", en: "Sushi" }, world: "eat" },
  { id: "hamburguesas", label: { es: "Hamburguesas", en: "Burgers" }, world: "eat", aliases: ["hamburguesa", "burger"] },
  { id: "postres", label: { es: "Postres", en: "Desserts" }, world: "eat", aliases: ["postre"] },
  { id: "sandwiches", label: { es: "Sándwiches", en: "Sandwiches" }, world: "eat", aliases: ["sandwich", "sanguche"] },
  { id: "vegetariano", label: { es: "Vegetariano", en: "Vegetarian" }, world: "eat", aliases: ["vegetariana"] },
  { id: "vegano", label: { es: "Vegano", en: "Vegan" }, world: "eat", aliases: ["vegana", "plant based"] },

  // ---- ambos ----
  { id: "cafe", label: { es: "Café", en: "Coffee" }, world: "both", aliases: ["coffee", "grano"] },
];

const ITEMS_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

/** Accent- and case-insensitive: Place.items is hand-written, "Orgánico" must match "organico". */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // combining diacritics

/**
 * One-directional on purpose: the place's text must CONTAIN the item, never the
 * reverse. "sushi sin gluten" contains "sushi" → match. But a place listing
 * plain "pan" must not match a hypothetical "pan de masa madre" filter just
 * because the needle contains the haystack. That direction invents claims.
 */
export function placeHasItem(place: Place, itemId: string): boolean {
  const def = ITEMS_BY_ID.get(itemId);
  if (!def) return false;
  const needles = [def.id.replace(/-/g, " "), def.label.es, def.label.en, ...(def.aliases ?? [])].map(
    norm,
  );
  return place.items.some((raw) => {
    const hay = norm(raw);
    return needles.some((n) => hay.includes(n));
  });
}

/**
 * Which worlds are relevant for the chosen place types. No type chosen means no
 * opinion yet, so show both rather than guessing.
 */
export function worldsFor(categories: Category[]): ("shop" | "eat")[] {
  if (!categories.length) return ["shop", "eat"];
  const worlds: ("shop" | "eat")[] = [];
  if (categories.some((c) => SHOP_CATEGORIES.includes(c))) worlds.push("shop");
  if (categories.some((c) => EAT_CATEGORIES.includes(c))) worlds.push("eat");
  return worlds.length ? worlds : ["shop", "eat"];
}

export function itemsForWorld(world: "shop" | "eat"): ItemDef[] {
  return ITEMS.filter((i) => i.world === world || i.world === "both");
}

export function itemLabel(id: string): string {
  return ITEMS_BY_ID.get(id)?.label.es ?? id;
}
