import type { Category, Claim, DietKey, Place } from "../types";
import { placeHasItem } from "./items";

/**
 * How strict a diet filter is:
 *   off  — not filtering on this axis
 *   some — the place has real options ("gluten free options")
 *   all  — the whole place honours it ("100% gluten free kitchen")
 */
export type DietStrictness = "off" | "some" | "all";

export interface Filters {
  diet: Record<DietKey, DietStrictness>;
  categories: Category[];
  /** Item ids from lib/items. OR'd together — see applyFilters. */
  items: string[];
  query: string;
  /** Only count a claim if someone actually checked it. Off by default — on, it's a much smaller map. */
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  diet: { glutenFree: "off", seedOilFree: "off", sugarFree: "off", organic: "off" },
  categories: [],
  items: [],
  query: "",
  verifiedOnly: false,
};

export function matchesClaim(claim: Claim, want: DietStrictness, verifiedOnly: boolean): boolean {
  if (want === "off") return true;
  if (verifiedOnly && claim.confidence !== "verified") return false;
  // An unverified claim still counts by default — it's what the business says —
  // but 'unknown' and 'none' never match. Absence of evidence is not a yes.
  if (claim.confidence === "unverified") return false;
  if (want === "all") return claim.scope === "all";
  return claim.scope === "all" || claim.scope === "some";
}

function matchesQuery(place: Place, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [place.name, place.comuna ?? "", place.address ?? "", ...place.items]
    .join(" ")
    .toLowerCase();
  // Every whitespace-separated term must appear somewhere — "sin gluten pan"
  // should narrow, not widen.
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function applyFilters(places: Place[], filters: Filters): Place[] {
  const activeDiet = (Object.entries(filters.diet) as [DietKey, DietStrictness][]).filter(
    ([, want]) => want !== "off",
  );

  return places.filter((place) => {
    if (filters.categories.length && !filters.categories.includes(place.category)) return false;
    if (!matchesQuery(place, filters.query)) return false;

    // Items are OR'd: picking "café" and "pan" means "either is fine", which is
    // how people shop. Diet axes are AND'd below, because "gluten free AND sugar
    // free" means both — a coeliac diabetic is not asking for either/or.
    if (filters.items.length && !filters.items.some((id) => placeHasItem(place, id))) return false;

    // "Solo comprobado" with no diet axis selected still has to mean something,
    // or the checkbox is a lie: it reads as a promise and would silently do
    // nothing. With no axis to scope it to, it means "places where somebody has
    // ground-truthed *any* claim".
    if (activeDiet.length === 0) {
      if (filters.verifiedOnly) {
        return Object.values(place.diet).some((c) => c.confidence === "verified");
      }
      return true;
    }

    return activeDiet.every(([key, want]) =>
      matchesClaim(place.diet[key], want, filters.verifiedOnly),
    );
  });
}

export function activeFilterCount(filters: Filters): number {
  const diet = Object.values(filters.diet).filter((v) => v !== "off").length;
  return diet + filters.categories.length + filters.items.length + (filters.query.trim() ? 1 : 0);
}

/**
 * How many places each item would yield, given every OTHER active filter.
 *
 * Faceted rather than global: if you've already picked "Restaurante", the counts
 * must describe restaurants, or they promise results the click won't deliver.
 * Zero is a legitimate and useful answer — it's how a gap in the data becomes
 * visible instead of just being an empty screen after a hopeful tap.
 */
export function itemCounts(places: Place[], filters: Filters, ids: string[]): Map<string, number> {
  const base = applyFilters(places, { ...filters, items: [] });
  return new Map(ids.map((id) => [id, base.filter((p) => placeHasItem(p, id)).length]));
}
