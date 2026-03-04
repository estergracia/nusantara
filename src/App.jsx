// src/App.jsx
import React, { useEffect } from "react";
import UiTheme from "./components/UiTheme.jsx";
import { Route, Routes, Navigate } from "react-router-dom";

import Splash from "./pages/Splash.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Categories from "./pages/Categories.jsx";
import Learn from "./pages/Learn.jsx";
import Quiz from "./pages/Quiz.jsx";
import Achievements from "./pages/Achievements.jsx";

import AppShell from "./components/AppShell.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import UiModeLoader from "./components/UiModeLoader.jsx";

import Telemetry from "./utils/telemetry.js";
import { useAuth } from "./contexts/AuthContext.jsx";
import useUiLevelFirestore from "./hooks/useUiLevelFirestore.js";

import {
  setAudioMode,
  setBgmVolume,
  setMediumBgmVolume,
  setSfxVolume,
  unlockAudio,
} from "./utils/sfx.js";

export default function App() {
  const { is } = useUiLevelFirestore();
  const { currentUser } = useAuth();

  // ✅ set dataset ui buat theme/style
  useEffect(() => {
    const ui = is?.complex ? "complex" : is?.medium ? "medium" : "simple";
    document.body.dataset.ui = ui;

    return () => {
      delete document.body.dataset.ui;
    };
  }, [is?.complex, is?.medium]);

  // ✅ set volume sekali
  useEffect(() => {
    setBgmVolume(0.40);        // complex bgm
    setMediumBgmVolume(0.20);  // medium bgm
    setSfxVolume(2.6);         // mapping ke complex + medium sfx
  }, []);

  // ✅ GLOBAL audio mode: medium & complex hidup di semua halaman
  useEffect(() => {
    const mode = is?.complex ? "complex" : is?.medium ? "medium" : "off";
    setAudioMode(mode);
  }, [is?.complex, is?.medium]);

  // ✅ unlock gesture dipasang saat complex ATAU medium
  useEffect(() => {
    if (!is?.complex && !is?.medium) return;

    const handler = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };

    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [is?.complex, is?.medium]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const uiMode = is?.complex ? "complex" : is?.medium ? "medium" : "simple";
    Telemetry.startSession({ uid: currentUser.uid, mode: uiMode });
  }, [currentUser?.uid, is?.complex, is?.medium]);

  useEffect(() => {
    const uiMode = is?.complex ? "complex" : is?.medium ? "medium" : "simple";
    Telemetry.setMode(uiMode);
  }, [is?.complex, is?.medium]);

  return (
    <UiTheme>
      <>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<RequireAuth fallbackTo="/login" />}>
              <Route path="/home" element={<Home />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/learn/:categoryId" element={<Learn />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/achievements" element={<Achievements />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        <UiModeLoader />
      </>
    </UiTheme>
  );
}
