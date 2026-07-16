import type { Category, Claim, DietKey, Place } from "../types";

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
  query: string;
  /** Only count a claim if someone actually checked it. Off by default — on, it's a much smaller map. */
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: Filters = {
  diet: { glutenFree: "off", seedOilFree: "off", sugarFree: "off", organic: "off" },
  categories: [],
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
  return diet + filters.categories.length + (filters.query.trim() ? 1 : 0);
}

/** All distinct items across the dataset, for the item-filter suggestions. */
export function allItems(places: Place[]): string[] {
  const seen = new Map<string, number>();
  for (const p of places) {
    for (const item of p.items) {
      seen.set(item, (seen.get(item) ?? 0) + 1);
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([i]) => i);
}
