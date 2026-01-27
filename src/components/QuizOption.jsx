import React from "react";

export default function QuizOption({
  label,
  state = "idle",
  disabled = false,
  onClick,
  rightLabel = null,
  imgSrc = null
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={["ui-option", disabled ? "opacity-70 cursor-not-allowed" : ""].join(" ")}
      data-state={state}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {imgSrc ? (
            <div className="ui-optionimg">
              <img src={imgSrc} alt={label} />
            </div>
          ) : null}
          <span className="truncate">{label}</span>
        </div>

        {rightLabel ? <span className="text-xs font-extrabold ui-muted">{rightLabel}</span> : null}
      </div>
    </button>
  );
}
