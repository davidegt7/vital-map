import { useMemo } from "react";
import { useStore } from "../store";
import { applyFilters } from "../lib/filters";
import { useT } from "../lib/useT";
import { ClaimBadge } from "./ClaimBadge";
import { AdSlot } from "./AdSlot";
import { CATEGORY_LABELS, DIET_KEYS } from "../types";

export function PlaceList() {
  const places = useStore((s) => s.places);
  const filters = useStore((s) => s.filters);
  const select = useStore((s) => s.select);
  const resetFilters = useStore((s) => s.resetFilters);
  const { t } = useT();
  const visible = useMemo(() => applyFilters(places, filters), [places, filters]);

  if (visible.length === 0) {
    return (
      <div className="list list--empty">
        <p>{t("list.emptyTitle")}</p>
        <p className="list__hint">
          {filters.verifiedOnly ? t("list.emptyVerified") : t("list.emptyHint")}
        </p>
        <button className="btn" onClick={resetFilters}>
          {t("list.clearFilters")}
        </button>
      </div>
    );
  }

  return (
    <div className="list">
      {visible.map((place, i) => (
        <div key={place.id}>
          <button className="card" onClick={() => select(place.id)}>
            <div className="card__head">
              <span className="card__cat" aria-hidden="true">
                {CATEGORY_LABELS[place.category].icon}
              </span>
              <div>
                <h3>{place.name}</h3>
                <p className="card__comuna">{place.comuna ?? place.city}</p>
              </div>
            </div>
            <div className="card__badges">
              {DIET_KEYS.map((key) => (
                <ClaimBadge key={key} dietKey={key} claim={place.diet[key]} />
              ))}
            </div>
            {place.items.length > 0 && (
              <p className="card__items">{place.items.slice(0, 4).join(" · ")}</p>
            )}
          </button>
          {/* One slot, a third of the way down — enough to be seen, not enough to be the product. */}
          {i === 2 && <AdSlot where="list" />}
        </div>
      ))}
    </div>
  );
}
