/**
 * Two-language UI strings, no dependencies.
 *
 * Spanish is the source of truth (this is a Santiago app first), and `EN` is
 * typed as `Record<keyof typeof ES, string>` so the compiler refuses to build
 * if a key is ever added to one language and not the other. That's the whole
 * safety story: you cannot ship a half-translated string by accident.
 *
 * Data labels (categories, diets, items) are NOT here — they already carry
 * { es, en } on the data itself. This file is only the UI chrome.
 *
 * `{name}` placeholders are filled by t()'s second argument.
 */

export type Lang = "es" | "en";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

const ES = {
  "app.tagline": "Comida real en Santiago. Gratis, siempre.",
  "app.loading": "Cargando lugares…",
  "app.loadError": "No se pudieron cargar los lugares.",

  "search.placeholder": "Buscar lugar, comuna o producto…",
  "search.label": "Buscar",
  "filter.clear": "Limpiar ({n})",

  "menu.item": "Qué buscas",
  "menu.diet": "Características",
  "menu.category": "Tipo de lugar",

  "item.emptyTitle": "Nadie ha registrado esto todavía",
  "item.countTitle": "{n} lugares",
  "item.hintA": "Combínalo con",
  "item.hintB": "— pizza + sin gluten. Los",
  "item.hintC": "son lo que nadie ha registrado todavía.",

  "diet.hintA": "Toca una vez para",
  "diet.hintOptions": "hay opciones",
  "diet.hintB": ", otra vez para",
  "diet.hint100": "100%",

  "verified.label": "Solo comprobado",
  "verified.desc": "Esconde lo que solo dice el local. Mapa mucho más chico, pero confiable.",

  "strictness.some": "hay opciones",
  "strictness.all": "100%",

  "map.locate": "Dónde estoy",
  "map.place": "lugar",
  "map.places": "lugares",
  "map.ofTotal": "de {n}",

  "list.emptyTitle": "Ningún lugar cumple con esto.",
  "list.emptyVerified":
    "«Solo comprobado» es un filtro duro — casi nada está comprobado todavía. Prueba apagarlo.",
  "list.emptyHint": "Prueba con menos filtros, o cuéntanos de un lugar que conozcas.",
  "list.clearFilters": "Limpiar filtros",

  "sheet.directions": "Cómo llegar",
  "sheet.website": "Sitio web",
  "sheet.whatYouFind": "Qué encuentras",
  "sheet.whatWeKnow": "Lo que sabemos",
  "sheet.edit": "✎ Editar",
  "sheet.gapNote":
    "{n} de 4 sin comprobar. Nadie publica si cocina con aceites de semillas — esa respuesta solo la trae alguien que pregunta en el local.",
  "sheet.reviews": "Reseñas",
  "sheet.noReviews": "Nadie ha reseñado este lugar todavía.",
  "sheet.writeReview": "Escribir reseña",
  "sheet.speaksOf": "Habla de:",
  "sheet.sources": "Fuentes de esta ficha",
  "sheet.caveat": "Ojo:",
  "common.close": "Cerrar",
  "common.anon": "Anónimo",

  "review.bodyPlaceholder": "¿Cómo te fue? Sé específico: qué comiste, qué preguntaste, qué te dijeron.",
  "review.namePlaceholder": "Tu nombre (opcional)",
  "review.speaksLegend": "¿De qué puedes hablar con conocimiento?",
  "review.publish": "Publicar reseña",
  "review.localNote": "Por ahora las reseñas se guardan solo en este teléfono.",
  "review.ratingLabel": "{n} de 5",

  "claim.uncheckedStatus": "Nadie ha comprobado",
  "claim.no": "No",
  "claim.scopeAll": "Todo el local",
  "claim.scopeSome": "Hay opciones",
  "claim.confVerified": "comprobado en terreno",
  "claim.confClaimed": "lo dice el local",
  "claim.confUnverified": "sin comprobar",
  "claim.gap": "¿Sabes la respuesta? Esto es justo lo que falta.",
  "claim.source": "Fuente:",

  "badge.scope100": "· 100%",
  "badge.scopeOptions": "· opciones",
  "badge.scopeNone": "Sin {label}",
  "badge.titleVerified": "Alguien lo comprobó en terreno.",
  "badge.titleClaimed": "Lo dice el local o una fuente publicada. Nadie lo ha comprobado.",
  "badge.srVerified": " (comprobado)",
  "badge.srUnverified": " (sin comprobar)",

  "admin.notConfigured":
    "Falta crear el proyecto de Supabase y setear VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Ver README.",
  "admin.notConfiguredLead": "Admin sin configurar.",
  "admin.checking": "Revisando sesión…",
  "admin.linkSentA": "Te mandamos un link a",
  "admin.linkSentB": ". Ábrelo en este mismo teléfono.",
  "admin.emailPlaceholder": "tu@email.com",
  "admin.enter": "Entrar",
  "admin.notEditor": "no está en la lista de editores.",
  "admin.signOut": "Salir",
  "admin.addPlace": "+ Agregar lugar",

  "editor.dialogLabel": "Editar lugar",
  "editor.new": "Nuevo lugar",
  "editor.editing": "Editando",
  "editor.noName": "Sin nombre",
  "editor.basics": "Lo básico",
  "editor.name": "Nombre",
  "editor.type": "Tipo",
  "editor.where": "Dónde queda",
  "editor.geoPlaceholder": "Dirección o nombre, ej: Orrego Luco 054",
  "editor.search": "Buscar",
  "editor.searching": "Buscando…",
  "editor.geoNoResults": "Sin resultados dentro de Santiago. Prueba con la dirección.",
  "editor.noStreet": "sin calle",
  "editor.geoHint": "Busca la dirección — las coordenadas no se escriben a mano.",
  "editor.scopeUnknown": "Nadie ha comprobado",
  "editor.scopeAll": "Todo el local",
  "editor.scopeSome": "Hay opciones",
  "editor.scopeNone": "No",
  "editor.confUnverified": "Sin comprobar",
  "editor.confClaimed": "Lo dice el local",
  "editor.confVerified": "Lo comprobé en terreno",
  "editor.sourcePlaceholder": "Fuente — URL, o «pregunté al dueño»",
  "editor.notePlaceholder": "Detalle: «freidora aparte, mesón compartido»",
  "editor.sourcesAndCaveats": "Fuentes y avisos",
  "editor.sourcesLabel": "Fuentes (una por línea)",
  "editor.caveatLabel": "Aviso (opcional)",
  "editor.caveatPlaceholder": "Ej: hay dos direcciones dando vuelta",
  "editor.saveHint":
    "Falta: nombre, ubicación buscada, al menos una fuente, y una fuente por cada dato que no esté «sin comprobar».",
  "editor.cancel": "Cancelar",
  "editor.save": "Guardar",
  "editor.saving": "Guardando…",
  "editor.verifiedBy": "Comprobado por {who}, {date}",
} as const;

const EN: Record<keyof typeof ES, string> = {
  "app.tagline": "Real food in Santiago. Free, always.",
  "app.loading": "Loading places…",
  "app.loadError": "Couldn't load places.",

  "search.placeholder": "Search place, neighborhood or product…",
  "search.label": "Search",
  "filter.clear": "Clear ({n})",

  "menu.item": "What you want",
  "menu.diet": "Characteristics",
  "menu.category": "Place type",

  "item.emptyTitle": "Nobody has logged this yet",
  "item.countTitle": "{n} places",
  "item.hintA": "Combine it with",
  "item.hintB": "— pizza + gluten free. The",
  "item.hintC": "are what nobody has logged yet.",

  "diet.hintA": "Tap once for",
  "diet.hintOptions": "has options",
  "diet.hintB": ", again for",
  "diet.hint100": "100%",

  "verified.label": "Verified only",
  "verified.desc": "Hides what the place merely claims. A much smaller map, but a trustworthy one.",

  "strictness.some": "has options",
  "strictness.all": "100%",

  "map.locate": "Where am I",
  "map.place": "place",
  "map.places": "places",
  "map.ofTotal": "of {n}",

  "list.emptyTitle": "No place matches this.",
  "list.emptyVerified":
    "“Verified only” is a hard filter — almost nothing is verified yet. Try turning it off.",
  "list.emptyHint": "Try fewer filters, or tell us about a place you know.",
  "list.clearFilters": "Clear filters",

  "sheet.directions": "Directions",
  "sheet.website": "Website",
  "sheet.whatYouFind": "What you'll find",
  "sheet.whatWeKnow": "What we know",
  "sheet.edit": "✎ Edit",
  "sheet.gapNote":
    "{n} of 4 unchecked. Nobody publishes whether they cook with seed oils — that answer only comes from someone who asks in person.",
  "sheet.reviews": "Reviews",
  "sheet.noReviews": "Nobody has reviewed this place yet.",
  "sheet.writeReview": "Write a review",
  "sheet.speaksOf": "Speaks to:",
  "sheet.sources": "Sources for this entry",
  "sheet.caveat": "Heads up:",
  "common.close": "Close",
  "common.anon": "Anonymous",

  "review.bodyPlaceholder": "How was it? Be specific: what you ate, what you asked, what they told you.",
  "review.namePlaceholder": "Your name (optional)",
  "review.speaksLegend": "What can you speak to from experience?",
  "review.publish": "Post review",
  "review.localNote": "For now reviews are saved only on this phone.",
  "review.ratingLabel": "{n} of 5",

  "claim.uncheckedStatus": "Nobody has checked",
  "claim.no": "No",
  "claim.scopeAll": "Whole place",
  "claim.scopeSome": "Has options",
  "claim.confVerified": "checked in person",
  "claim.confClaimed": "the place says so",
  "claim.confUnverified": "unchecked",
  "claim.gap": "Know the answer? This is exactly what's missing.",
  "claim.source": "Source:",

  "badge.scope100": "· 100%",
  "badge.scopeOptions": "· options",
  "badge.scopeNone": "No {label}",
  "badge.titleVerified": "Someone checked this in person.",
  "badge.titleClaimed": "The place or a published source says so. Nobody has checked.",
  "badge.srVerified": " (verified)",
  "badge.srUnverified": " (unchecked)",

  "admin.notConfigured":
    "The Supabase project still needs creating and VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY setting. See README.",
  "admin.notConfiguredLead": "Admin not configured.",
  "admin.checking": "Checking session…",
  "admin.linkSentA": "We sent a link to",
  "admin.linkSentB": ". Open it on this same phone.",
  "admin.emailPlaceholder": "you@email.com",
  "admin.enter": "Sign in",
  "admin.notEditor": "isn't on the editors list.",
  "admin.signOut": "Sign out",
  "admin.addPlace": "+ Add place",

  "editor.dialogLabel": "Edit place",
  "editor.new": "New place",
  "editor.editing": "Editing",
  "editor.noName": "No name",
  "editor.basics": "The basics",
  "editor.name": "Name",
  "editor.type": "Type",
  "editor.where": "Where it is",
  "editor.geoPlaceholder": "Address or name, e.g. Orrego Luco 054",
  "editor.search": "Search",
  "editor.searching": "Searching…",
  "editor.geoNoResults": "No results inside Santiago. Try the address.",
  "editor.noStreet": "no street",
  "editor.geoHint": "Search the address — coordinates are never typed by hand.",
  "editor.scopeUnknown": "Nobody has checked",
  "editor.scopeAll": "Whole place",
  "editor.scopeSome": "Has options",
  "editor.scopeNone": "No",
  "editor.confUnverified": "Unchecked",
  "editor.confClaimed": "The place says so",
  "editor.confVerified": "I checked in person",
  "editor.sourcePlaceholder": "Source — URL, or “asked the owner”",
  "editor.notePlaceholder": "Detail: “separate fryer, shared counter”",
  "editor.sourcesAndCaveats": "Sources & caveats",
  "editor.sourcesLabel": "Sources (one per line)",
  "editor.caveatLabel": "Caveat (optional)",
  "editor.caveatPlaceholder": "E.g. two addresses are floating around",
  "editor.saveHint":
    "Missing: a name, a searched location, at least one source, and a source for every fact that isn't “unchecked”.",
  "editor.cancel": "Cancel",
  "editor.save": "Save",
  "editor.saving": "Saving…",
  "editor.verifiedBy": "Checked by {who}, {date}",
};

const STRINGS: Record<Lang, Record<keyof typeof ES, string>> = { es: ES, en: EN };

export type StringKey = keyof typeof ES;

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[lang][key] ?? STRINGS.es[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
  return s;
}

const STORAGE_KEY = "vitalmap.lang";

/** Persisted choice, else the browser's, else Spanish (this is a Santiago app). */
export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en")
    ? "en"
    : "es";
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}
