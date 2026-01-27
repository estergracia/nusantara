// src/pages/Achievements.jsx
import React, { useMemo, useState } from "react";
import { BADGE_CATALOG } from "../utils/badgeCatalog.js";
import { useProgress } from "../hooks/useProgress.js";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

function getEarnedIds(badges) {
  if (Array.isArray(badges)) return badges;
  return badges?.earnedIds || badges?.ids || badges?.unlockedIds || badges?.nextEarnedIds || [];
}

function clampPct(n) {
  return Math.max(0, Math.min(100, n));
}

function BadgeRow({ x, onClick, showProgressBar }) {
  const b = x.badge;
  const iconSrc = x.unlocked ? b.iconUrl : b.lockedIconUrl;

  return (
    <button
      type="button"
      className="ui-card ui-card--pattern ui-card--pad w-full text-left bn-badgeRow bn-noselect"
      data-locked={x.unlocked ? "0" : "1"}
      onClick={onClick}
      style={{
        opacity: x.unlocked ? 1 : 0.92,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="bn-badgeIconWrap">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={b.name}
              className="bn-badgeIcon"
              draggable={false}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="ui-title font-extrabold">{b.name}</div>
          </div>

          <div className="mt-1 text-sm ui-muted">
            {x.unlocked ? b.description : "Mainkan kuis dan cari tahu cara membukanya."}
          </div>

          {!x.unlocked && x.progressText ? (
            <div className="mt-1 text-xs ui-muted" style={{ opacity: 0.9 }}>
              Progress: {x.progressText}
            </div>
          ) : null}

          {showProgressBar && !x.unlocked && x.progress && typeof x.progress.cur === "number" ? (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${clampPct(Math.round(Number(x.progress.cur ?? 0) * 100))}%`,
                    background: "var(--primary-bg)",
                    transition: "width .25s ease",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* ✅ panah dihapus */}
      </div>
    </button>
  );
}

export default function Achievements() {
  const { is } = useUiLevelFirestore();
  const { stats, badges } = useProgress();

  const earnedIds = useMemo(() => getEarnedIds(badges), [badges]);
  const unlockedSet = useMemo(() => new Set(earnedIds), [earnedIds]);

  const [tab, setTab] = useState("all");

  const items = useMemo(() => {
    const base = (BADGE_CATALOG || []).map((b) => {
      const ruleOk = typeof b.condition === "function" ? !!b.condition(stats, {}) : false;
      const unlocked = unlockedSet.has(b.id) && ruleOk;

      const prog = typeof b.progress === "function" ? b.progress(stats) : null;
      const progressText = prog?.text || "";

      return { badge: b, unlocked, progress: prog, progressText };
    });

    const tierOrder = { legendary: 0, gold: 1, silver: 2, bronze: 3 };
    base.sort((a, b) => {
      const au = Number(b.unlocked) - Number(a.unlocked);
      if (au !== 0) return au;

      const ta = tierOrder[a.badge?.tier] ?? 99;
      const tb = tierOrder[b.badge?.tier] ?? 99;
      if (ta !== tb) return ta - tb;

      return String(a.badge?.name || "").localeCompare(String(b.badge?.name || ""));
    });

    if (tab === "unlocked") return base.filter((x) => x.unlocked);
    if (tab === "locked") return base.filter((x) => !x.unlocked);
    return base;
  }, [stats, unlockedSet, tab]);

  const totalCount = BADGE_CATALOG?.length || 0;
  const unlockedCount = useMemo(() => items.filter((x) => x.unlocked).length, [items]);

  const pageClass = [
    "space-y-4 bn-achievements bn-noselect", // ✅ no-select untuk seluruh halaman
    is.complex ? "bn-achievements--complex" : "bn-achievements--medium",
  ].join(" ");

  // ✅ SIMPLE: grid, klik badge TIDAK buka popup
  if (is.simple) {
    return (
      <div className="space-y-4 bn-achievements bn-achievements--simple bn-noselect">
        <section className="ui-card ui-card--pattern p-6">
          <div className="ui-title text-2xl font-extrabold">Pencapaian</div>
          <div className="mt-1 text-sm ui-muted">
            {unlockedCount}/{totalCount} badge
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((x) => {
            const b = x.badge;
            const iconSrc = x.unlocked ? b.iconUrl : b.lockedIconUrl;

            return (
              <button
                type="button"
                key={b.id}
                className="ui-card ui-card--pattern p-3 flex flex-col items-center text-center bn-badgeGridItem bn-noselect"
                onClick={() => {}}
                style={{ opacity: x.unlocked ? 1 : 0.7 }}
              >
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={b.name}
                    className="bn-badgeGridIcon"
                    draggable={false}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : null}
                <div className="mt-2 text-[11px] font-extrabold ui-title line-clamp-2">{b.name}</div>
              </button>
            );
          })}
        </section>
      </div>
    );
  }

  // ✅ MEDIUM/COMPLEX: list, klik row TIDAK buka popup
  return (
    <div className={pageClass}>
      <section className="ui-card ui-card--pattern p-6">
        <div>
          <div className="ui-title text-2xl font-extrabold">Pencapaian</div>
          <div className="mt-1 text-sm ui-muted">
            {unlockedCount} / {totalCount} badge terbuka
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {items.map((x) => (
          <BadgeRow
            key={x.badge.id}
            x={x}
            onClick={() => {}}
            showProgressBar={Boolean(is.complex)}
          />
        ))}
      </section>
    </div>
  );
}
