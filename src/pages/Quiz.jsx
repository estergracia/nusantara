// src/pages/Quiz.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useProgress } from "../hooks/useProgress.js";

import QuizOption from "../components/QuizOption.jsx";
import BadgeUnlockPopup from "../components/BadgeUnlockPopup.jsx";

import { playSfx } from "../utils/sfx.js";
import { buildMixedQuizQuestions, MODE_CONFIGS } from "../utils/quizBuilder.js";
import { runBadgeEngine, BADGE_META } from "../utils/badgeEngine.js";

import nusantaraData from "../data/nusantaraData.js";
import Telemetry from "../utils/telemetry.js";

// ---------------- helpers ----------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${s}s`;
}
function safeNum(x, fb = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fb;
}
function ensureObj(x, fb = {}) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : fb;
}
function ensureArr(x, fb = []) {
  return Array.isArray(x) ? x : fb;
}
function getEarnedIds(badges) {
  if (Array.isArray(badges)) return badges;
  if (Array.isArray(badges?.earnedIds)) return badges.earnedIds;
  if (Array.isArray(badges?.unlockedIds)) return badges.unlockedIds;
  if (Array.isArray(badges?.ids)) return badges.ids;
  if (Array.isArray(badges?.nextEarnedIds)) return badges.nextEarnedIds;
  return [];
}

// total campaign levels (Easy+Normal+Hard) => 45
const TOTAL_LEVELS = MODE_CONFIGS.reduce((a, m) => a + (m.totalQuestions || 0), 0);

// sentinel untuk timeout (biar beda dari opsi normal)
const TIMEOUT_PICK = "__timeout__";

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();

  const { level, is } = useUiLevelFirestore();
  const { stats, badges, updateStats, updateBadges } = useProgress();

  // FLOW: Easy -> Normal -> Hard (tapi start bisa dari mode yang belum selesai)
  const [modeIndex, setModeIndex] = useState(0);
  const mode = MODE_CONFIGS[modeIndex] || MODE_CONFIGS[0];

  const [phase, setPhase] = useState("splash"); // splash | playing | stageDone | final
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);

  // per-question UI
  // undefined = belum jawab, string option / TIMEOUT_PICK = sudah jawab
  const [picked, setPicked] = useState(undefined);
  const [resultState, setResultState] = useState({});

  // timer
  const [timeLeft, setTimeLeft] = useState(mode.timePerQuestion);
  const [timeLeftMs, setTimeLeftMs] = useState(mode.timePerQuestion * 1000);
  const timerRef = useRef(null);
  const deadlineRef = useRef(0);
  const questionStartAtRef = useRef(Date.now());

  // session UI
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [sessionTimeMs, setSessionTimeMs] = useState(0);

  // streak
  const [curStreak, setCurStreak] = useState(stats?.streak || 0);
  const [bestStreak, setBestStreak] = useState(stats?.bestStreak || 0);

  // (biar tidak crash kalau kamu belum pakai quotes)
  const [, setQuoteKey] = useState(0);

  // badge popup queue
  const [badgeQueue, setBadgeQueue] = useState([]);
  const [activeBadge, setActiveBadge] = useState(null);
  const afterBadgeActionRef = useRef(null);

  // ✅ sessionsPlayed naik 1x per "klik Mulai" (sekali per run)
  const sessionStartedRef = useRef(false);

  // ✅ init modeIndex dari progress campaign (sekali)
  const initStageRef = useRef(false);

  // ✅ TAMBAHAN: kunci supaya progress runtime tidak ditimpa stats async
  const hasLocalProgressRef = useRef(false);

  useEffect(() => {
    if (!stats) return;

    // 🔒 kalau progress sudah ditentukan secara lokal (main lagi / lanjut mode)
    if (hasLocalProgressRef.current) return;

    if (quizHasStartedRef.current) return;
    if (initStageRef.current) return;

    initStageRef.current = true;

    const override = location?.state?.startModeIndex;
    const fromStats = safeNum(stats?.campaignStageIndex ?? 0);

    const startIndex = Number.isFinite(Number(override))
      ? clamp(Number(override), 0, MODE_CONFIGS.length - 1)
      : clamp(fromStats, 0, MODE_CONFIGS.length - 1);

    setModeIndex(startIndex);
    setPhase("splash");
  }, [stats]);


  // MODE RUN COUNTERS (dihitung per-mode)
  const modeRunRef = useRef({ correct: 0, wrong: 0, answered: 0, totalTimeSec: 0 });

  const q = questions[idx] || null;

  // global level label di UI quiz (posisi dalam campaign 45 soal)
  const globalLevelNum = useMemo(() => {
    const before = MODE_CONFIGS.slice(0, modeIndex).reduce(
      (a, m) => a + (m.totalQuestions || 0),
      0
    );
    return before + idx + 1;
  }, [modeIndex, idx]);

  const quizOptsFromNav = useMemo(() => {
    const st = location?.state || {};
    const categoryId = st?.categoryId || null;
    const allowedIslands = st?.allowedIslands || null;
    return { categoryId, allowedIslands };
  }, [location]);

  function buildQuestionsForMode() {
    const base = quizOptsFromNav || {};

    const imageRate =
      mode.id === "easy" ? 0.45 :
      mode.id === "normal" ? 0.55 :
      0.65;

    const inverseRate =
      mode.id === "easy" ? 0.35 :
      mode.id === "normal" ? 0.45 :
      0.55;

    // ✅ QUIZ: selalu pakai gambar ASLI untuk soal bergambar
    const imageVariant = "asli";

    return buildMixedQuizQuestions(nusantaraData, mode.totalQuestions, {
      ...base,
      modeId: mode.id,
      imageRate,
      inverseRate,
      optionsCount: 3,
      imageVariant,
      uiLevel: level,
    });
  }

  function resetTimerForQuestion() {
    const totalMs = (mode.timePerQuestion || 0) * 1000;
    const now = Date.now();

    deadlineRef.current = now + totalMs;
    setTimeLeft(mode.timePerQuestion);
    setTimeLeftMs(totalMs);
    questionStartAtRef.current = now;
  }

  // ---------------- telemetry: splash view ----------------
  const splashLoggedRef = useRef(false);
  useEffect(() => {
    if (phase !== "splash") {
      splashLoggedRef.current = false;
      return;
    }
    if (splashLoggedRef.current) return;
    splashLoggedRef.current = true;

    Telemetry.logEvent("quiz_splash_view", {
      modeId: mode?.id ?? null,
      modeIndex,
      uiLevel: level ?? null,
      categoryId: quizOptsFromNav?.categoryId ?? null,
      allowedIslands: quizOptsFromNav?.allowedIslands ?? null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, modeIndex]);

  // ---------------- session start (only once) ----------------
  async function markSessionStartedOnce() {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    try {
      const prev = stats || {};
      const next = {
        ...prev,
        sessionsPlayed: safeNum(prev?.sessionsPlayed ?? prev?.quizCompleted ?? 0) + 1,
        lastPlayedAt: Date.now(),
      };
      await updateStats(next);
    } catch (e) {
      console.warn("markSessionStartedOnce failed:", e);
    }
  }

  async function startModePlay() {
    // ✅ kunci lifecycle quiz
    quizHasStartedRef.current = true;
    
    await markSessionStartedOnce();

    Telemetry.logEvent("quiz_start_mode", {
      modeId: mode?.id ?? null,
      modeIndex,
      totalQuestions: mode?.totalQuestions ?? null,
      timePerQuestion: mode?.timePerQuestion ?? null,
      uiLevel: level ?? null,
      categoryId: quizOptsFromNav?.categoryId ?? null,
      allowedIslands: quizOptsFromNav?.allowedIslands ?? null
    });

    const qs = buildQuestionsForMode();
    setQuestions(qs);
    setIdx(0);
    setPicked(undefined);
    setResultState({});
    resetTimerForQuestion();
    setPhase("playing");
  }

  // ---------------- badge popup queue ----------------
  function queueBadgesAndThen(ids = [], action = null) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) {
      if (typeof action === "function") action();
      return;
    }
    afterBadgeActionRef.current = action;
    setBadgeQueue(list);
    setActiveBadge(list[0]);
    if (level === "complex") playSfx("unlock");
  }

  function closeBadgePopup() {
    setBadgeQueue((prev) => {
      const next = [...prev];
      next.shift();
      const nextId = next[0] || null;
      setActiveBadge(nextId);

      if (!nextId) {
        const act = afterBadgeActionRef.current;
        afterBadgeActionRef.current = null;
        if (typeof act === "function") act();
      }
      return next;
    });
  }

  // ---------------- timer effect ----------------
  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;
    if (picked !== undefined) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const remain = Math.max(0, deadlineRef.current - Date.now());
      setTimeLeftMs(remain);
      setTimeLeft(Math.ceil(remain / 1000));
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [phase, q, picked]);

  // timeout trigger
  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;
    if (picked !== undefined) return;
    if (timeLeft > 0) return;

    revealAnswer(TIMEOUT_PICK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, picked, q]);

  // init timer while splash
  useEffect(() => {
    if (phase === "splash") {
      const totalMs = (mode.timePerQuestion || 0) * 1000;
      setTimeLeft(mode.timePerQuestion);
      setTimeLeftMs(totalMs);
      deadlineRef.current = Date.now() + totalMs;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeIndex, phase]);

  // reset modeRun per mode
  useEffect(() => {
    if (phase !== "playing") return;
    modeRunRef.current = { correct: 0, wrong: 0, answered: 0, totalTimeSec: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, modeIndex]);

  // telemetry: question shown (anti dobel)
  const lastShownKeyRef = useRef("");
  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;

    const qId = q?.id ?? q?.questionId ?? q?.prompt ?? `idx_${idx}`;
    const key = `${mode?.id ?? "?"}|${modeIndex}|${idx}|${String(qId)}`;
    if (lastShownKeyRef.current === key) return;
    lastShownKeyRef.current = key;

    Telemetry.logEvent("question_shown", {
      modeId: mode?.id ?? null,
      modeIndex,
      idx,
      globalLevelNum,
      questionId: q?.id ?? q?.questionId ?? null,
      categoryId: q?.categoryId ?? null,
      categoryTitle: q?.categoryTitle ?? null,
      hasImage: !!q?.media?.src
    });
  }, [phase, q, idx, modeIndex, mode?.id, globalLevelNum]);

  // ✅ GUARD: kalau quiz sudah dimulai, jangan override modeIndex dari stats
  const quizHasStartedRef = useRef(false);

  // update modeRunRef tiap selesai jawab (termasuk timeout)
  useEffect(() => {
    if (phase !== "playing") return;
    if (picked === undefined) return;
    if (!q) return;

    const isTimeout = picked === TIMEOUT_PICK;
    const isCorrect = !isTimeout && picked === q.answer;

    modeRunRef.current.answered += 1;
    if (isCorrect) modeRunRef.current.correct += 1;
    else modeRunRef.current.wrong += 1;

    const now = Date.now();
    const startedAt = questionStartAtRef.current || now;
    const spentSec = clamp((now - startedAt) / 1000, 0, mode.timePerQuestion || 0);
    modeRunRef.current.totalTimeSec += spentSec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  // ---------------- answer logic ----------------
  function revealAnswer(choice) {
    if (!q) return;
    if (picked !== undefined) return;

    setPicked(choice);

    const isTimeout = choice === TIMEOUT_PICK;
    const isCorrect = !isTimeout && choice === q.answer;

    const map = {};
    for (const opt of q.options) {
      if (opt === q.answer) map[opt] = "correct";
      else if (!isTimeout && opt === choice) map[opt] = "wrong";
      else map[opt] = "idle";
    }
    setResultState(map);

    // time spent (ms)
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (questionStartAtRef.current || now));
    setSessionTimeMs((t) => t + elapsedMs);

    // ✅ telemetry: answer (termasuk timeout)
    const questionId =
      q?.id ?? q?.questionId ?? `${mode?.id ?? "mode"}_${modeIndex}_${idx}`;
    const category =
      q?.categoryId ?? q?.categoryTitle ?? null;

    Telemetry.trackAnswer({
      questionId,
      category,
      isCorrect,
      timeMs: elapsedMs,
      extra: {
        modeId: mode?.id ?? null,
        modeIndex,
        idx,
        globalLevelNum,
        picked: choice,
        timeout: isTimeout
      }
    });

    // streak
    setCurStreak((s) => {
      const next = isCorrect ? s + 1 : 0;
      setBestStreak((b) => Math.max(b, next));
      return next;
    });

    // score session UI (timeout = salah) ✅ anti minus
    const delta = isCorrect ? mode.scoreCorrect : mode.scoreWrong;
    setSessionScore((s) => Math.max(0, s + delta)); // ✅ clamp 0 biar tidak minus
    if (isCorrect) setSessionCorrect((c) => c + 1);
    else setSessionWrong((w) => w + 1);

    // SFX + getar hanya complex
    if (is.complex) {
      setQuoteKey((k) => k + 1);
      playSfx("tap");
      playSfx(isCorrect ? "correct" : "wrong");
      if (!isCorrect && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([90, 60, 90]);
      }
    }

    // stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // next
    setTimeout(() => {
      const nextIdx = idx + 1;
      if (nextIdx >= questions.length) {
        setPhase("stageDone");
      } else {
        setIdx(nextIdx);
        setPicked(undefined);
        setResultState({});
        resetTimerForQuestion();
      }
    }, is.simple ? 650 : 900);
  }

  // ---------------- finalize mode (save stats + badges) ----------------
  async function finalizeModeAndMoveNext() {
    const modeId = mode.id;

    const answered = safeNum(modeRunRef.current.answered);
    const correct = safeNum(modeRunRef.current.correct);
    const wrong = safeNum(modeRunRef.current.wrong);
    const runTimeSec = safeNum(modeRunRef.current.totalTimeSec);

    // telemetry: mode complete (ringkasan run)
    Telemetry.logEvent("mode_complete", {
      modeId,
      modeIndex,
      answered,
      correct,
      wrong,
      runTimeSec
    });

    // score mode ini
    const modeScore =
      correct * safeNum(mode.scoreCorrect) + wrong * safeNum(mode.scoreWrong);

    const prev = stats || {};

    // lifetime
    const prevAttempt = safeNum(prev?.attemptTotal ?? 0);
    const nextAttempt = prevAttempt + answered;

    const prevScoreTotal = safeNum(
      prev?.scoreTotal ?? prev?.pointsTotal ?? prev?.totalPoints ?? 0
    );
    const nextScoreTotal = Math.max(0, prevScoreTotal + modeScore);

    // ---------------- ✅ CAMPAIGN (anti dobel tambah saat replay) ----------------
    const prevCampaignByMode = {
      ...ensureObj(prev?.campaignByMode, { easy: 0, normal: 0, hard: 0 }),
    };

    // stageDone => mode ini selesai, jadi cap ke totalQuestions (replay tidak menambah)
    const nextCampaignByMode = {
      ...prevCampaignByMode,
      [modeId]: Math.max(
        safeNum(prevCampaignByMode?.[modeId] ?? 0),
        safeNum(mode.totalQuestions ?? 0)
      ),
    };

    // global campaign progress = sum per-mode (cap)
    const globalLevelNow = MODE_CONFIGS.reduce((sum, m) => {
      const got = safeNum(nextCampaignByMode?.[m.id] ?? 0);
      const cap = safeNum(m.totalQuestions ?? 0);
      return sum + Math.min(got, cap);
    }, 0);

    const prevGLMax = safeNum(prev?.globalLevelMax ?? prev?.globalLevel ?? 0);
    const globalLevelMax = Math.max(prevGLMax, globalLevelNow);

    // stage index berikutnya (untuk "main lagi" lanjut mode selanjutnya)
    const prevStage = safeNum(prev?.campaignStageIndex ?? 0);

    let nextStage;

    // Easy / Normal → lanjut
    if (modeId !== "hard") {
      nextStage = clamp(
        modeIndex + 1,
        0,
        MODE_CONFIGS.length - 1
      );
    } else {
      // Hard selesai → reset campaign
      nextStage = 0;
    }
    // ---------------------------------------------------------------------------

    // per-mode aggregates (lifetime)
    const timeSumByMode = {
      ...ensureObj(prev.timeSumByMode, { easy: 0, normal: 0, hard: 0 }),
    };
    const timeCountByMode = {
      ...ensureObj(prev.timeCountByMode, { easy: 0, normal: 0, hard: 0 }),
    };
    const correctByMode = {
      ...ensureObj(prev.correctByMode, { easy: 0, normal: 0, hard: 0 }),
    };
    const answeredByMode = {
      ...ensureObj(prev.answeredByMode, { easy: 0, normal: 0, hard: 0 }),
    };

    timeSumByMode[modeId] = safeNum(timeSumByMode[modeId]) + runTimeSec;
    timeCountByMode[modeId] = safeNum(timeCountByMode[modeId]) + answered;

    correctByMode[modeId] = safeNum(correctByMode[modeId]) + correct;
    answeredByMode[modeId] = safeNum(answeredByMode[modeId]) + answered;

    // overall avg time (ms)
    const totalTimeBefore = safeNum(prev?.avgTimeMs ?? 0) * prevAttempt;
    const totalTimeNow = totalTimeBefore + safeNum(sessionTimeMs);
    const nextAvgMs = nextAttempt ? Math.round(totalTimeNow / nextAttempt) : 0;

    // avgTimeByMode & accuracyByMode = last-run value (untuk badge condition)
    const avgTimeByMode = {
      ...ensureObj(prev.avgTimeByMode, { easy: 0, normal: 0, hard: 0 }),
    };
    const accuracyByMode = {
      ...ensureObj(prev.accuracyByMode, { easy: 0, normal: 0, hard: 0 }),
    };

    const runAvgTimeSec = answered ? runTimeSec / answered : 0;
    const runAccuracy01 = answered ? correct / answered : 0;

    avgTimeByMode[modeId] = runAvgTimeSec; // sec
    accuracyByMode[modeId] = clamp01(runAccuracy01); // 0..1

    // perfectByMode (count)
    const perfectByMode = {
      ...ensureObj(prev.perfectByMode, { easy: 0, normal: 0, hard: 0 }),
    };
    const isPerfectRun = answered === safeNum(mode.totalQuestions) && wrong === 0;
    if (isPerfectRun) {
      perfectByMode[modeId] = safeNum(perfectByMode[modeId]) + 1;
    }

    // categories history
    const seen = new Set(ensureArr(prev?.quizUniqueCategories, []));
    for (const qq of questions) {
      if (qq?.categoryId) seen.add(qq.categoryId);
    }

    // IMPORTANT: jangan “ketimpa” sessionsPlayed (sudah naik saat Mulai)
    const sessionsPlayedSafe = safeNum(prev?.sessionsPlayed ?? 0);

    const nextStats = {
      ...prev,

      // lifetime
      attemptTotal: nextAttempt,
      correctTotal: safeNum(prev?.correctTotal) + correct,

      // score lifetime (badgeEngine pakai scoreTotal)
      scoreTotal: nextScoreTotal,
      pointsTotal: Math.max(0, safeNum(prev?.pointsTotal) + modeScore),
      totalPoints: Math.max(0, safeNum(prev?.totalPoints) + modeScore),

      // ✅ campaign progress (0..45, anti dobel tambah)
      campaignByMode: nextCampaignByMode,
      campaignStageIndex: nextStage,
      globalLevel: globalLevelNow,
      globalLevelMax,

      // streak
      streak: safeNum(curStreak),
      bestStreak: Math.max(
        safeNum(prev?.bestStreak),
        safeNum(bestStreak),
        safeNum(curStreak)
      ),

      // time
      avgTimeMs: nextAvgMs,
      lastPlayedAt: Date.now(),

      // keep sessions stable
      sessionsPlayed: sessionsPlayedSafe,

      timeSumByMode,
      timeCountByMode,
      avgTimeByMode,

      correctByMode,
      answeredByMode,
      accuracyByMode,

      perfectByMode,

      lastRunModeStats: {
        ...(ensureObj(prev?.lastRunModeStats, {})),
        [modeId]: {
          correct,
          wrong,
          answered,
          totalTime: runTimeSec,
          avgTime: runAvgTimeSec,
          accuracy: runAccuracy01 * 100,
        },
      },

      quizUniqueCategories: Array.from(seen),
    };

    const saved = await updateStats(nextStats);

    // ctx untuk badge
    const ctx = {
      modeFinished: true,
      modeId,
      globalLevelNow, // campaign progress
      totalQuestions: mode.totalQuestions,
      runAnswered: answered,
      runWrong: wrong,
      runCorrect: correct,
      avgTime: runAvgTimeSec, // sec
      accuracy: runAccuracy01 * 100, // percent
    };

    const earnedIds = getEarnedIds(badges);
    const res = runBadgeEngine(saved, earnedIds, ctx);
    const newlyUnlocked = res?.newlyUnlocked || [];
    const nextEarnedIds = res?.nextEarnedIds || earnedIds;

    if (Array.isArray(newlyUnlocked) && newlyUnlocked.length) {
      // ✅ penting: lanjut mode pakai stats TERBARU
      queueBadgesAndThen(newlyUnlocked, () => goNextAfterMode(saved));

      Promise.resolve(updateBadges(nextEarnedIds)).catch((err) => {
        console.error("updateBadges failed:", err);
      });

      return;
    }

    goNextAfterMode(saved);
  }

  function goNextAfterMode(baseStats) {
    // ✅ tandai bahwa progress ini berasal dari gameplay
      hasLocalProgressRef.current = true;

    const nextStage = clamp(
      safeNum(baseStats?.campaignStageIndex ?? 0),
      0,
      MODE_CONFIGS.length - 1
    );

    // kalau selesai Hard → masuk final screen
    if (mode.id === "hard") {
      finalizeSession(baseStats);
      return;
    }

    // selain Hard → lanjut ke mode sesuai campaign
    setModeIndex(nextStage);
    setPhase("splash");
    setQuestions([]);
    setIdx(0);
    setPicked(undefined);
    setResultState({});

    const nextMode = MODE_CONFIGS[nextStage] || MODE_CONFIGS[0];
    const totalMs = (nextMode.timePerQuestion || 0) * 1000;
    setTimeLeft(nextMode.timePerQuestion);
    setTimeLeftMs(totalMs);
    deadlineRef.current = Date.now() + totalMs;

    questionStartAtRef.current = Date.now();
  }

  async function finalizeSession(baseStats) {
    Telemetry.logEvent("quiz_complete", {
      sessionScore,
      sessionCorrect,
      sessionWrong,
      sessionTimeMs
    });

    // ✅ baseStats = stats TERBARU dari finalizeMode
    const prev = baseStats || stats || {};

    const nextStats = {
      ...prev,
      quizCompleted: safeNum(prev?.quizCompleted) + 1,
      streak: safeNum(curStreak),
      bestStreak: Math.max(
        safeNum(prev?.bestStreak),
        safeNum(bestStreak),
        safeNum(curStreak)
      ),
      lastPlayedAt: Date.now(),
    };

    const saved = await updateStats(nextStats);

    const earnedIds = getEarnedIds(badges);
    const res = runBadgeEngine(saved, earnedIds, {
      globalLevelNow: safeNum(saved?.globalLevel ?? 0),
    });

    const newlyUnlocked = res?.newlyUnlocked || [];
    const nextEarnedIds = res?.nextEarnedIds || earnedIds;

    if (Array.isArray(newlyUnlocked) && newlyUnlocked.length) {
      queueBadgesAndThen(newlyUnlocked, () => setPhase("final"));

      Promise.resolve(updateBadges(nextEarnedIds)).catch((err) => {
        console.error("updateBadges failed:", err);
      });

      return;
    }

    setPhase("final");
  }


  useEffect(() => {
    if (phase !== "stageDone") return;
    finalizeModeAndMoveNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // UI helpers
  const totalScore = useMemo(
    () =>
      stats?.scoreTotal ??
      stats?.pointsTotal ??
      stats?.totalPoints ??
      safeNum(stats?.correctTotal) * 10,
    [stats]
  );
  const sessions = stats?.sessionsPlayed ?? stats?.quizCompleted ?? 0;

  const badgeMeta = activeBadge ? BADGE_META?.[activeBadge] || {} : null;

  let main = null;

  // ---------------- SPLASH ----------------
  if (phase === "splash") {
    main = (
      <div className="space-y-4">
        <section className="ui-card ui-card--pattern ui-card--pad relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-extrabold ui-title">{mode.titleText}</div>
                <div className="mt-1 text-sm ui-muted">
                  Klik <b>Mulai</b> untuk lanjut.
                </div>
              </div>

              {!is.simple ? (
                <div className="flex items-center gap-2">
                  <span className="ui-chip">Total: {totalScore}</span>
                  <span className="ui-chip">Sesi: {sessions}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Jumlah Soal</div>
                <div className="mt-1 text-sm ui-muted">{mode.totalQuestions} soal</div>
              </div>

              <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Timer / Soal</div>
                <div className="mt-1 text-sm ui-muted">{mode.timePerQuestion}s</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => {
                  if (is.complex) playSfx("tap");
                  startModePlay();
                }}
              >
                Mulai
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ---------------- PLAYING ----------------
  if (phase === "playing") {
    if (!q) {
      main = (
        <section className="ui-card ui-card--pad">
          <div className="text-sm ui-muted">Memuat soal...</div>
        </section>
      );
    } else {
      const progressPct = Math.round(((idx + 1) / Math.max(1, questions.length)) * 100);
      const totalMs = (mode.timePerQuestion || 0) * 1000;
      const barPct = totalMs ? Math.round((timeLeftMs / Math.max(1, totalMs)) * 100) : 0;

      // ✅ FEEDBACK: khusus complex ketika salah / timeout
      const pickedDone = picked !== undefined;
      const isTimeoutPick = picked === TIMEOUT_PICK;
      const isCorrectPick = pickedDone && !isTimeoutPick && picked === q.answer;
      const showComplexFeedback = is.complex && pickedDone && !isCorrectPick;

      main = (
        <div className="space-y-4">
          <section className="ui-card ui-card--pad ui-card--pattern relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-extrabold ui-title">Quiz</div>
                  <div className="mt-1 text-sm ui-muted">
                    {q.categoryTitle} • Level {globalLevelNum}/{TOTAL_LEVELS}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="ui-chip">Score: {sessionScore}</span>
                  <span className="ui-chip">
                    {idx + 1}/{questions.length}
                  </span>
                </div>
              </div>

              {/* TIMER */}
              <div className="mt-3">
                {is.simple ? (
                  <div className="text-sm ui-muted">
                    Timer: <b>{formatTime(timeLeft)}</b>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="ui-progress" aria-label="timer">
                      <div
                        className="ui-progress__fill"
                        style={{
                          width: `${clamp(barPct, 0, 100)}%`,
                          transition: "width 50ms linear",
                        }}
                      />
                    </div>
                    <div className="ui-chip">{formatTime(timeLeft)}</div>
                  </div>
                )}
              </div>

              {/* ✅ LAYOUT BARU: kiri gambar, kanan prompt+opsi */}
              <div className={`quiz-qwrap ${q.media?.src ? "has-media" : ""}`}>
                {q.media?.src ? (
                  <aside className="quiz-qmedia">
                    <div className="quiz-media">
                      <img
                        className="quiz-media__img"
                        src={q.media.src}
                        data-fb={q.media.fallbackSrc || ""}
                        alt={q.media.alt || "gambar soal"}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          const fb = img.dataset.fb;
                          if (fb && img.src !== fb) {
                            img.src = fb;
                            return;
                          }
                          img.style.display = "none";
                        }}
                      />
                    </div>
                  </aside>
                ) : null}

                <div className="quiz-qmain">
                  <div className="quiz-prompt">{q.prompt}</div>

                  <div className="quiz-options">
                    {q.options.map((opt) => (
                      <QuizOption
                        key={opt}
                        label={opt}
                        state={resultState?.[opt] || "idle"}
                        disabled={picked !== undefined}
                        onClick={() => revealAnswer(opt)}
                      />
                    ))}
                  </div>

                  {/* ✅ FEEDBACK TEKS: hanya Complex & hanya saat salah/timeout */}
                  {showComplexFeedback ? (
                    <div
                      className="mt-3 ui-card ui-card--pad ui-darkpanel"
                      role="status"
                      aria-live="polite"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--accent) 38%, transparent)",
                      }}
                    >
                      <div className="text-sm font-extrabold">
                        {isTimeoutPick ? "Waktu habis!" : "Masih salah 😅"}
                      </div>
                      <div className="mt-1 text-sm ui-muted">
                        Jawaban yang benar:{" "}
                        <b style={{ color: "color-mix(in srgb, var(--accent) 88%, var(--text))" }}>
                          {q.answer}
                        </b>
                        {(!isTimeoutPick && picked && picked !== TIMEOUT_PICK) ? (
                          <>
                            {" "}
                            • Kamu pilih: <b>{picked}</b>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {!is.simple ? (
                    <div className="quiz-progress ui-muted">Progress: {progressPct}%</div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      );
    }
  }

  // ---------------- STAGE DONE ----------------
  if (phase === "stageDone") {
    main = (
      <div className="space-y-4">
        <section className="ui-card ui-card--pad ui-card--pattern relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-sm ui-muted">Memproses hasil & badge...</div>
          </div>
        </section>
      </div>
    );
  }

  // ---------------- FINAL ----------------
  if (phase === "final") {
    main = (
      <div className="space-y-4">
        <section className="ui-card ui-card--pad ui-card--pattern relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-2xl font-extrabold ui-title">Selesai! 🎉</div>
            <div className="mt-1 text-sm ui-muted">
              Kamu sudah menyelesaikan Easy → Normal → Hard.
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Score</div>
                <div className="mt-1">{sessionScore}</div>
              </div>

              <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Benar</div>
                <div className="mt-1">{sessionCorrect}</div>
              </div>

              <div className="ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                <div className="text-sm font-extrabold">Salah</div>
                <div className="mt-1">{sessionWrong}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => navigate("/home", { replace: true })}
              >
                Kembali ke Home
              </button>

              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                Telemetry.logEvent("quiz_restart", {
                  fromPhase: "final",
                  modeIndexStart: safeNum(stats?.campaignStageIndex ?? 0)
                });

                const s = stats || {};
                const hardCap = safeNum(MODE_CONFIGS.find(m => m.id==="hard")?.totalQuestions ?? 0);
                const hardDone = safeNum(s?.campaignByMode?.hard ?? 0) >= hardCap;
                const globalDone = safeNum(s?.globalLevel ?? 0) >= TOTAL_LEVELS;

                const startIndex = (hardDone || globalDone)
                  ? 0
                  : clamp(safeNum(s?.campaignStageIndex ?? 0), 0, MODE_CONFIGS.length - 1);

                  // ✅ reset lifecycle supaya Firestore boleh menentukan mode lagi
                  quizHasStartedRef.current = false;
                  initStageRef.current = false;

                // ✅ cegah init effect ngubah modeIndex lagi
                // initStageRef.current = true;
                

                setModeIndex(startIndex);
                setPhase("splash");
                setQuestions([]);
                setIdx(0);
                setPicked(undefined);
                setResultState({});

                // reset timer sesuai mode start
                const mm = MODE_CONFIGS[startIndex] || MODE_CONFIGS[0];
                const totalMs = (mm.timePerQuestion || 0) * 1000;
                setTimeLeft(mm.timePerQuestion);
                setTimeLeftMs(totalMs);
                deadlineRef.current = Date.now() + totalMs;

                // reset session UI
                setSessionScore(0);
                setSessionCorrect(0);
                setSessionWrong(0);
                setSessionTimeMs(0);

                // allow new run to count sessionsPlayed again
                sessionStartedRef.current = false;
              }}
              >
                Main Lagi
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!main) return null;

  return (
    <>
      {main}

      {/* Popup badge: tampil di phase apa pun */}
      {activeBadge ? (
        <BadgeUnlockPopup badgeId={activeBadge} meta={badgeMeta} onClose={closeBadgePopup} />
      ) : null}
    </>
  );
}
