import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getJSON, setJSON } from "../utils/storage.js";

const ALLOWED = new Set(["simple", "medium", "complex"]);
const DEFAULT_LEVEL = "medium";
const STORAGE_KEY = "uiLevel";
const EVT_CHANGED = "ui:level-changed";

function sanitize(v) {
  return ALLOWED.has(v) ? v : DEFAULT_LEVEL;
}

export default function useUiLevelFirestore() {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();

  const queryUi = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const v = sp.get("ui");
    return v ? sanitize(v) : null;
  }, [location.search]);

  const hydratedRef = useRef(false);
  const userChangedRef = useRef(false);
  const switchTimerRef = useRef(null);

  const [level, setLevelState] = useState(() => {
    const local = sanitize(getJSON(STORAGE_KEY, DEFAULT_LEVEL));
    return queryUi || local;
  });

  // ✅ sinkron antar instance hook (TopBar vs UiTheme)
  useEffect(() => {
    const onChanged = (e) => {
      const next = sanitize(e?.detail?.level);
      if (!next) return;
      setLevelState((prev) => (prev === next ? prev : next));
    };

    window.addEventListener(EVT_CHANGED, onChanged);
    return () => window.removeEventListener(EVT_CHANGED, onChanged);
  }, []);

  // URL override (?ui=)
  useEffect(() => {
    if (!queryUi) return;
    setLevelState((prev) => (prev === queryUi ? prev : queryUi));
    userChangedRef.current = true;

    // broadcast supaya instance lain ikut sama
    window.dispatchEvent(new CustomEvent(EVT_CHANGED, { detail: { level: queryUi } }));
  }, [queryUi]);

  // Hydrate Firestore setelah login (sekali)
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      hydratedRef.current = false;
      return;
    }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (queryUi) return;

    (async () => {
      try {
        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);
        const remoteUi = snap.exists() ? snap.data()?.uiLevel : null;

        if (userChangedRef.current) return;

        const next = remoteUi ? sanitize(remoteUi) : null;
        if (next) {
          setLevelState((prev) => (prev === next ? prev : next));
          setJSON(STORAGE_KEY, next);
          window.dispatchEvent(new CustomEvent(EVT_CHANGED, { detail: { level: next } }));
        }
      } catch (e) {
        console.warn("Failed to load uiLevel from Firestore:", e);
      }
    })();
  }, [authLoading, currentUser, queryUi]);

  // Persist local
  useEffect(() => {
    setJSON(STORAGE_KEY, level);
  }, [level]);

  const emitSwitch = (nextLevel) => {
    const el = document.documentElement;
    el.dataset.switching = "1";

    window.dispatchEvent(new CustomEvent("ui:mode-switch-start", { detail: { level: nextLevel } }));

    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);

    switchTimerRef.current = setTimeout(() => {
      delete el.dataset.switching;
      window.dispatchEvent(new CustomEvent("ui:mode-switch-end"));
      switchTimerRef.current = null;
    }, 900);
  };

  const setLevel = async (next) => {
    const v = sanitize(next);
    if (v === level) return;

    userChangedRef.current = true;

    emitSwitch(v);

    // ✅ set + broadcast (ini yang bikin UiTheme langsung ikut berubah)
    requestAnimationFrame(() => {
      setLevelState(v);
      setJSON(STORAGE_KEY, v);
      window.dispatchEvent(new CustomEvent(EVT_CHANGED, { detail: { level: v } }));
    });

    // Sync Firestore non-blocking
    if (!currentUser) return;
    setDoc(
      doc(db, "users", currentUser.uid),
      { uiLevel: v, uiUpdatedAt: serverTimestamp() },
      { merge: true }
    ).catch((e) => console.warn("Failed to save uiLevel to Firestore:", e));
  };

  const is = useMemo(
    () => ({
      simple: level === "simple",
      medium: level === "medium",
      complex: level === "complex"
    }),
    [level]
  );

  return { level, setLevel, is };
}
