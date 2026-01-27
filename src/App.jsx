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

import useUiLevelFirestore from "./hooks/useUiLevelFirestore.js";

import {
  setAudioEnabled,
  setAutoBgm,
  setBgmVolume,
  setSfxVolume,
  unlockAudio,
  stopBgm,
} from "./utils/sfx.js";

export default function App() {
  const { is } = useUiLevelFirestore();

  useEffect(() => {
    const ui = is?.complex ? "complex" : is?.medium ? "medium" : "simple";
    document.body.dataset.ui = ui;

    return () => {
      delete document.body.dataset.ui;
    };
  }, [is?.complex, is?.medium]);

  useEffect(() => {
    const complex = !!is?.complex;

    setAudioEnabled(complex);
    setAutoBgm(complex);

    setBgmVolume(0.22);
    setSfxVolume(1.8);

    if (!complex) stopBgm();
  }, [is?.complex]);

  useEffect(() => {
    if (!is?.complex) return;

    const handler = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };

    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler, { passive: true });
    window.addEventListener("touchstart", handler, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [is?.complex]);

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
        {/* ✅ Toast sudah dirender oleh ToastProvider */}
      </>
    </UiTheme>
  );
}
