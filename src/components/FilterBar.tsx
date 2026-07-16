import { useMemo, useState } from "react";
import { useStore } from "../store";
import { activeFilterCount, allItems, type DietStrictness } from "../lib/filters";
import { CATEGORIES, CATEGORY_LABELS, DIET_KEYS, DIET_LABELS } from "../types";

/** off → some → all → off. One tap deepens, three taps clears. */
const NEXT: Record<DietStrictness, DietStrictness> = { off: "some", some: "all", all: "off" };

const STRICTNESS_HINT: Record<DietStrictness, string> = {
  off: "",
  some: "hay opciones",
  all: "100%",
};

export function FilterBar() {
  const { filters, setDiet, toggleCategory, setQuery, setVerifiedOnly, resetFilters, places } =
    useStore();
  const [showItems, setShowItems] = useState(false);
  const items = useMemo(() => allItems(places).slice(0, 24), [places]);
  const count = activeFilterCount(filters);

  return (
    <div className="filters">
      <div className="filters__search">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowItems(true)}
          placeholder="Buscar lugar, comuna o producto…"
          aria-label="Buscar"
        />
        {count > 0 && (
          <button className="filters__reset" onClick={resetFilters}>
            Limpiar ({count})
          </button>
        )}
      </div>

      {showItems && items.length > 0 && (
        <div className="filters__items">
          {items.map((item) => (
            <button
              key={item}
              className={`chip chip--item ${filters.query === item ? "is-on" : ""}`}
              onClick={() => setQuery(filters.query === item ? "" : item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <div className="filters__row" role="group" aria-label="Filtros de dieta">
        {DIET_KEYS.map((key) => {
          const value = filters.diet[key];
          return (
            <button
              key={key}
              className={`chip chip--diet is-${value}`}
              onClick={() => setDiet(key, NEXT[value])}
              aria-pressed={value !== "off"}
            >
              {DIET_LABELS[key].es}
              {value !== "off" && <span className="chip__hint">{STRICTNESS_HINT[value]}</span>}
            </button>
          );
        })}
      </div>

      <div className="filters__row" role="group" aria-label="Tipo de lugar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`chip chip--cat ${filters.categories.includes(cat) ? "is-on" : ""}`}
            onClick={() => toggleCategory(cat)}
            aria-pressed={filters.categories.includes(cat)}
          >
            <span aria-hidden="true">{CATEGORY_LABELS[cat].icon}</span> {CATEGORY_LABELS[cat].es}
          </button>
        ))}
      </div>

      <label className="filters__verified">
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
        />
        <span>
          Solo comprobado
          <small>Esconde lo que solo dice el local. Mapa mucho más chico, pero confiable.</small>
        </span>
      </label>
    </div>
  );
}
