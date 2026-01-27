import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase/firebase.js";

const Telemetry = (() => {
  let _enabled = true;

  let _uid = null;
  let _sessionId = null;
  let _sessionRef = null;
  let _mode = "unknown";

  let _queue = [];
  let _flushTimer = null;
  const FLUSH_EVERY_MS = 4000;
  const FLUSH_MAX_EVENTS = 20;

  let _tickTimer = null;
  let _lastTickMs = 0;
  const TICK_EVERY_MS = 10000;

  function nowMs() {
    return Date.now();
  }

  function getClientId() {
    if (typeof window === "undefined") return "server";
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `c_${Math.random().toString(16).slice(2)}`;
  }

  const _clientId = getClientId();

  function setEnabled(v) {
    _enabled = !!v;
  }

  function canLog() {
    return _enabled && _sessionRef && _uid && _sessionId;
  }

  function logEvent(name, data = {}) {
    if (!canLog()) return;
    _queue.push({ name, data, ts: Date.now() });
    if (_queue.length >= FLUSH_MAX_EVENTS) flush();
  }

  async function flush(force = false) {
    if (!canLog()) return;
    if (_queue.length === 0) return;

    const eventsToSend = force
      ? _queue.splice(0)
      : _queue.splice(0, FLUSH_MAX_EVENTS);

    const batch = writeBatch(db);
    const eventsCol = collection(
      db,
      "users",
      _uid,
      "telemetrySessions",
      _sessionId,
      "events"
    );

    for (const ev of eventsToSend) {
      const evRef = doc(eventsCol);
      batch.set(evRef, {
        uid: _uid,
        sessionId: _sessionId,
        mode: _mode,
        name: ev.name,
        data: ev.data,
        clientTs: ev.ts,
        createdAt: serverTimestamp()
      });
    }

    batch.update(_sessionRef, {
      lastSeenAt: serverTimestamp()
    });

    try {
      await batch.commit();
    } catch (e) {
      console.error("❌ Telemetry batch commit failed", e);
      _queue = eventsToSend.concat(_queue);
    }
  }

  async function tickPlaytime() {
    if (!canLog()) return;

    const t = nowMs();
    const delta = Math.max(0, t - _lastTickMs);
    _lastTickMs = t;

    const capped = Math.min(delta, 60_000);

    try {
      await updateDoc(_sessionRef, {
        totalPlayMs: increment(capped),
        lastSeenAt: serverTimestamp()
      });
    } catch (e) {
      console.error("❌ Telemetry tickPlaytime failed", e);
    }
  }

  function handlePageHide() {
    flush(true);
  }

  function handleVisibility() {
    if (document.visibilityState === "hidden") flush(true);
  }

  function cleanup() {
    if (_flushTimer) clearInterval(_flushTimer);
    if (_tickTimer) clearInterval(_tickTimer);

    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("visibilitychange", handleVisibility);
    }

    _queue = [];
    _uid = null;
    _sessionId = null;
    _sessionRef = null;
    _mode = "unknown";
  }

  async function startSession({ uid, mode = "unknown", meta = {} }) {
    if (!_enabled || !uid) return null;

    if (_sessionRef) {
      await endSession({ reason: "restart_session" });
    }

    _uid = uid;
    _mode = mode;

    const sessionsCol = collection(db, "users", uid, "telemetrySessions");

    const docData = {
      uid,
      mode,
      clientId: _clientId,

      startedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      endedAt: null,

      // counters
      totalClicks: 0,
      totalNavigations: 0,
      totalAnswers: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      totalPlayMs: 0,

      // meta
      app: meta.app ?? "belajar-nusantara",
      appVersion: meta.appVersion ?? null,
      uiLevel: meta.uiLevel ?? mode,
      variant: meta.variant ?? null
    };

    try {
      const created = await addDoc(sessionsCol, docData);
      console.log("✅ Telemetry session started:", created.id);

      _sessionId = created.id;
      _sessionRef = created;
    } catch (e) {
      console.error("❌ Telemetry startSession failed", e);
      return null;
    }

    logEvent("session_start", { mode });

    _flushTimer = setInterval(() => flush(), FLUSH_EVERY_MS);

    _lastTickMs = nowMs();
    _tickTimer = setInterval(() => tickPlaytime(), TICK_EVERY_MS);

    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", handlePageHide, { passive: true });
      window.addEventListener("visibilitychange", handleVisibility, { passive: true });
    }

    return _sessionId;
  }

  async function endSession(extra = {}) {
    if (!_sessionRef) return;

    await tickPlaytime();
    logEvent("session_end", extra);
    await flush(true);

    try {
      await updateDoc(_sessionRef, {
        endedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      });
    } catch (e) {
      console.error("❌ Telemetry endSession failed", e);
    }

    cleanup();
  }

  async function trackClick(label = "unknown", extra = {}) {
    if (!canLog()) return;
    logEvent("click", { label, ...extra });
    try {
      await updateDoc(_sessionRef, {
        totalClicks: increment(1)
      });
    } catch (e) {
      console.error("❌ Telemetry trackClick failed", e);
    }
  }

  async function trackNavigation(to, from = null) {
    if (!canLog()) return;
    logEvent("navigate", { to, from });
    try {
      await updateDoc(_sessionRef, {
        totalNavigations: increment(1)
      });
    } catch (e) {
      console.error("❌ Telemetry trackNavigation failed", e);
    }
  }

  async function trackAnswer({ questionId, isCorrect, timeMs, category, extra = {} }) {
    if (!canLog()) return;

    logEvent("answer", {
      questionId: questionId ?? null,
      isCorrect: !!isCorrect,
      timeMs: typeof timeMs === "number" ? timeMs : null,
      category: category ?? null,
      ...extra
    });

    try {
      await updateDoc(_sessionRef, {
        totalAnswers: increment(1),
        correctAnswers: increment(isCorrect ? 1 : 0),
        wrongAnswers: increment(isCorrect ? 0 : 1)
      });
    } catch (e) {
      console.error("❌ Telemetry trackAnswer failed", e);
    }
  }

  return {
    setEnabled,
    startSession,
    endSession,
    logEvent,
    flush,
    trackClick,
    trackNavigation,
    trackAnswer
  };
})();

export default Telemetry;
