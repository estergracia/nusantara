export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    if (value === undefined) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const KEYS = {
  USER: "bn_user",
  STATS: "bn_stats",
  BADGES: "bn_badges",
  UI: "uiLevel",
};

// ✅ total level campaign (Easy+Normal+Hard) = 45
export const CAMPAIGN_TOTAL_LEVELS = 45;

export function defaultStats() {
  return {
    categoriesOpened: 0,
    learnOpened: 0,
    quizCompleted: 0,
    correctTotal: 0,
    perfectRuns: 0,
    quizUniqueCategories: [],
    lastPlayedAt: null,

    // lifetime
    attemptTotal: 0,
    sessionsPlayed: 0,
    streak: 0,
    bestStreak: 0,
    scoreTotal: 0,

    // ✅ campaign progress (0..45)
    globalLevel: 0,
    globalLevelMax: 0,

    // ✅ NEW: campaign per-mode (biar replay ga nambah)
    campaignByMode: { easy: 0, normal: 0, hard: 0 },

    // ✅ NEW: mode index berikutnya yang harus dimainkan
    // 0 = easy, 1 = normal, 2 = hard
    campaignStageIndex: 0,

    perfectByMode: { easy: 0, normal: 0, hard: 0 },

    timeSumByMode: { easy: 0, normal: 0, hard: 0 },
    timeCountByMode: { easy: 0, normal: 0, hard: 0 },
    avgTimeByMode: { easy: 0, normal: 0, hard: 0 },

    correctByMode: { easy: 0, normal: 0, hard: 0 },
    answeredByMode: { easy: 0, normal: 0, hard: 0 },
    accuracyByMode: { easy: 0, normal: 0, hard: 0 },

    avgTimeMs: 0,

    _meta: { dirty: false, updatedAtLocal: null },
  };
}

export function ensureStats() {
  const stats = getJSON(KEYS.STATS, null);
  if (stats) return stats;
  const fresh = defaultStats();
  setJSON(KEYS.STATS, fresh);
  return fresh;
}

export function ensureBadges() {
  const badges = getJSON(KEYS.BADGES, null);
  if (Array.isArray(badges)) return badges;
  const fresh = [];
  setJSON(KEYS.BADGES, fresh);
  return fresh;
}
