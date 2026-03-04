import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CategoryCard from "../components/CategoryCard.jsx";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { CATEGORIES } from "../utils/routes.js";
import { useProgress } from "../hooks/useProgress.js";

import Telemetry from "../utils/telemetry.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Categories() {
  const navigate = useNavigate();
  const location = useLocation();
  const { level, is } = useUiLevelFirestore();
  const { stats, updateStats } = useProgress();
  const { currentUser } = useAuth();

  const uiMode = is.simple ? "simple" : is.medium ? "medium" : "complex";

  useEffect(() => {
    Telemetry.trackNavigation();

    const next = {
      ...stats,
      categoriesOpened: (stats.categoriesOpened || 0) + 1,
      lastPlayedAt: Date.now()
    };
    updateStats(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // kalau user ganti UI level di tengah app, update mode session
  // useEffect(() => {
  //   if (currentUser?.uid) Telemetry.startSession({ uid: currentUser.uid, mode: uiMode });
  // }, [currentUser?.uid, uiMode]);

  const openCategory = (id) => {
    Telemetry.trackClick();
    Telemetry.trackNavigation();
    navigate({ pathname: `/learn/${id}`, search: location.search });
  };

  return (
    <div className="space-y-4">
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="text-2xl font-extrabold tracking-tight ">Categories</div>
        <p className="mt-1 text-sm ui-muted">
          Pilih topik yang menurut kamu lebih menarik.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <CategoryCard
            key={c.id}
            id={c.id}
            title={c.title}
            icon={c.icon}
            shortDesc={c.shortDesc}
            uiLevel={level}
            onClick={() => openCategory(c.id)}
          />
        ))}
      </section>

    </div>
  );
}
