/**
 * A dietary claim is modelled on two independent axes rather than a boolean.
 *
 * `glutenFree: true` is the obvious schema and it is the wrong one: it collapses
 * "the owner has celiac and the kitchen has never seen wheat" together with
 * "there's a salad on the menu", and it gives the reader no way to tell which
 * one they're looking at. People make medical decisions on this screen.
 *
 *   scope      — how much of the place honours it
 *   confidence — how well anyone actually knows
 *
 * The axes are orthogonal. A place can be scope:'all' + confidence:'claimed'
 * (says it's a 100% GF kitchen, nobody's checked) or scope:'some' +
 * confidence:'verified' (David went, there are real options, shared fryer).
 */
export type ClaimScope = "all" | "some" | "none" | "unknown";
export type ClaimConfidence = "verified" | "claimed" | "unverified";

export interface Claim {
  scope: ClaimScope;
  confidence: ClaimConfidence;
  /** URL, or a human note like "David, visited 2026-07-14". Required for anything above 'unverified'. */
  source?: string;
  /** Nuance the two axes can't carry: "dedicated fryer, shared prep surface". */
  note?: string;
  /** ISO date last checked. Claims rot — a 2019 menu proves nothing about today's kitchen. */
  checkedAt?: string;
}

export const UNKNOWN_CLAIM: Claim = { scope: "unknown", confidence: "unverified" };

/** The four axes from the brainstorm. Order here drives display order. */
export const DIET_KEYS = ["glutenFree", "seedOilFree", "sugarFree", "organic"] as const;
export type DietKey = (typeof DIET_KEYS)[number];

export const DIET_LABELS: Record<DietKey, { en: string; es: string }> = {
  glutenFree: { en: "Gluten free", es: "Sin gluten" },
  seedOilFree: { en: "Seed oil free", es: "Sin aceites de semillas" },
  sugarFree: { en: "Sugar free", es: "Sin azúcar" },
  organic: { en: "Organic", es: "Orgánico" },
};

export const CATEGORIES = [
  "restaurant",
  "cafe",
  "grocery",
  "bakery",
  "juice",
  "butcher",
  "market",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { en: string; es: string; icon: string }> = {
  restaurant: { en: "Restaurant", es: "Restaurante", icon: "🍽️" },
  cafe: { en: "Coffee shop", es: "Cafetería", icon: "☕" },
  grocery: { en: "Grocery", es: "Almacén", icon: "🛒" },
  bakery: { en: "Bakery", es: "Panadería", icon: "🥖" },
  juice: { en: "Juice bar", es: "Jugería", icon: "🥤" },
  butcher: { en: "Butcher", es: "Carnicería", icon: "🥩" },
  market: { en: "Market", es: "Feria", icon: "🧺" },
};

export interface Place {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address?: string;
  comuna?: string;
  city: string;
  website?: string;
  instagram?: string;
  /** Searchable menu/stock items: "sourdough", "bone broth", "raw milk", "grass-fed beef". */
  items: string[];
  diet: Record<DietKey, Claim>;
  /**
   * A known problem with this record that the reader deserves to see — usually
   * sources disagreeing about the address. Better to show the doubt than to
   * quietly pick a winner and send someone to the wrong comuna.
   */
  caveat?: string;
  /** Where this record came from. Every place must cite at least one. */
  sources: string[];
  addedAt: string;
}

export interface Review {
  id: string;
  placeId: string;
  rating: number;
  body: string;
  author: string;
  createdAt: string;
  /** Which diet axes this reviewer is speaking to — a celiac's GF review carries different weight. */
  speaksTo: DietKey[];
}
