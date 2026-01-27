// src/utils/badgeEngine.js
import { BADGE_CATALOG } from "./badgeCatalog.js";

export const BADGE_META = Object.fromEntries(
  BADGE_CATALOG.map((b) => [
    b.id,
    {
      label: b.name,
      detail: b.description,
      icon: b.icon || "🏅",
      iconUrl: b.iconUrl,
      tier: b.tier || "bronze",
    },
  ])
);

export function runBadgeEngine(stats, earnedIds = [], ctx = {}) {
  const earned = new Set(Array.isArray(earnedIds) ? earnedIds : []);
  const newlyUnlocked = [];

  for (const badge of BADGE_CATALOG) {
    const ok = typeof badge.condition === "function" ? !!badge.condition(stats, ctx) : false;
    if (!ok) continue;
    if (earned.has(badge.id)) continue;

    earned.add(badge.id);
    newlyUnlocked.push(badge.id);
  }

  return {
    newlyUnlocked,
    nextEarnedIds: Array.from(earned),
  };
}
