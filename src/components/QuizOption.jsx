// src/components/QuizOption.jsx
import React from "react";

export default function QuizOption({
  label,
  state = "idle",
  disabled = false,
  onClick,
  rightLabel = null,
  imgSrc = null,
  ui = "medium", // simple | medium | complex
}) {
  const isSimple = ui === "simple";

  // ✅ SIMPLE:
  // - sebelum answered: hanya idle/picked
  // - setelah answered (disabled): boleh tampil correct/wrong tipis
  const domState = isSimple
    ? disabled
      ? state // allow correct|wrong|picked|idle
      : state === "picked"
      ? "picked"
      : "idle"
    : state;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={["ui-option", disabled ? "opacity-70 cursor-not-allowed" : ""].join(" ")}
      data-state={domState}
      data-ui={ui}
      aria-disabled={disabled}
    >
      <style>{`
        /* =========================
           SIMPLE (exam): subtle highlight
           ========================= */

        /* ✅ tidak ada animasi / shake / pop */
        .ui-option[data-ui="simple"][disabled][data-state="wrong"],
        .ui-option[data-ui="simple"][disabled][data-state="correct"],
        .ui-option[data-ui="simple"][disabled][data-state="picked"]{
          animation:none !important;
          transform:none !important;
          will-change:auto !important;
        }

        /* ✅ SIMPLE: hijau tipis */
        .ui-option[data-ui="simple"][disabled][data-state="correct"]{
          background: color-mix(in srgb, var(--success) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--success) 22%, transparent);
          outline: none;
        }

        /* ✅ SIMPLE: merah tipis */
        .ui-option[data-ui="simple"][disabled][data-state="wrong"]{
          background: color-mix(in srgb, #ff3b30 10%, transparent);
          border: 1px solid color-mix(in srgb, #ff3b30 22%, transparent);
          outline: none;
        }

        /* ✅ SIMPLE: opsi yang dipilih (kalau masih picked) ditandai netral */
        .ui-option[data-ui="simple"][disabled][data-state="picked"]{
          outline: 2px solid color-mix(in srgb, var(--text) 22%, transparent);
          outline-offset: 2px;
          background: color-mix(in srgb, var(--surface-2) 78%, transparent);
        }

        /* =========================
           NON-SIMPLE: keep existing FX
           ========================= */

        .ui-option[data-ui="simple"][disabled][data-state="wrong"],
        .ui-option[data-ui="simple"][disabled][data-state="correct"]{
          /* safety: ensure no accidental styles leak */
        }

        /* ✅ Salah: shake 4–8px selama 200ms */
        .ui-option:not([data-ui="simple"])[disabled][data-state="wrong"]{
          animation: qoShake 200ms ease-in-out both;
          will-change: transform;
        }
        @keyframes qoShake{
          0%{transform:translateX(0)}
          15%{transform:translateX(-6px)}
          30%{transform:translateX(6px)}
          45%{transform:translateX(-5px)}
          60%{transform:translateX(5px)}
          75%{transform:translateX(-3px)}
          90%{transform:translateX(3px)}
          100%{transform:translateX(0)}
        }

        /* ✅ Benar: pop scale 1.0→1.06→1.0 selama 180ms */
        .ui-option:not([data-ui="simple"])[disabled][data-state="correct"]{
          animation: qoPop 180ms cubic-bezier(.2,.95,.2,1) both;
          will-change: transform;
        }
        @keyframes qoPop{
          0%{transform:scale(1)}
          50%{transform:scale(1.06)}
          100%{transform:scale(1)}
        }

        @media (prefers-reduced-motion: reduce){
          .ui-option[disabled][data-state="wrong"],
          .ui-option[disabled][data-state="correct"]{
            animation:none!important;
          }
        }
      `}</style>

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