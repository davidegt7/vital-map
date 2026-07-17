import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { activeFilterCount, itemCounts, type DietStrictness } from "../lib/filters";
import { ITEMS, WORLD_LABELS, itemsForWorld, worldsFor } from "../lib/items";
import { useT } from "../lib/useT";
import { CATEGORIES, CATEGORY_LABELS, DIET_KEYS, DIET_LABELS } from "../types";

/** off → some → all → off. One tap deepens, three taps clears. */
const NEXT: Record<DietStrictness, DietStrictness> = { off: "some", some: "all", all: "off" };

type Menu = "diet" | "category" | "item" | null;

export function FilterBar() {
  const {
    filters,
    setDiet,
    toggleCategory,
    toggleItem,
    setQuery,
    setVerifiedOnly,
    resetFilters,
    places,
  } = useStore();
  const { t, lang } = useT();
  const [open, setOpen] = useState<Menu>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const strictnessHint: Record<DietStrictness, string> = {
    off: "",
    some: t("strictness.some"),
    all: t("strictness.all"),
  };

  const count = activeFilterCount(filters);
  const dietCount =
    Object.values(filters.diet).filter((v) => v !== "off").length + (filters.verifiedOnly ? 1 : 0);
  const catCount = filters.categories.length;
  const itemCount = filters.items.length;

  // Which item worlds to show follows the chosen place types: chucrut is not a
  // restaurant question, brunch is not a butcher question.
  const worlds = useMemo(() => worldsFor(filters.categories), [filters.categories]);
  const counts = useMemo(
    () => itemCounts(places, filters, ITEMS.map((i) => i.id)),
    [places, filters],
  );

  const itemGroups = useMemo(() => {
    // A `both` item (café) qualifies for every world, so without deduping it
    // renders twice — and since both chips drive the same filter id, clicking
    // one lights up the other. Two chips, one state, looks like a bug. First
    // world wins.
    const seen = new Set<string>();
    return worlds.map((world) => {
      const list = itemsForWorld(world)
        .filter((i) => !seen.has(i.id))
        // Real options first: with most of the map untagged, alphabetical would
        // bury the few that work under a wall of zeros.
        .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
      list.forEach((i) => seen.add(i.id));
      return { world, items: list };
    });
  }, [worlds, counts]);

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
          onFocus={() => setOpen(null)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
        />
        {count > 0 && (
          <button className="filters__reset" onClick={resetFilters}>
            {t("filter.clear", { n: count })}
          </button>
        )}
      </div>

      <div className="filters__menus">
        <button
          className={`menu-btn ${open === "item" ? "is-open" : ""} ${itemCount ? "is-active" : ""}`}
          onClick={() => toggle("item")}
          aria-expanded={open === "item"}
          aria-controls="menu-item"
        >
          {t("menu.item")}
          {itemCount > 0 && <span className="menu-btn__count">{itemCount}</span>}
          <span className="menu-btn__caret" aria-hidden="true" />
        </button>

        <button
          className={`menu-btn ${open === "diet" ? "is-open" : ""} ${dietCount ? "is-active" : ""}`}
          onClick={() => toggle("diet")}
          aria-expanded={open === "diet"}
          aria-controls="menu-diet"
        >
          {t("menu.diet")}
          {dietCount > 0 && <span className="menu-btn__count">{dietCount}</span>}
          <span className="menu-btn__caret" aria-hidden="true" />
        </button>

        <button
          className={`menu-btn ${open === "category" ? "is-open" : ""} ${catCount ? "is-active" : ""}`}
          onClick={() => toggle("category")}
          aria-expanded={open === "category"}
          aria-controls="menu-category"
        >
          {t("menu.category")}
          {catCount > 0 && <span className="menu-btn__count">{catCount}</span>}
          <span className="menu-btn__caret" aria-hidden="true" />
        </button>
      </div>

      {open === "item" && (
        <div className="menu-panel menu-panel--scroll" id="menu-item">
          {itemGroups.map(({ world, items }) => (
            <div key={world} className="menu-panel__group">
              {itemGroups.length > 1 && (
                <h4 className="menu-panel__group-title">{WORLD_LABELS[world][lang]}</h4>
              )}
              <div className="menu-panel__chips">
                {items.map((item) => {
                  const n = counts.get(item.id) ?? 0;
                  const on = filters.items.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      className={`chip chip--item ${on ? "is-on" : ""} ${n === 0 ? "is-empty" : ""}`}
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={on}
                      title={n === 0 ? t("item.emptyTitle") : t("item.countTitle", { n })}
                    >
                      {item.label[lang]}
                      <span className="chip__n">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="menu-panel__hint">
            {t("item.hintA")} <strong>{t("menu.diet")}</strong> {t("item.hintB")}{" "}
            <strong>0</strong> {t("item.hintC")}
          </p>
        </div>
      )}

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
                  {DIET_LABELS[key][lang]}
                  {value !== "off" && <span className="chip__hint">{strictnessHint[value]}</span>}
                </button>
              );
            })}
          </div>
          {/* The tri-state is invisible until you know it's there. Say it once. */}
          <p className="menu-panel__hint">
            {t("diet.hintA")} <strong>{t("diet.hintOptions")}</strong>
            {t("diet.hintB")} <strong>{t("diet.hint100")}</strong>.
          </p>

          <label className="menu-panel__verified">
            <input
              type="checkbox"
              checked={filters.verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>
              {t("verified.label")}
              <small>{t("verified.desc")}</small>
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
                {CATEGORY_LABELS[cat][lang]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
