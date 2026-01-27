import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useProgress } from "../hooks/useProgress.js";
import { useAuth } from "../contexts/AuthContext.jsx";

import { playSfx } from "../utils/sfx.js";
import { CAMPAIGN_TOTAL_LEVELS } from "../utils/storage.js";

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

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const { level, is } = useUiLevelFirestore();
  const { stats } = useProgress();
  const { currentUser } = useAuth();

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
    const cur = clamp(Number(stats?.globalLevel || 0), 0, total);

    // tampilkan Lv 1 untuk user baru
    const lvl = Math.max(1, cur === 0 ? 1 : cur);

    const pct = total > 0 ? Math.round((cur / total) * 100) : 0;
    return { lvl, cur, total, pct: clamp(pct, 0, 100) };
  }, [stats?.globalLevel]);

  if (is.simple) {
    return (
      <div className="space-y-4">
        <section className="ui-card ui-card--pad">
          <div className="text-3xl font-extrabold ui-title">Halo 👋</div>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              className="ui-btn ui-btn--primary w-full"
              onClick={() =>
                navigate(
                  { pathname: "/quiz", search: location.search },
                  { state: { startModeIndex: 0 } }
                )
              }
            >
              PLAY
            </button>

            <button
              type="button"
              className="ui-btn w-full"
              onClick={() => navigate({ pathname: "/categories", search: location.search })}
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
                onClick={() =>
                  navigate(
                    { pathname: "/quiz", search: location.search },
                    { state: { startModeIndex: 0 } }
                  )
                }
              >
                PLAY
              </button>

              <button
                type="button"
                className="ui-btn"
                onClick={() => navigate({ pathname: "/categories", search: location.search })}
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

            {!isNewUser ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="ui-hud">
                  <div className="ui-hud__label">LEVEL</div>
                  <div className="ui-hud__value">Lv {levelMeta.lvl}</div>
                </div>
                <div className="ui-hud">
                  <div className="ui-hud__label">ACCURACY</div>
                  <div className="ui-hud__value">{accuracy}%</div>
                </div>
                <div className="ui-hud">
                  <div className="ui-hud__label">STREAK</div>
                  <div className="ui-hud__value">{streak}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => {
                playSfx("tap");
                navigate({ pathname: "/quiz", search: location.search },
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
                playSfx("tap");
                navigate({ pathname: "/categories", search: location.search });
              }}
            >
              Pilih Materi
            </button>
          </div>

          {!isNewUser ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="ui-card ui-card--pad ui-darkpanel">
                <div className="text-sm font-extrabold">Progress Soal</div>
                <div className="mt-2 ui-progress">
                  <div
                    className="ui-progress__fill"
                    style={{
                      width: `${levelMeta.pct}%`,
                      animation: "pulseFill 2.2s ease-in-out infinite",
                    }}
                  />
                </div>
                <div className="mt-2 text-xs ui-muted">
                  {levelMeta.cur}/{levelMeta.total} soal • sekarang Lv {levelMeta.lvl}
                </div>
              </div>

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
                    <div className="ui-mini__k">Best Streak</div>
                    <div className="ui-mini__v">{bestStreak}</div>
                  </div>
                  <div className="ui-mini">
                    <div className="ui-mini__k">Avg Time</div>
                    <div className="ui-mini__v">
                      {avgTimeMs ? `${Math.round(avgTimeMs / 1000)}s` : "-"}
                    </div>
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
