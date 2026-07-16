import type { Place, Review } from "../types";

/**
 * The data-layer seam.
 *
 * Everything above this file talks to `loadPlaces` / `loadReviews` / `addReview`
 * and knows nothing about where the bytes come from. Today: a static JSON file
 * and localStorage. When the place count or the review volume justifies a real
 * backend, only this file changes — Supabase drops in behind these four
 * signatures and no component has to learn about it.
 *
 * That's why places are fetched rather than `import`ed: a fetch already has the
 * async shape a network call needs, so the swap doesn't ripple outward.
 */

const REVIEWS_KEY = "vitalmap.reviews.v1";

let placesCache: Promise<Place[]> | null = null;

export function loadPlaces(): Promise<Place[]> {
  if (!placesCache) {
    const url = `${import.meta.env.BASE_URL}data/places.json`;
    placesCache = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`places.json: HTTP ${r.status}`);
        return r.json();
      })
      .then((raw: unknown) => {
        if (!Array.isArray(raw)) throw new Error("places.json: expected an array");
        return raw as Place[];
      })
      .catch((err) => {
        // Don't cache a rejection — a transient offline load would poison every
        // later call for the lifetime of the page.
        placesCache = null;
        throw err;
      });
  }
  return placesCache;
}

export function loadReviews(): Review[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

export function addReview(review: Omit<Review, "id" | "createdAt">): Review {
  const full: Review = {
    ...review,
    id: `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const all = [...loadReviews(), full];
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
  return full;
}

export function reviewsFor(placeId: string, all: Review[]): Review[] {
  return all
    .filter((r) => r.placeId === placeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
