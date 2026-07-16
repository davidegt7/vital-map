import type { Claim, DietKey } from "../types";
import { DIET_LABELS } from "../types";

/**
 * Splits the two axes across two channels so the badge stays short enough for a
 * list row: the *text* carries scope, the *colour and mark* carry confidence.
 *
 * Text is "<label> · 100%" or "<label> · opciones" rather than a sentence,
 * because a sentence template can't fit all four labels grammatically —
 * "Dice opciones orgánico" is not Spanish. Composing on the label instead of
 * around it works for every axis.
 */
function scopeText(claim: Claim, label: string): string | null {
  switch (claim.scope) {
    case "all":
      return `${label} · 100%`;
    case "some":
      return `${label} · opciones`;
    case "none":
      return `Sin ${label.toLowerCase()}`;
    default:
      return null;
  }
}

const CONFIDENCE_TITLE: Record<string, string> = {
  verified: "Alguien lo comprobó en terreno.",
  claimed: "Lo dice el local o una fuente publicada. Nadie lo ha comprobado.",
};

export function ClaimBadge({ dietKey, claim }: { dietKey: DietKey; claim: Claim }) {
  if (claim.scope === "unknown" || claim.confidence === "unverified") return null;

  const text = scopeText(claim, DIET_LABELS[dietKey].es);
  if (!text) return null;

  const tone = claim.scope === "none" ? "no" : claim.confidence;

  return (
    <span
      className={`badge badge--${tone}`}
      title={[CONFIDENCE_TITLE[claim.confidence], claim.note].filter(Boolean).join(" ")}
    >
      {text}
      <span className="badge__mark" aria-hidden="true">
        {claim.confidence === "verified" ? "✓" : "?"}
      </span>
      <span className="sr-only">
        {claim.confidence === "verified" ? " (comprobado)" : " (sin comprobar)"}
      </span>
    </span>
  );
}

export function ClaimRow({ dietKey, claim }: { dietKey: DietKey; claim: Claim }) {
  const label = DIET_LABELS[dietKey].es;

  const status = (() => {
    if (claim.scope === "unknown") return { text: "Nadie ha comprobado", tone: "unknown" };
    if (claim.scope === "none") return { text: "No", tone: "no" };
    const scope = claim.scope === "all" ? "Todo el local" : "Hay opciones";
    const conf =
      claim.confidence === "verified"
        ? "comprobado en terreno"
        : claim.confidence === "claimed"
          ? "lo dice el local"
          : "sin comprobar";
    return { text: `${scope} — ${conf}`, tone: claim.confidence };
  })();

  return (
    <div className="claim-row">
      <div className="claim-row__head">
        <span className="claim-row__label">{label}</span>
        <span className={`claim-row__status claim-row__status--${status.tone}`}>{status.text}</span>
      </div>
      {claim.note && <p className="claim-row__note">{claim.note}</p>}
      {claim.scope === "unknown" ? (
        <p className="claim-row__gap">¿Sabes la respuesta? Esto es justo lo que falta.</p>
      ) : (
        claim.source && (
          <p className="claim-row__source">
            Fuente:{" "}
            {claim.source.startsWith("http") ? (
              <a href={claim.source} target="_blank" rel="noopener noreferrer">
                {new URL(claim.source).hostname.replace(/^www\./, "")}
              </a>
            ) : (
              claim.source
            )}
            {claim.checkedAt && ` · ${claim.checkedAt}`}
          </p>
        )
      )}
    </div>
  );
}
