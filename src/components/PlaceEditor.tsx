import { useState } from "react";
import { useStore } from "../store";
import { geocode, type GeocodeHit } from "../lib/geocode";
import { ITEMS } from "../lib/items";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DIET_KEYS,
  DIET_LABELS,
  UNKNOWN_CLAIM,
  type Claim,
  type ClaimConfidence,
  type ClaimScope,
  type Place,
} from "../types";

const SCOPE_LABELS: Record<ClaimScope, string> = {
  unknown: "Nadie ha comprobado",
  all: "Todo el local",
  some: "Hay opciones",
  none: "No",
};

const CONFIDENCE_LABELS: Record<ClaimConfidence, string> = {
  unverified: "Sin comprobar",
  claimed: "Lo dice el local",
  verified: "Lo comprobé en terreno",
};

const blankPlace = (): Place => ({
  id: "",
  name: "",
  category: "restaurant",
  lat: 0,
  lng: 0,
  city: "Santiago",
  items: [],
  diet: {
    glutenFree: { ...UNKNOWN_CLAIM },
    seedOilFree: { ...UNKNOWN_CLAIM },
    sugarFree: { ...UNKNOWN_CLAIM },
    organic: { ...UNKNOWN_CLAIM },
  },
  sources: [],
  addedAt: new Date().toISOString().slice(0, 10),
});

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

export function PlaceEditor() {
  const editing = useStore((s) => s.editing);
  const setEditing = useStore((s) => s.setEditing);
  const persistPlace = useStore((s) => s.persistPlace);
  const session = useStore((s) => s.session);

  const isNew = editing === "new";
  const [place, setPlace] = useState<Place>(() =>
    isNew ? blankPlace() : { ...(editing as Place) },
  );
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeocodeHit[] | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  if (!editing) return null;

  const patch = (p: Partial<Place>) => setPlace((cur) => ({ ...cur, ...p }));
  const patchClaim = (key: (typeof DIET_KEYS)[number], c: Partial<Claim>) =>
    setPlace((cur) => ({ ...cur, diet: { ...cur.diet, [key]: { ...cur.diet[key], ...c } } }));

  const runGeocode = async () => {
    setGeoBusy(true);
    setGeoErr(null);
    setHits(null);
    try {
      const found = await geocode(q || place.name);
      if (!found.length) setGeoErr("Sin resultados dentro de Santiago. Prueba con la dirección.");
      setHits(found);
    } catch (err) {
      setGeoErr(err instanceof Error ? err.message : String(err));
    } finally {
      setGeoBusy(false);
    }
  };

  const pickHit = (h: GeocodeHit) => {
    patch({
      lat: h.lat,
      lng: h.lng,
      address: h.address ?? place.address,
      comuna: h.comuna ?? place.comuna,
      sources: place.sources.includes(h.osm) ? place.sources : [...place.sources, h.osm],
    });
    setHits(null);
  };

  /**
   * Marking something verified stamps who and when into the claim's own source.
   * The Claim model already carries provenance, so attribution needs no new
   * field — and "verified" with nobody's name on it is the exact record this
   * whole app exists to not produce.
   */
  const setConfidence = (key: (typeof DIET_KEYS)[number], confidence: ClaimConfidence) => {
    const today = new Date().toISOString().slice(0, 10);
    const who = session?.user?.email ?? "editor";
    const cur = place.diet[key];
    const autoSource =
      confidence === "verified" && !cur.source?.startsWith("Comprobado por")
        ? `Comprobado por ${who}, ${today}`
        : cur.source;
    patchClaim(key, { confidence, source: autoSource, checkedAt: today });
  };

  const canSave =
    place.name.trim().length > 1 &&
    place.lat !== 0 &&
    place.lng !== 0 &&
    place.sources.length > 0 &&
    // Mirrors the DB constraint so the failure is a disabled button with a
    // reason, not a rejected write with a Postgres error.
    DIET_KEYS.every(
      (k) => place.diet[k].confidence === "unverified" || Boolean(place.diet[k].source?.trim()),
    );

  const save = async () => {
    setSaving(true);
    setSaveErr(null);
    const final: Place = {
      ...place,
      id: place.id || `cur_${slug(place.name)}`,
      name: place.name.trim(),
    };
    const { error } = await persistPlace(final);
    setSaving(false);
    if (error) setSaveErr(error);
  };

  return (
    <div className="sheet sheet--editor" role="dialog" aria-label="Editar lugar">
      <button className="sheet__close" onClick={() => setEditing(null)} aria-label="Cerrar">
        ✕
      </button>

      <header className="sheet__head">
        <span className="sheet__cat">{isNew ? "Nuevo lugar" : "Editando"}</span>
        <h2>{place.name || "Sin nombre"}</h2>
      </header>

      <section className="sheet__section">
        <h3>Lo básico</h3>
        <label className="field">
          <span>Nombre</span>
          <input value={place.name} onChange={(e) => patch({ name: e.target.value })} />
        </label>
        <label className="field">
          <span>Tipo</span>
          <select
            value={place.category}
            onChange={(e) => patch({ category: e.target.value as Place["category"] })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c].icon} {CATEGORY_LABELS[c].es}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="sheet__section">
        <h3>Dónde queda</h3>
        {/* No lat/lng inputs, deliberately. A typo'd coordinate looks identical
            to a real one and sends someone to the wrong street. */}
        <div className="geo">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Dirección o nombre, ej: Orrego Luco 054"
            onKeyDown={(e) => e.key === "Enter" && runGeocode()}
          />
          <button className="btn" onClick={runGeocode} disabled={geoBusy || !(q || place.name)}>
            {geoBusy ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {geoErr && <p className="field__err">{geoErr}</p>}
        {hits?.map((h) => (
          <button key={h.osm} className="geo-hit" onClick={() => pickHit(h)}>
            {h.display}
          </button>
        ))}
        {place.lat !== 0 ? (
          <p className="geo-ok">
            📍 {place.address ?? "sin calle"}
            {place.comuna && `, ${place.comuna}`}
            <br />
            <small>
              {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
            </small>
          </p>
        ) : (
          <p className="field__hint">Busca la dirección — las coordenadas no se escriben a mano.</p>
        )}
      </section>

      <section className="sheet__section">
        <h3>Qué encuentras</h3>
        <div className="menu-panel__chips">
          {ITEMS.map((item) => {
            const on = place.items.some((i) => i.toLowerCase() === item.label.es.toLowerCase());
            return (
              <button
                key={item.id}
                className={`chip chip--item ${on ? "is-on" : ""}`}
                onClick={() =>
                  patch({
                    items: on
                      ? place.items.filter((i) => i.toLowerCase() !== item.label.es.toLowerCase())
                      : [...place.items, item.label.es],
                  })
                }
              >
                {item.label.es}
              </button>
            );
          })}
        </div>
      </section>

      <section className="sheet__section">
        <h3>Lo que sabemos</h3>
        {DIET_KEYS.map((key) => {
          const claim = place.diet[key];
          return (
            <div key={key} className="claim-edit">
              <strong>{DIET_LABELS[key].es}</strong>
              <div className="claim-edit__row">
                <select
                  value={claim.scope}
                  onChange={(e) => patchClaim(key, { scope: e.target.value as ClaimScope })}
                >
                  {(Object.keys(SCOPE_LABELS) as ClaimScope[]).map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </option>
                  ))}
                </select>
                <select
                  value={claim.confidence}
                  onChange={(e) => setConfidence(key, e.target.value as ClaimConfidence)}
                  disabled={claim.scope === "unknown"}
                >
                  {(Object.keys(CONFIDENCE_LABELS) as ClaimConfidence[]).map((c) => (
                    <option key={c} value={c}>
                      {CONFIDENCE_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {claim.confidence !== "unverified" && (
                <input
                  className="claim-edit__source"
                  value={claim.source ?? ""}
                  onChange={(e) => patchClaim(key, { source: e.target.value })}
                  placeholder="Fuente — URL, o «pregunté al dueño»"
                />
              )}
              {claim.scope !== "unknown" && (
                <input
                  className="claim-edit__note"
                  value={claim.note ?? ""}
                  onChange={(e) => patchClaim(key, { note: e.target.value })}
                  placeholder="Detalle: «freidora aparte, mesón compartido»"
                />
              )}
            </div>
          );
        })}
      </section>

      <section className="sheet__section">
        <h3>Fuentes y avisos</h3>
        <label className="field">
          <span>Fuentes (una por línea)</span>
          <textarea
            rows={2}
            value={place.sources.join("\n")}
            onChange={(e) =>
              patch({ sources: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="https://…"
          />
        </label>
        <label className="field">
          <span>Aviso (opcional)</span>
          <input
            value={place.caveat ?? ""}
            onChange={(e) => patch({ caveat: e.target.value || undefined })}
            placeholder="Ej: hay dos direcciones dando vuelta"
          />
        </label>
      </section>

      {saveErr && <p className="field__err">{saveErr}</p>}
      {!canSave && (
        <p className="field__hint">
          Falta: nombre, ubicación buscada, al menos una fuente, y una fuente por cada dato que no
          esté «sin comprobar».
        </p>
      )}

      <div className="editor__actions">
        <button className="btn" onClick={() => setEditing(null)}>
          Cancelar
        </button>
        <button className="btn btn--primary" onClick={save} disabled={!canSave || saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
