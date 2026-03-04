// src/utils/telemetry.js
import { supabase } from "../lib/supabase.js";
import { getAuth } from "firebase/auth";
import { getJSON } from "../utils/storage.js";

const auth = getAuth();
const STORAGE_KEY = "uiLevel";

const MODE_MAP = {
  simple: "simple",
  medium: "medium",
  complex: "complex",
};

const QUIZ_MODE_TO_UI_MODE = {
  easy: "simple",
  normal: "medium",
  hard: "complex",
};

const TICK_EVERY_MS = 10_000;

const Telemetry = (() => {
  let _firebaseUid = null;
  let _mode = null;
  let _lastTickMs = 0;
  let _tickTimer = null;

  function normalizeMode(mode) {
    const m = String(mode || "").trim().toLowerCase();
    if (!m) return null;
    if (MODE_MAP[m]) return MODE_MAP[m];
    if (QUIZ_MODE_TO_UI_MODE[m]) return QUIZ_MODE_TO_UI_MODE[m];
    return null;
  }

  function inferModeFromUrl() {
    try {
      if (typeof window === "undefined") return null;
      const sp = new URLSearchParams(window.location.search || "");
      const cand = sp.get("ui") || sp.get("level") || sp.get("mode");
      return normalizeMode(cand);
    } catch {
      return null;
    }
  }

  function getUidFromAuth() {
    try {
      return auth?.currentUser?.uid || null;
    } catch {
      return null;
    }
  }

  function getDefaultMode() {
    const fromStorage = normalizeMode(getJSON(STORAGE_KEY, null));
    return fromStorage || inferModeFromUrl() || "medium";
  }

  async function ensureReady() {
    const uid = _firebaseUid || getUidFromAuth();
    if (!uid) return false;

    _firebaseUid = uid;
    _mode = _mode || getDefaultMode();
    return true;
  }

  async function rpcUpdate(payload) {
    const { error } = await supabase.rpc("telemetry_update_user_mode", payload);
    if (error) console.error("❌ telemetry_update_user_mode failed:", error);
  }

  async function startSession({ uid, mode }) {
    const safeUid = uid || getUidFromAuth();
    const mappedMode = normalizeMode(mode) || getDefaultMode();

    if (!safeUid) {
      console.warn("⚠️ Telemetry.startSession missing uid (auth not ready?)");
      return;
    }
    if (!mappedMode || !MODE_MAP[mappedMode]) {
      console.error("❌ Invalid telemetry UI mode:", mode);
      return;
    }

    _firebaseUid = safeUid;
    _mode = mappedMode;
    _lastTickMs = Date.now();

    // optional: "touch" pertama biar row kebentuk segera
    await rpcUpdate({
      p_firebase_uid: _firebaseUid,
      p_mode: _mode,
    });

    if (_tickTimer) clearInterval(_tickTimer);
    _tickTimer = setInterval(tickPlaytime, TICK_EVERY_MS);
  }

  async function setMode(nextMode) {
    const mappedMode = normalizeMode(nextMode) || getDefaultMode();
    if (!mappedMode || !MODE_MAP[mappedMode]) return;
    _mode = mappedMode;

    // optional: touch row mode baru
    if (_firebaseUid) {
      await rpcUpdate({
        p_firebase_uid: _firebaseUid,
        p_mode: _mode,
      });
    }
  }

  async function endSession() {
    if (_tickTimer) clearInterval(_tickTimer);
    _tickTimer = null;

    _firebaseUid = null;
    _mode = null;
  }

  async function tickPlaytime() {
    const ok = await ensureReady();
    if (!ok) return;

    const now = Date.now();
    const delta = Math.min(now - _lastTickMs, 60_000);
    _lastTickMs = now;

    await rpcUpdate({
      p_firebase_uid: _firebaseUid,
      p_mode: _mode,
      p_play_ms: delta,
    });
  }

  async function trackClick() {
    const ok = await ensureReady();
    if (!ok) return;

    await rpcUpdate({
      p_firebase_uid: _firebaseUid,
      p_mode: _mode,
      p_clicks: 1,
    });
  }

  async function trackNavigation() {
    const ok = await ensureReady();
    if (!ok) return;

    await rpcUpdate({
      p_firebase_uid: _firebaseUid,
      p_mode: _mode,
      p_navigations: 1,
    });
  }

  async function trackAnswer({ isCorrect } = {}) {
    if (isCorrect) return;

    const ok = await ensureReady();
    if (!ok) return;

    await rpcUpdate({
      p_firebase_uid: _firebaseUid,
      p_mode: _mode,
      p_wrong_answers: 1,
    });
  }

  function logEvent() {}

  return {
    startSession,
    setMode,
    endSession,
    trackClick,
    trackNavigation,
    trackAnswer,
    logEvent,
  };
})();

export default Telemetry;
