import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Category, DietKey, Place, Review } from "./types";
import { addReview, loadPlaces, loadReviews, savePlace } from "./lib/places";
import { EMPTY_FILTERS, type DietStrictness, type Filters } from "./lib/filters";
import { ITEMS, worldsFor } from "./lib/items";
import { checkIsEditor, getSession, isSupabaseConfigured, onAuthChange } from "./lib/auth";
import { initialLang, persistLang, type Lang } from "./lib/i18n";

interface State {
  places: Place[];
  reviews: Review[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  filters: Filters;
  selectedId: string | null;
  lang: Lang;

  // --- admin ---
  /** Admin mode is a URL flag (?admin=1), NOT a secret. It reveals a form; the
   *  database decides whether anything it produces is allowed to land. */
  adminMode: boolean;
  session: Session | null;
  isEditor: boolean;
  authReady: boolean;
  /** The place being edited, or "new". Null when the editor is closed. */
  editing: Place | "new" | null;

  init: () => Promise<void>;
  setDiet: (key: DietKey, value: DietStrictness) => void;
  toggleCategory: (category: Category) => void;
  toggleItem: (itemId: string) => void;
  setQuery: (query: string) => void;
  setVerifiedOnly: (value: boolean) => void;
  resetFilters: () => void;
  select: (id: string | null) => void;
  setLang: (lang: Lang) => void;
  submitReview: (review: Omit<Review, "id" | "createdAt">) => void;

  refreshAuth: () => Promise<void>;
  setEditing: (p: Place | "new" | null) => void;
  persistPlace: (p: Place) => Promise<{ error: string | null }>;
}

export const useStore = create<State>((set, get) => ({
  places: [],
  reviews: [],
  status: "idle",
  error: null,
  filters: EMPTY_FILTERS,
  selectedId: null,
  lang: initialLang(),

  adminMode: new URLSearchParams(window.location.search).has("admin"),
  session: null,
  isEditor: false,
  authReady: false,
  editing: null,

  init: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const places = await loadPlaces();
      set({ places, reviews: loadReviews(), status: "ready" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
    if (get().adminMode && isSupabaseConfigured()) {
      await get().refreshAuth();
      void onAuthChange(() => void get().refreshAuth());
    } else {
      set({ authReady: true });
    }
  },

  refreshAuth: async () => {
    const session = await getSession();
    const isEditor = session ? await checkIsEditor() : false;
    set({ session, isEditor, authReady: true });
  },

  setEditing: (editing) => set({ editing }),

  persistPlace: async (place) => {
    const res = await savePlace(place);
    if (!res.error) {
      // Re-read rather than patch in memory: the database applies triggers and
      // constraints, so what it stored is the truth, not what we sent.
      try {
        const places = await loadPlaces();
        set({ places, editing: null });
      } catch {
        set({ editing: null });
      }
    }
    return res;
  },

  setDiet: (key, value) =>
    set((s) => ({ filters: { ...s.filters, diet: { ...s.filters.diet, [key]: value } } })),

  toggleCategory: (category) =>
    set((s) => {
      const has = s.filters.categories.includes(category);
      const categories = has
        ? s.filters.categories.filter((c) => c !== category)
        : [...s.filters.categories, category];

      // Switching to Restaurante while "chucrut" is still selected would zero the
      // map from a menu that no longer shows the offending chip. Drop items whose
      // world just became irrelevant rather than leave an invisible filter on.
      const worlds = worldsFor(categories);
      const items = s.filters.items.filter((id) => {
        const def = ITEMS.find((i) => i.id === id);
        return !def || def.world === "both" || worlds.includes(def.world);
      });

      return { filters: { ...s.filters, categories, items } };
    }),

  toggleItem: (itemId) =>
    set((s) => ({
      filters: {
        ...s.filters,
        items: s.filters.items.includes(itemId)
          ? s.filters.items.filter((i) => i !== itemId)
          : [...s.filters.items, itemId],
      },
    })),

  setQuery: (query) => set((s) => ({ filters: { ...s.filters, query } })),
  setVerifiedOnly: (verifiedOnly) => set((s) => ({ filters: { ...s.filters, verifiedOnly } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  select: (selectedId) => set({ selectedId }),

  setLang: (lang) => {
    persistLang(lang);
    document.documentElement.lang = lang;
    set({ lang });
  },

  submitReview: (review) => {
    const saved = addReview(review);
    set((s) => ({ reviews: [...s.reviews, saved] }));
  },
}));
