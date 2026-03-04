// src/components/BadgeUnlockPopup.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { playSfx } from "../utils/sfx.js";

function tierGlow(tier) {
  if (tier === "legendary") return { glow: 0.95, rays: 0.78, blur: 28 };
  if (tier === "gold") return { glow: 0.82, rays: 0.62, blur: 24 };
  if (tier === "silver") return { glow: 0.68, rays: 0.48, blur: 20 };
  return { glow: 0.55, rays: 0.38, blur: 18 };
}

// cache global preload status agar badge image tidak “ulang lambat”
const _badgeImgCache = new Map(); // url -> "ready" | "error"

export default function BadgeUnlockPopup({ badgeId, meta, onClose }) {
  const { level, is } = useUiLevelFirestore();
  const cardRef = useRef(null);

  const [imgReady, setImgReady] = useState(false);

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
  const g = tierGlow(tier);

  useEffect(() => {
    setImgReady(false);

    if (!iconUrl) return;

    const cached = _badgeImgCache.get(iconUrl);
    if (cached === "ready") {
      setImgReady(true);
      return;
    }
    if (cached === "error") {
      setImgReady(false);
      return;
    }

    let alive = true;
    const img = new Image();

    img.onload = () => {
      _badgeImgCache.set(iconUrl, "ready");
      alive && setImgReady(true);
    };
    img.onerror = () => {
      _badgeImgCache.set(iconUrl, "error");
      alive && setImgReady(false);
    };

    img.src = iconUrl;

    return () => {
      alive = false;
    };
  }, [iconUrl]);

  useEffect(() => {
    cardRef.current?.focus?.();
  }, []);

  const playedRef = useRef(false);
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

    try {
      playSfx("unlock");
    } catch {}
  }, []);

  return (
    <div
      className={`bn-badge-overlay bn-badge-overlay--${ui} bn-badge-scope`}
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="Badge unlocked popup"
    >
      <style>{`
        .bn-badge-scope{
          isolation:isolate;
          contain:layout paint;
        }

        /* ✅ SUPER CEPAT: overlay fade 80ms, tanpa blur (blur sering bikin render berat) */
        .bn-badge-overlay{
          position:fixed;
          inset:0;
          z-index:9999;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:16px;
          background:rgba(0,0,0,.35);
          animation:bnFadeInFast .08s ease-out both;
          will-change:opacity;
        }
        .bn-badge-overlay--simple{ background:rgba(0,0,0,.22); }
        .bn-badge-overlay--medium{ background:rgba(0,0,0,.26); }
        .bn-badge-overlay--complex{ background:rgba(0,0,0,.42); }

        @keyframes bnFadeInFast{
          from{opacity:0}
          to{opacity:1}
        }

        /* ✅ pop card 120ms */
        .bn-badge-card{
          animation:bnPopInFast .12s cubic-bezier(.2,.95,.2,1) both;
          will-change:transform,opacity;
          outline:none;
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:22px;
          box-shadow:0 18px 55px rgba(0,0,0,.30);
          padding:20px;
          width:min(560px,92vw);
          text-align:center;
          cursor:pointer;
          transform: translateZ(0);
        }

        @keyframes bnPopInFast{
          from{transform:translateY(6px) scale(.975);opacity:0}
          to{transform:translateY(0) scale(1);opacity:1}
        }

        .bn-badge-hero{
          position:relative;
          width:190px;
          height:190px;
          margin:0 auto;
          display:grid;
          place-items:center;
        }

        .bn-glow{
          position:absolute;
          inset:-22px;
          border-radius:999px;
          filter:blur(var(--glow-blur));
          opacity:var(--glow-opacity);
          background:radial-gradient(circle at 50% 50%,
            rgba(255,255,255,.95) 0%,
            rgba(255,255,255,.60) 22%,
            rgba(255,255,255,.18) 48%,
            rgba(255,255,255,0) 72%);
          animation:bnPulse 1.6s ease-in-out infinite;
          pointer-events:none;
        }

        .bn-rays{
          position:absolute;
          inset:-30px;
          border-radius:999px;
          opacity:var(--rays-opacity);
          background:conic-gradient(
            from 0deg,
            rgba(255,255,255,0),
            rgba(255,255,255,.40),
            rgba(255,255,255,0),
            rgba(255,255,255,.28),
            rgba(255,255,255,0),
            rgba(255,255,255,.46),
            rgba(255,255,255,0)
          );
          filter:blur(1px);
          animation:bnSpin 2.6s linear infinite;
          mask-image:radial-gradient(circle, #000 58%, transparent 74%);
          pointer-events:none;
        }

        @keyframes bnSpin{to{transform:rotate(360deg)}}
        @keyframes bnPulse{
          0%,100%{transform:scale(.985);opacity:var(--glow-opacity)}
          50%{transform:scale(1.02);opacity:calc(var(--glow-opacity)*.86)}
        }

        body[data-ui="simple"] .bn-glow,
        body[data-ui="simple"] .bn-rays{
          display:none!important;
          animation:none!important;
        }

        .bn-badge-img{
          width:150px;
          height:150px;
          object-fit:contain;
          z-index:2;
          filter:drop-shadow(0 12px 20px rgba(0,0,0,.26));
        }

        .bn-badge-emoji{
          font-size:78px;
          z-index:2;
          filter:drop-shadow(0 12px 20px rgba(0,0,0,.22));
        }

        @keyframes bnFloat{
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-6px) scale(1.02)}
        }
        body[data-ui="complex"] .bn-badge-img,
        body[data-ui="complex"] .bn-badge-emoji{
          animation:bnFloat 1.8s ease-in-out infinite;
        }

        .bn-badge-title{
          margin-top:10px;
          font-size:22px;
          font-weight:900;
          color:var(--text);
        }
        .bn-badge-detail{
          margin-top:8px;
          font-size:14px;
          color:var(--text);
          opacity:.9;
        }

        @media (prefers-reduced-motion:reduce){
          *{animation:none!important}
        }
      `}</style>

      <div
        ref={cardRef}
        className="bn-badge-card"
        style={{
          ["--glow-opacity"]: g.glow,
          ["--rays-opacity"]: g.rays,
          ["--glow-blur"]: `${g.blur}px`,
        }}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
      >
        <div className="bn-badge-hero">
          <div className="bn-glow" />
          <div className="bn-rays" />

          {iconUrl && imgReady ? (
            <img
              key={iconUrl}
              src={iconUrl}
              alt={label}
              className="bn-badge-img"
              decoding="async"
            />
          ) : (
            <div className="bn-badge-emoji" aria-hidden="true">
              {iconEmoji}
            </div>
          )}
        </div>

        <div className="bn-badge-title ui-title">{label}</div>
        {detail && <div className="bn-badge-detail">{detail}</div>}

        <div className="mt-4 text-xs ui-muted" style={{ opacity: 0.9 }}>
          Tap untuk lanjut
        </div>
      </div>
    </div>
  );
}
