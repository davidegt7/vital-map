import { useEffect, useMemo, useRef, useState } from "react";
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

type Menu = "diet" | "category" | null;

export function FilterBar() {
  const { filters, setDiet, toggleCategory, setQuery, setVerifiedOnly, resetFilters, places } =
    useStore();
  const [open, setOpen] = useState<Menu>(null);
  const [showItems, setShowItems] = useState(false);
  const items = useMemo(() => allItems(places).slice(0, 24), [places]);
  const rootRef = useRef<HTMLDivElement>(null);

  const count = activeFilterCount(filters);
  // Verified-only lives in the diet menu, so it has to count toward that menu's
  // badge — otherwise switching it on collapses the menu and leaves no trace
  // that a filter is silently narrowing the map.
  const dietCount =
    Object.values(filters.diet).filter((v) => v !== "off").length + (filters.verifiedOnly ? 1 : 0);
  const catCount = filters.categories.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (menu: Exclude<Menu, null>) => setOpen((cur) => (cur === menu ? null : menu));

  return (
    <div className="filters" ref={rootRef}>
      <div className="filters__search">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setShowItems(true);
            setOpen(null);
          }}
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

      <div className="filters__menus">
        <button
          className={`menu-btn ${open === "diet" ? "is-open" : ""} ${dietCount ? "is-active" : ""}`}
          onClick={() => toggle("diet")}
          aria-expanded={open === "diet"}
          aria-controls="menu-diet"
        >
          Características
          {dietCount > 0 && <span className="menu-btn__count">{dietCount}</span>}
          <span className="menu-btn__caret" aria-hidden="true" />
        </button>

        <button
          className={`menu-btn ${open === "category" ? "is-open" : ""} ${catCount ? "is-active" : ""}`}
          onClick={() => toggle("category")}
          aria-expanded={open === "category"}
          aria-controls="menu-category"
        >
          Tipo de lugar
          {catCount > 0 && <span className="menu-btn__count">{catCount}</span>}
          <span className="menu-btn__caret" aria-hidden="true" />
        </button>
      </div>

      {open === "diet" && (
        <div className="menu-panel" id="menu-diet">
          <div className="menu-panel__chips">
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
          {/* The tri-state is invisible until you know it's there. Say it once. */}
          <p className="menu-panel__hint">
            Toca una vez para <strong>hay opciones</strong>, otra vez para <strong>100%</strong>.
          </p>

          <label className="menu-panel__verified">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>
              Solo comprobado
              <small>
                Esconde lo que solo dice el local. Mapa mucho más chico, pero confiable.
              </small>
            </span>
          </label>
        </div>
      )}

      {open === "category" && (
        <div className="menu-panel" id="menu-category">
          <div className="menu-panel__chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`chip chip--cat ${filters.categories.includes(cat) ? "is-on" : ""}`}
                onClick={() => toggleCategory(cat)}
                aria-pressed={filters.categories.includes(cat)}
              >
                <span aria-hidden="true">{CATEGORY_LABELS[cat].icon}</span>{" "}
                {CATEGORY_LABELS[cat].es}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
