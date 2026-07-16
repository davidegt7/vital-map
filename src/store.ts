import { create } from "zustand";
import type { Category, DietKey, Place, Review } from "./types";
import { addReview, loadPlaces, loadReviews } from "./lib/places";
import { EMPTY_FILTERS, type DietStrictness, type Filters } from "./lib/filters";

interface State {
  places: Place[];
  reviews: Review[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  filters: Filters;
  selectedId: string | null;

  init: () => Promise<void>;
  setDiet: (key: DietKey, value: DietStrictness) => void;
  toggleCategory: (category: Category) => void;
  setQuery: (query: string) => void;
  setVerifiedOnly: (value: boolean) => void;
  resetFilters: () => void;
  select: (id: string | null) => void;
  submitReview: (review: Omit<Review, "id" | "createdAt">) => void;
}

export const useStore = create<State>((set, get) => ({
  places: [],
  reviews: [],
  status: "idle",
  error: null,
  filters: EMPTY_FILTERS,
  selectedId: null,

  init: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const places = await loadPlaces();
      set({ places, reviews: loadReviews(), status: "ready" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  setDiet: (key, value) =>
    set((s) => ({ filters: { ...s.filters, diet: { ...s.filters.diet, [key]: value } } })),

  toggleCategory: (category) =>
    set((s) => {
      const has = s.filters.categories.includes(category);
      return {
        filters: {
          ...s.filters,
          categories: has
            ? s.filters.categories.filter((c) => c !== category)
            : [...s.filters.categories, category],
        },
      };
    }),

  setQuery: (query) => set((s) => ({ filters: { ...s.filters, query } })),
  setVerifiedOnly: (verifiedOnly) => set((s) => ({ filters: { ...s.filters, verifiedOnly } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  select: (selectedId) => set({ selectedId }),

  submitReview: (review) => {
    const saved = addReview(review);
    set((s) => ({ reviews: [...s.reviews, saved] }));
  },
}));
