// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useProgress } from "../hooks/useProgress.js";
import { useAuth } from "../contexts/AuthContext.jsx";

import { playSfx } from "../utils/sfx.js";
import { CAMPAIGN_TOTAL_LEVELS } from "../utils/storage.js";
import Telemetry from "../utils/telemetry.js";

const QUOTES = [
  "Hari ini satu langkah, besok lebih dekat. 🚀",
  "Pelan-pelan asal konsisten. 🌿",
  "Salah itu bagian dari proses. 🙂",
  "Belajar itu seperti leveling—jalan terus. 🎮",
  "Fokus ke progres, bukan perfeksionis. ✨",
  "Satu sesi lagi, biar naik level. 🏁",
];

function randQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function getUsernameFromEmail(email) {
  const e = String(email || "").toLowerCase();
  const at = e.indexOf("@");
  const local = at >= 0 ? e.slice(0, at) : e;
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function stageKeyForLevel(level) {
  if (level < 15) return "easy";
  if (level < 30) return "normal";
  return "hard";
}

function stageLabel(stageKey) {
  if (stageKey === "easy") return "Easy";
  if (stageKey === "normal") return "Normal";
  return "Hard";
}

function statusLabel(stageKey) {
  if (stageKey === "easy") return "Pemanasan";
  if (stageKey === "normal") return "Mulai Cepat";
  return "Ujian Berat";
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const { level, is } = useUiLevelFirestore();
  const { stats } = useProgress();
  const { currentUser } = useAuth();

  // ✅ UI mode (untuk telemetry)
  const uiMode = is.simple ? "simple" : is.medium ? "medium" : "complex";

  // ✅ telemetry: startSession + navigation on mount
  useEffect(() => {
    Telemetry.trackNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ telemetry: kalau user / uiMode berubah, refresh session mode
  // useEffect(() => {
  //   if (currentUser?.uid) Telemetry.startSession({ uid: currentUser.uid, mode: uiMode });
  // }, [currentUser?.uid, uiMode]);

  const displayName =
    currentUser?.displayName || getUsernameFromEmail(currentUser?.email) || "Pengguna";

  const [quote, setQuote] = useState(randQuote());
  const [quoteKey, setQuoteKey] = useState(0);

  useEffect(() => {
    if (is.simple) return;

    let mounted = true;
    const t = setInterval(() => {
      if (!mounted) return;

      setQuote(randQuote());

      if (is.complex) {
        setQuoteKey((k) => k + 1);
        try {
          playSfx("tap");
        } catch {}
      }
    }, 4500);

    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [is.simple, is.complex]);

  const attemptTotal = Number(stats?.attemptTotal || 0);
  const correctTotal = Number(stats?.correctTotal || 0);

  const scoreTotal = Number(
    stats?.scoreTotal ??
      stats?.pointsTotal ??
      stats?.totalPoints ??
      (correctTotal || 0) * 10
  );

  const sessions = Number(stats?.sessionsPlayed ?? stats?.quizCompleted ?? 0);

  const rawAcc = attemptTotal ? Math.round((correctTotal / attemptTotal) * 100) : 0;
  const accuracy = clamp(rawAcc, 0, 100);

  const streak = Number(stats?.streak || 0);
  const bestStreak = Number(stats?.bestStreak || 0);
  const avgTimeMs = Number(stats?.avgTimeMs || 0);

  const isNewUser = attemptTotal === 0 && sessions === 0 && !stats?.lastPlayedAt;

  // ✅ campaign level (0..45) untuk progress bar
  const levelMeta = useMemo(() => {
    const total = CAMPAIGN_TOTAL_LEVELS; // 45
    const cur = clamp(Number(stats?.globalLevelMax ?? stats?.globalLevel ?? 0), 0, total);

    // tampilkan Lv 1 untuk user baru
    const lvl = Math.max(1, cur === 0 ? 1 : cur);

    const pct = total > 0 ? Math.round((cur / total) * 100) : 0;
    return { lvl, cur, total, pct: clamp(pct, 0, 100) };
  }, [stats?.globalLevel]);

  if (is.simple) {
    return (
      <div className="space-y-4">
        <section className="ui-card ui-card--pad">
          {/* <div className="text-3xl font-extrabold ui-title">Halo 👋</div> */}

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              className="ui-btn ui-btn--primary w-full"
              onClick={() => {
                Telemetry.trackClick();
                Telemetry.trackNavigation();
                navigate(
                  { pathname: "/quiz", search: location.search },
                  { state: { startModeIndex: 0 } }
                );
              }}
            >
              PLAY
            </button>

            <button
              type="button"
              className="ui-btn w-full"
              onClick={() => {
                Telemetry.trackClick();
                Telemetry.trackNavigation();
                navigate({ pathname: "/categories", search: location.search });
              }}
            >
              Pilih Materi
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (is.medium) {
    return (
      <div className="space-y-4">
        <section className="ui-card ui-card--pattern ui-card--pad relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-extrabold ui-title">
                  Halo, {displayName} 👋
                </div>
                <div className="mt-2 text-sm ui-muted">{quote}</div>
              </div>

              {!isNewUser ? (
                <div className="flex flex-wrap gap-2">
                  <span className="ui-chip">Score {scoreTotal}</span>
                  <span className="ui-chip">Sesi {sessions}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => {
                  Telemetry.trackClick();
                  Telemetry.trackNavigation();
                  navigate(
                    { pathname: "/quiz", search: location.search },
                    { state: { startModeIndex: 0 } }
                  );
                }}
              >
                PLAY
              </button>

              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  Telemetry.trackClick();
                  Telemetry.trackNavigation();
                  navigate({ pathname: "/categories", search: location.search });
                }}
              >
                Pilih Materi
              </button>
            </div>

            {!isNewUser ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                  <div className="text-sm font-extrabold">Progress</div>
                  <div className="mt-2 ui-progress">
                    <div className="ui-progress__fill" style={{ width: `${levelMeta.pct}%` }} />
                  </div>
                  <div className="mt-2 text-xs ui-muted">
                    Lv {levelMeta.lvl} • {levelMeta.cur}/{levelMeta.total} soal
                  </div>
                </div>

                <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                  <div className="text-sm font-extrabold">Streak</div>
                  <div className="mt-2 text-2xl font-extrabold">{streak}</div>
                  <div className="mt-1 text-xs ui-muted">Best {bestStreak}</div>
                </div>

                <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                  <div className="text-sm font-extrabold">Rata-rata Waktu</div>
                  <div className="mt-2 text-2xl font-extrabold">
                    {avgTimeMs ? `${Math.round(avgTimeMs / 1000)}s` : "-"}
                  </div>
                  <div className="mt-1 text-xs ui-muted">per soal</div>
                </div>
              </div>
            ) : (
              <div className="mt-4 ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Mulai main dulu ✨</div>
                <div className="mt-1 text-xs ui-muted">
                  Progress akan muncul setelah kamu menjawab soal pertama.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // =========================
  // COMPLEX (layout baru, tapi styling pakai CSS lama kamu)
  // =========================
  const stageKey = stageKeyForLevel(levelMeta.cur);
  const stageText = stageLabel(stageKey);
  const statusText = statusLabel(stageKey);

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes quoteIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseFill {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }
      `}</style>

      <section className="ui-card ui-card--pattern ui-card--pad relative overflow-hidden">
        <div className="relative z-10">
          {/* HEADER */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-extrabold ui-title">
                Halo, {displayName} 👋
              </div>

              <div
                key={quoteKey}
                className="mt-2 text-sm ui-muted"
                style={{ animation: "quoteIn .35s ease-out" }}
              >
                {quote}
              </div>
            </div>

            {/* ✅ Stage (pakai asset user) */}
            <div
              className="ui-hud"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                paddingInline: 14,
                paddingBlock: 10,
                borderRadius: 999,
                minWidth: 0,
              }}
              title="Stage"
            >
              <img
                src="/images/guardian/user.png"
                alt="user"
                draggable={false}
                style={{ width: 22, height: 22, objectFit: "contain" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="ui-hud__value" style={{ whiteSpace: "nowrap" }}>
                Stage: {stageText /* pastikan stageText sudah kamu hitung */}
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => {
                try { playSfx("tap"); } catch {}
                Telemetry.trackClick();
                Telemetry.trackNavigation();
                navigate(
                  { pathname: "/quiz", search: location.search },
                  { state: { startModeIndex: 0 } }
                );
              }}
            >
              PLAY
            </button>

            <button
              type="button"
              className="ui-btn"
              onClick={() => {
                try { playSfx("tap"); } catch {}
                Telemetry.trackClick();
                Telemetry.trackNavigation();
                navigate({ pathname: "/categories", search: location.search });
              }}
            >
              Pilih Materi
            </button>
          </div>

          {/* CONTENT */}
          {!isNewUser ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {/* ✅ Progress Gerbang (tanpa 45/45 gerbang) */}
              <div className="ui-card ui-card--pad ui-darkpanel">
                <div className="text-sm font-extrabold">Progress Gerbang</div>

                <div className="mt-2 ui-progress">
                  <div
                    className="ui-progress__fill"
                    style={{
                      width: `${levelMeta.pct}%`,
                      animation: "pulseFill 2.2s ease-in-out infinite",
                    }}
                  />
                </div>

                {/* ✅ hilangkan “45/45 gerbang” */}
                <div className="mt-2 text-xs ui-muted">
                  {/* teks netral aja */}
                  Teruskan perjalananmu ke gerbang berikutnya.
                </div>
              </div>

              {/* ✅ Statistik hanya: Sesi, Score, Streak, Status */}
              <div className="ui-card ui-card--pad ui-darkpanel">
                <div className="text-sm font-extrabold">Statistik</div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="ui-mini">
                    <div className="ui-mini__k">Sesi</div>
                    <div className="ui-mini__v">{sessions}</div>
                  </div>

                  <div className="ui-mini">
                    <div className="ui-mini__k">Score</div>
                    <div className="ui-mini__v">{scoreTotal}</div>
                  </div>

                  <div className="ui-mini">
                    <div className="ui-mini__k">Streak</div>
                    <div className="ui-mini__v">{streak}</div>
                    <div className="mt-1 text-xs ui-muted">Best {bestStreak}</div>
                  </div>

                  <div className="ui-mini">
                    <div className="ui-mini__k">Status</div>
                    <div className="ui-mini__v">{statusText /* pastikan statusText sudah kamu hitung */}</div>
                    {/* ✅ hapus "mengikuti stage plan complex" */}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 ui-card ui-card--pad ui-darkpanel">
              <div className="text-sm font-extrabold">Mulai main dulu ✨</div>
              <div className="mt-1 text-xs ui-muted">
                Setelah menjawab soal pertama, progress dan statistik akan muncul di sini.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
