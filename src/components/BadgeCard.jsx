import React from "react";

export default function BadgeCard({
  badge,
  unlocked,
  uiLevel = "medium",
  progressText,
  onClick,
}) {
  const title = badge?.name || "Badge";
  const desc = unlocked
    ? badge?.description || ""
    : "Mainkan kuis dan cari tahu cara membukanya.";

  const iconSrc = unlocked ? badge?.iconUrl : badge?.lockedIconUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-listcard"
      data-locked={unlocked ? "0" : "1"}
      aria-label={`${title} - ${unlocked ? "Unlocked" : "Locked"}`}
      title={title}
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 rounded-2xl border overflow-hidden"
          style={{
            width: 96,
            height: 96,
            opacity: unlocked ? 1 : 0.72,
            filter: unlocked ? "none" : "grayscale(0.35)",
            background: "color-mix(in srgb, var(--surface-2) 85%, transparent)",
          }}
        >
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div style={{ width: "100%", height: "100%" }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="ui-title text-base font-extrabold">{title}</div>
            {unlocked ? (
              <span className="ui-chip">Unlocked</span>
            ) : (
              <span className="ui-chip">Locked</span>
            )}
          </div>

          {uiLevel !== "simple" ? (
            <div className="mt-1 text-sm ui-muted">{desc}</div>
          ) : null}

          {!unlocked && uiLevel !== "simple" && progressText ? (
            <div className="mt-2 text-xs font-extrabold ui-muted">
              Progress: {progressText}
            </div>
          ) : null}
        </div>

        <div className="ui-badge-chevron mt-1" aria-hidden="true">
          ›
        </div>
      </div>
    </button>
  );
}
