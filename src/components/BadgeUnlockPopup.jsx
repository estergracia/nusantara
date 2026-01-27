// src/components/BadgeUnlockPopup.jsx
import React, { useEffect, useMemo, useRef } from "react";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

function tierGlow(tier) {
  if (tier === "legendary") return { glow: 0.95, rays: 0.78, blur: 28 };
  if (tier === "gold") return { glow: 0.82, rays: 0.62, blur: 24 };
  if (tier === "silver") return { glow: 0.68, rays: 0.48, blur: 20 };
  return { glow: 0.55, rays: 0.38, blur: 18 };
}

export default function BadgeUnlockPopup({ badgeId, meta, onClose }) {
  const { level, is } = useUiLevelFirestore();

  const ui = useMemo(() => {
    if (is?.complex) return "complex";
    if (is?.medium) return "medium";
    return "simple";
  }, [is?.complex, is?.medium, level]);

  const label = meta?.label || "Badge Unlocked";
  const detail = meta?.detail || "";
  const iconEmoji = meta?.icon || "🏅";
  const iconUrl = meta?.iconUrl || "";
  const tier = meta?.tier || "bronze";

  const cardRef = useRef(null);

  useEffect(() => {
    cardRef.current?.focus?.();
  }, []);

  const g = tierGlow(tier);

  return (
    <div
      className={`bn-badge-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bn-badge-overlay--${ui}`}
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClose?.();
      }}
      aria-label="Badge unlocked popup"
    >
      <style>{`
        /* =========================================
           Overlay
           ========================================= */
        .bn-badge-overlay{
          background: rgba(0,0,0,.35);
          animation: bnFadeIn .18s ease-out both;
          backdrop-filter: blur(2px);
        }
        .bn-badge-overlay--simple{ background: rgba(0,0,0,.22); backdrop-filter: none; }
        .bn-badge-overlay--medium{ background: rgba(0,0,0,.26); backdrop-filter: blur(1px); }
        .bn-badge-overlay--complex{ background: rgba(0,0,0,.42); backdrop-filter: blur(2px); }

        @keyframes bnFadeIn{
          from{ opacity: 0; }
          to{ opacity: 1; }
        }

        /* =========================================
           Card (✅ SOLID + tidak ikut ui-card)
           ========================================= */
        .bn-badge-card{
          animation: bnPopIn .22s cubic-bezier(.2,.95,.2,1) both;
          will-change: transform, opacity;
          outline: none;

          /* ✅ solid */
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 22px;

          box-shadow: 0 18px 55px rgba(0,0,0,.30);

          /* padding dipindah ke sini */
          padding: 20px;
        }

        body[data-ui="medium"] .bn-badge-card{
          box-shadow: 0 22px 64px rgba(0,0,0,.28);
        }
        body[data-ui="complex"] .bn-badge-card{
          border-color: color-mix(in srgb, var(--border) 55%, rgba(255,215,128,.35));
          box-shadow:
            0 26px 70px rgba(0,0,0,.42),
            0 0 0 1px rgba(255,215,128,.10) inset;
        }

        @keyframes bnPopIn{
          from{ transform: translateY(10px) scale(.92); opacity: 0; }
          to{ transform: translateY(0) scale(1); opacity: 1; }
        }

        /* =========================================
           Hero (lebih besar & responsif)
           ========================================= */
        .bn-badge-hero{
          position: relative;
          width: 190px;
          height: 190px;
          margin: 0 auto;
          display: grid;
          place-items: center;
        }

        body[data-ui="simple"] .bn-badge-hero{ width: 200px; height: 200px; }

        /* =========================================
           Sparkle
           ========================================= */
        .bn-glow{
          position: absolute;
          inset: -22px;
          border-radius: 999px;
          filter: blur(var(--glow-blur));
          opacity: var(--glow-opacity);
          background: radial-gradient(circle at 50% 50%,
            rgba(255,255,255,.95) 0%,
            rgba(255,255,255,.60) 22%,
            rgba(255,255,255,.18) 48%,
            rgba(255,255,255,0) 72%
          );
          animation: bnPulse 1.6s ease-in-out infinite;
          pointer-events: none;
        }

        .bn-rays{
          position: absolute;
          inset: -30px;
          border-radius: 999px;
          opacity: var(--rays-opacity);
          background: conic-gradient(
            from 0deg,
            rgba(255,255,255,0),
            rgba(255,255,255,.40),
            rgba(255,255,255,0),
            rgba(255,255,255,.28),
            rgba(255,255,255,0),
            rgba(255,255,255,.46),
            rgba(255,255,255,0)
          );
          filter: blur(1px);
          animation: bnSpin 2.6s linear infinite;
          mask-image: radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 74%);
          pointer-events: none;
        }

        @keyframes bnSpin{
          from{ transform: rotate(0deg); }
          to{ transform: rotate(360deg); }
        }
        @keyframes bnPulse{
          0%,100%{ transform: scale(.98); opacity: var(--glow-opacity); }
          50%{ transform: scale(1.03); opacity: calc(var(--glow-opacity) * .86); }
        }

        /* ✅ Simple: sparkle OFF total */
        body[data-ui="simple"] .bn-glow,
        body[data-ui="simple"] .bn-rays{
          display: none !important;
          animation: none !important;
        }

        /* ✅ Medium: sparkle lebih halus */
        body[data-ui="medium"] .bn-rays{ opacity: calc(var(--rays-opacity) * .75); }
        body[data-ui="medium"] .bn-glow{ opacity: calc(var(--glow-opacity) * .80); }

        /* ✅ Complex: sedikit lebih kuat */
        body[data-ui="complex"] .bn-rays{ opacity: calc(var(--rays-opacity) * 1.05); }
        body[data-ui="complex"] .bn-glow{ opacity: calc(var(--glow-opacity) * 1.00); }

        /* =========================================
           Icon/Image (lebih besar)
           ========================================= */
        .bn-badge-img{
          width: 150px;
          height: 150px;
          object-fit: contain;
          z-index: 2;
          filter: drop-shadow(0 12px 20px rgba(0,0,0,.26));
        }

        .bn-badge-emoji{
          font-size: 78px;
          line-height: 1;
          z-index: 2;
          filter: drop-shadow(0 12px 20px rgba(0,0,0,.22));
        }

        @keyframes bnFloat{
          0%,100%{ transform: translateY(0) scale(1); }
          50%{ transform: translateY(-6px) scale(1.02); }
        }
        body[data-ui="complex"] .bn-badge-img,
        body[data-ui="complex"] .bn-badge-emoji{
          animation: bnFloat 1.8s ease-in-out infinite;
        }

        /* =========================================
           Text (lebih jelas)
           ========================================= */
        .bn-badge-title{
          margin-top: 10px;
          font-size: 22px;
          font-weight: 900;
          color: var(--text);
        }
        .bn-badge-detail{
          margin-top: 8px;
          font-size: 14px;
          color: var(--text);
          opacity: .90;
        }

        @media (prefers-reduced-motion: reduce){
          .bn-badge-overlay, .bn-badge-card, .bn-rays, .bn-glow,
          body[data-ui="complex"] .bn-badge-img,
          body[data-ui="complex"] .bn-badge-emoji{
            animation: none !important;
          }
        }
      `}</style>

      <div
        ref={cardRef}
        className="bn-badge-card"
        style={{
          width: "min(560px, 92vw)",
          textAlign: "center",
          cursor: "pointer",

          ["--glow-opacity"]: g.glow,
          ["--rays-opacity"]: g.rays,
          ["--glow-blur"]: `${g.blur}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="bn-badge-hero">
          <div className="bn-glow" />
          <div className="bn-rays" />

          {iconUrl ? (
            <img src={iconUrl} alt={label} className="bn-badge-img" />
          ) : (
            <div className="bn-badge-emoji" aria-hidden="true">
              {iconEmoji}
            </div>
          )}
        </div>

        <div className="bn-badge-title ui-title">{label}</div>
        {detail ? <div className="bn-badge-detail">{detail}</div> : null}

        <div className="mt-4 text-xs ui-muted" style={{ opacity: 0.9 }}>
          Tap untuk lanjut
        </div>
      </div>
    </div>
  );
}
