import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { getJSON, setJSON, KEYS, defaultStats } from "./storage.js";

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

// ✅ localStorage key per user (biar tidak warisan)
function statsKey(uid) {
  return uid ? `${KEYS.STATS}:${uid}` : KEYS.STATS;
}
function badgesKey(uid) {
  return uid ? `${KEYS.BADGES}:${uid}` : KEYS.BADGES;
}

// --------- helpers normalize & deep merge ----------
function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function num(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}
function arr(v, fb = []) {
  return Array.isArray(v) ? v : fb;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const CAMPAIGN_TOTAL = 45;

/**
 * Normalize stats to latest schema without wiping user progress.
 */
function normalizeStats(input) {
  const defs = defaultStats();
  const s = isObj(input) ? input : {};

  const out = { ...defs, ...s };

  // primitives
  out.categoriesOpened = num(out.categoriesOpened);
  out.learnOpened = num(out.learnOpened);
  out.quizCompleted = num(out.quizCompleted);
  out.sessionsPlayed = num(out.sessionsPlayed);
  out.lastPlayedAt = out.lastPlayedAt ?? null;

  out.attemptTotal = num(out.attemptTotal);
  out.correctTotal = num(out.correctTotal);
  out.scoreTotal = num(out.scoreTotal);

  out.streak = num(out.streak);
  out.bestStreak = num(out.bestStreak);

  out.avgTimeMs = num(out.avgTimeMs);

  // ✅ campaign progress constraints
  const attemptCap = clamp(out.attemptTotal, 0, CAMPAIGN_TOTAL);

  out.globalLevel = clamp(num(out.globalLevel), 0, CAMPAIGN_TOTAL);
  out.globalLevelMax = clamp(num(out.globalLevelMax), 0, CAMPAIGN_TOTAL);

  out.globalLevel = Math.min(out.globalLevel, attemptCap);
  out.globalLevelMax = Math.min(out.globalLevelMax, attemptCap);

  if (!out.globalLevel && attemptCap > 0) out.globalLevel = attemptCap;
  if (!out.globalLevelMax && attemptCap > 0) out.globalLevelMax = attemptCap;

  // campaign state
  out.campaignStageIndex = num(out.campaignStageIndex);
  out.campaignByMode = {
    easy: 0,
    normal: 0,
    hard: 0,
    ...(isObj(out.campaignByMode) ? out.campaignByMode : {}),
  };
  for (const m of ["easy", "normal", "hard"]) {
    out.campaignByMode[m] = num(out.campaignByMode[m]);
  }

  out.quizUniqueCategories = arr(out.quizUniqueCategories);

  // nested objects (deep merge)
  out.perfectByMode = { ...defs.perfectByMode, ...(isObj(out.perfectByMode) ? out.perfectByMode : {}) };
  out.timeSumByMode = { ...defs.timeSumByMode, ...(isObj(out.timeSumByMode) ? out.timeSumByMode : {}) };
  out.timeCountByMode = { ...defs.timeCountByMode, ...(isObj(out.timeCountByMode) ? out.timeCountByMode : {}) };
  out.avgTimeByMode = { ...defs.avgTimeByMode, ...(isObj(out.avgTimeByMode) ? out.avgTimeByMode : {}) };

  out.correctByMode = { ...defs.correctByMode, ...(isObj(out.correctByMode) ? out.correctByMode : {}) };
  out.answeredByMode = { ...defs.answeredByMode, ...(isObj(out.answeredByMode) ? out.answeredByMode : {}) };
  out.accuracyByMode = { ...defs.accuracyByMode, ...(isObj(out.accuracyByMode) ? out.accuracyByMode : {}) };

  out.lastRunModeStats = isObj(out.lastRunModeStats) ? out.lastRunModeStats : {};
  out._meta = { ...defs._meta, ...(isObj(out._meta) ? out._meta : {}) };

  for (const m of ["easy", "normal", "hard"]) {
    out.perfectByMode[m] = num(out.perfectByMode[m]);
    out.timeSumByMode[m] = num(out.timeSumByMode[m]);
    out.timeCountByMode[m] = num(out.timeCountByMode[m]);
    out.avgTimeByMode[m] = num(out.avgTimeByMode[m]);

    out.correctByMode[m] = num(out.correctByMode[m]);
    out.answeredByMode[m] = num(out.answeredByMode[m]);
    out.accuracyByMode[m] = clamp(num(out.accuracyByMode[m]), 0, 1);
  }

  return out;
}

function deepMergeStats(base, incoming) {
  const a = normalizeStats(base);
  const b = normalizeStats(incoming);

  const out = { ...a, ...b };

  out.perfectByMode = { ...a.perfectByMode, ...b.perfectByMode };
  out.timeSumByMode = { ...a.timeSumByMode, ...b.timeSumByMode };
  out.timeCountByMode = { ...a.timeCountByMode, ...b.timeCountByMode };
  out.avgTimeByMode = { ...a.avgTimeByMode, ...b.avgTimeByMode };
  out.correctByMode = { ...a.correctByMode, ...b.correctByMode };
  out.answeredByMode = { ...a.answeredByMode, ...b.answeredByMode };
  out.accuracyByMode = { ...a.accuracyByMode, ...b.accuracyByMode };
  out.lastRunModeStats = { ...(a.lastRunModeStats || {}), ...(b.lastRunModeStats || {}) };

  out._meta = { ...(a._meta || {}), ...(b._meta || {}) };

  return normalizeStats(out);
}

export async function loadStats(uid) {
  if (!uid) {
    const localGuest = normalizeStats(getJSON(statsKey(null), defaultStats()));
    setJSON(statsKey(null), localGuest);
    return localGuest;
  }

  const local = normalizeStats(getJSON(statsKey(uid), defaultStats()));

  try {
    const ref = doc(db, "users", uid, "progress", "main");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const remoteRaw = snap.data() || {};
      const remote = normalizeStats(remoteRaw);

      const localDirty = !!local?._meta?.dirty;
      const merged = localDirty ? deepMergeStats(remote, local) : deepMergeStats(local, remote);
      merged._meta = { ...(merged._meta || {}), dirty: localDirty ? true : false };

      setJSON(statsKey(uid), merged);
      return merged;
    }

    // ✅ FIX: kalau remote belum ada, JANGAN overwrite local yang sudah punya progress
    const hasLocalProgress =
      num(local?.attemptTotal) > 0 ||
      num(local?.correctTotal) > 0 ||
      num(local?.scoreTotal) > 0 ||
      !!local?.lastPlayedAt ||
      !!local?._meta?.dirty;

    if (hasLocalProgress) {
      // optional: buat doc pertama kali supaya next load ada
      try {
        await setDoc(ref, { ...local, updatedAt: serverTimestamp() }, { merge: true });
      } catch {}
      setJSON(statsKey(uid), local);
      return local;
    }

    const empty = normalizeStats(defaultStats());
    setJSON(statsKey(uid), empty);
    return empty;
  } catch (e) {
    console.warn("loadStats Firestore failed, using local per-user:", e);
    setJSON(statsKey(uid), local);
    return local;
  }
}

export async function saveStats(uid, nextStats) {
  const normalized = normalizeStats(nextStats);

  const payload = {
    ...normalized,
    _meta: { ...(normalized._meta || {}), dirty: true, updatedAtLocal: Date.now() },
  };

  setJSON(statsKey(uid), payload);

  if (!uid) return payload;

  try {
    const ref = doc(db, "users", uid, "progress", "main");
    await setDoc(ref, { ...normalized, updatedAt: serverTimestamp() }, { merge: true });

    const clean = { ...payload, _meta: { ...(payload._meta || {}), dirty: false } };
    setJSON(statsKey(uid), clean);
    return clean;
  } catch (e) {
    console.warn("saveStats Firestore failed (kept local dirty):", e);
    return payload;
  }
}

export async function loadBadges(uid) {
  if (!uid) return safeArray(getJSON(badgesKey(null), []));

  const local = safeArray(getJSON(badgesKey(uid), []));

  try {
    const ref = doc(db, "users", uid, "progress", "badges");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const remote = snap.data()?.badgeIds;
      const merged = safeArray(remote);
      setJSON(badgesKey(uid), merged);
      return merged;
    }

    setJSON(badgesKey(uid), []);
    return [];
  } catch (e) {
    console.warn("loadBadges Firestore failed, using local per-user:", e);
    return local;
  }
}

export async function saveBadges(uid, badgeIds) {
  const list = safeArray(badgeIds);
  setJSON(badgesKey(uid), list);

  if (!uid) return list;

  try {
    const ref = doc(db, "users", uid, "progress", "badges");
    await setDoc(ref, { badgeIds: list, updatedAt: serverTimestamp() }, { merge: true });
    return list;
  } catch (e) {
    console.warn("saveBadges Firestore failed (kept local):", e);
    return list;
  }
}
