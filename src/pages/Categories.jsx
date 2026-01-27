import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CategoryCard from "../components/CategoryCard.jsx";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { CATEGORIES } from "../utils/routes.js";
import { useProgress } from "../hooks/useProgress.js";

export default function Categories() {
  const navigate = useNavigate();
  const location = useLocation();
  const { level, is } = useUiLevelFirestore();
  const { stats, updateStats } = useProgress();

  useEffect(() => {
    const next = {
      ...stats,
      categoriesOpened: (stats.categoriesOpened || 0) + 1,
      lastPlayedAt: Date.now()
    };
    updateStats(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCategory = (id) => {
    navigate({ pathname: `/learn/${id}`, search: location.search });
  };

  return (
    <div className="space-y-4">
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="text-2xl font-extrabold tracking-tight ">Categories</div>
        <p className="mt-1 text-sm ui-muted">
          pilih topik yang paling familiar dulu agar lebih nyaman.
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

      {is.medium || is.complex ? (
        <section className="ui-card ui-card--pattern ui-card--pad">
          <div className="text-sm font-extrabold ui-title">Continue Learning</div>
          <div className="mt-2 text-sm ui-muted">
            Tip: setelah selesai Learn, tekan tombol <b className="ui-title">PLAY</b> untuk menguji ingatan.
          </div>
        </section>
      ) : null}
    </div>
  );
}
