import React, { useMemo } from "react";
import ProgressPill from "./ProgressPill.jsx";

// ✅ mapping: id dari routes.js -> nama file di public/images/categories/
const ICON_FILE_BY_ID = {
  "iconic-animals": "hewan-ikonik.png",
  "traditional-houses": "rumah-adat.png",
  "traditional-clothes": "pakaian-adat.png",
  "traditional-dances": "tarian-daerah.png",
  "traditional-instruments": "alat-musik.png",
  "traditional-weapons": "senjata-daerah.png",
  "traditional-foods": "makanan-khas.png",
};

function getIconSrc(id) {
  const file = ICON_FILE_BY_ID[id];
  if (!file) return null;
  const base = import.meta.env.BASE_URL || "/";
  return `${base}images/categories/${file}`;
}

export default function CategoryCard({
  id,
  title,
  icon,
  shortDesc,
  progressText,
  onClick,
  uiLevel = "medium",
}) {
  const isSimple = uiLevel === "simple";
  const isComplex = uiLevel === "complex";

  const imgSrc = useMemo(() => getIconSrc(id), [id]);

  return (
    <button
      type="button"
      onClick={onClick}
      data-ui={uiLevel}
      className={[
        "ui-card ui-card--pattern w-full p-4 text-left transition active:translate-y-[2px]",
        isComplex ? "catcard--complex" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {/* ✅ Simple: hilangkan icon */}
        {!isSimple ? (
          <div
            className={[
              "ui-icon-tile cat-iconTile shrink-0 flex items-center justify-center overflow-hidden",
              isComplex ? "catcard-iconFx" : "",
            ].join(" ")}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt=""
                className={[
                  "cat-iconImg object-contain select-none pointer-events-none",
                  isComplex ? "catcard-iconImg" : "",
                ].join(" ")}
                loading="lazy"
                draggable="false"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "inline-flex";
                }}
              />
            ) : null}

            <span
              className="text-2xl"
              style={{ display: imgSrc ? "none" : "inline-flex" }}
              aria-hidden="true"
            >
              {icon}
            </span>
          </div>

        ) : null}

        <div className="min-w-0 flex-1">
          <div className="ui-title text-lg font-bold leading-snug">{title}</div>
          <div className="mt-1 text-sm ui-muted">
            {isSimple ? "Tap to open" : shortDesc}
          </div>

          {progressText && !isSimple ? (
            <div className="mt-3">
              <ProgressPill text={progressText} />
            </div>
          ) : null}
        </div>

        <div className="ui-muted mt-1 text-lg">›</div>
      </div>
    </button>
  );
}
