import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { defaultStats, getJSON, KEYS } from "../utils/storage.js";
import { loadBadges, loadStats, saveBadges, saveStats } from "../utils/progressStore.js";
import { BADGE_CATALOG } from "../utils/badgeCatalog.js";

const store = (() => {
  let state = {
    stats: defaultStats(),
    badges: [],
    uid: null,
    authLoading: true,
  };

  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn();
  }

  function set(partial) {
    state = { ...state, ...partial };
    emit();
  }

  function get() {
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { get, set, subscribe };
})();

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function computeBadgesByRules(stats) {
  const out = [];
  for (const b of BADGE_CATALOG) {
    const ok = typeof b.condition === "function" ? !!b.condition(stats, {}) : false;
    if (ok) out.push(b.id);
  }
  return out;
}

function sameSet(a, b) {
  const A = new Set(safeArray(a));
  const B = new Set(safeArray(b));
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}

function unionIds(a, b) {
  return Array.from(new Set([...safeArray(a), ...safeArray(b)].filter(Boolean)));
}

async function bootstrapFor(uid) {
  if (!uid) {
    const stats = getJSON(KEYS.STATS, defaultStats());
    const badges = safeArray(getJSON(KEYS.BADGES, []));
    store.set({ stats, badges, uid: null });
    return;
  }

  // ✅ FIX: jangan reset stats/badges ke default sebelum load selesai
  // cukup set uid agar tidak "warisan user" secara identitas, tapi data tetap tampil
  store.set({ uid });

  try {
    const [s, b] = await Promise.all([loadStats(uid), loadBadges(uid)]);
    const stats = s || defaultStats();
    const badgeIds = safeArray(b);

    // ✅ gabungkan badge tersimpan + badge yang valid byRules
    const byRules = computeBadgesByRules(stats);
    const finalIds = unionIds(badgeIds, byRules);

    store.set({ stats, badges: finalIds, uid });

    // simpan jika berubah (non-blocking)
    if (!sameSet(badgeIds, finalIds)) {
      Promise.resolve(saveBadges(uid, finalIds)).catch(() => {});
    }
  } catch (e) {
    // ✅ FIX: jangan memaksa default pada error (ini bikin "reset")
    console.warn("bootstrapFor failed:", e);
    // keep state yang lama agar UI tidak tiba-tiba 0
  }
}

export function useProgress() {
  const { currentUser, authLoading } = useAuth();
  const uid = currentUser?.uid || null;

  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);

  useEffect(() => {
    store.set({ authLoading });
    if (authLoading) return;
    bootstrapFor(uid);
  }, [authLoading, uid]);

  const updateStats = async (next) => {
    store.set({ stats: next });

    // ✅ FIX: kalau uid belum siap, jangan save ke Firestore (hindari nyangkut ke "guest")
    if (!uid) return next;

    const saved = await saveStats(uid, next);
    store.set({ stats: saved });

    // ✅ setelah stats berubah: tambahkan badge yg memenuhi rules sekarang,
    // tapi JANGAN pernah hapus badge yang sudah pernah unlock
    const byRules = computeBadgesByRules(saved);
    const now = safeArray(store.get().badges);
    const finalIds = unionIds(now, byRules);

    if (!sameSet(now, finalIds)) {
      store.set({ badges: finalIds });
      Promise.resolve(saveBadges(uid, finalIds)).catch(() => {});
    }

    return saved;
  };

  const updateBadges = async (nextIds) => {
    const ids = safeArray(nextIds);

    // ✅ permanen: gabungkan dengan badges yang sudah ada
    const now = safeArray(store.get().badges);
    const finalIds = unionIds(now, ids);

    store.set({ badges: finalIds });

    // ✅ FIX: kalau uid belum siap, jangan save ke Firestore
    if (!uid) return finalIds;

    const saved = await saveBadges(uid, finalIds);
    store.set({ badges: safeArray(saved) });
    return saved;
  };

  return useMemo(
    () => ({
      stats: snap.stats,
      badges: snap.badges,
      updateStats,
      updateBadges,
      uid: snap.uid,
      authLoading: snap.authLoading,
    }),
    [snap.stats, snap.badges, snap.uid, snap.authLoading]
  );
}
