// src/pages/Quiz.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { useProgress } from "../hooks/useProgress.js";

import QuizOption from "../components/QuizOption.jsx";
import BadgeUnlockPopup from "../components/BadgeUnlockPopup.jsx";
import ThreeRunnerComplex from "../components/ThreeRunnerComplex.jsx"; // ✅ import complex

import { playSfx, onTimeWarning, unlockAudio, setAudioMode } from "../utils/sfx.js";
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

function shuffleArr(arr) {
  const a = [...(Array.isArray(arr) ? arr : [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  const uiMode = level;
  const isComplex = is.complex;

  const quizHasStartedRef = useRef(false);
  const badgeShownRef = useRef(false);

  const earnedIdsRef = useRef([]);
  useEffect(() => {
    earnedIdsRef.current = getEarnedIds(badges);
  }, [badges]);

  const [modeIndex, setModeIndex] = useState(0);
  const mode = MODE_CONFIGS[modeIndex] || MODE_CONFIGS[0];
  const modeEasy = useMemo(() => MODE_CONFIGS.find((m) => m.id === "easy") || MODE_CONFIGS[0], []);
  const modeNormal = useMemo(() => MODE_CONFIGS.find((m) => m.id === "normal") || MODE_CONFIGS[0], []);
  const modeHard = useMemo(() => MODE_CONFIGS.find((m) => m.id === "hard") || MODE_CONFIGS[0], []);

  const [phase, setPhase] = useState("splash");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);

  const [picked, setPicked] = useState(undefined);
  const [resultState, setResultState] = useState({});

  const [timeLeft, setTimeLeft] = useState(mode.timePerQuestion);
  const [timeLeftMs, setTimeLeftMs] = useState(mode.timePerQuestion * 1000);
  const timerRef = useRef(null);
  const deadlineRef = useRef(0);
  const questionStartAtRef = useRef(Date.now());
  const lastWarnSecRef = useRef(null);

  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [sessionTimeMs, setSessionTimeMs] = useState(0);

  const [curStreak, setCurStreak] = useState(stats?.streak || 0);
  const [bestStreak, setBestStreak] = useState(stats?.bestStreak || 0);

  const [, setBadgeQueue] = useState([]);
  const [activeBadge, setActiveBadge] = useState(null);
  const afterBadgeActionRef = useRef(null);

  const sessionStartedRef = useRef(false);
  const initStageRef = useRef(false);

  const modeRunRef = useRef({ correct: 0, wrong: 0, answered: 0, totalTimeSec: 0 });

  const globalLevelNum = useMemo(() => {
    const before = MODE_CONFIGS.slice(0, modeIndex).reduce((a, m) => a + (m.totalQuestions || 0), 0);
    return before + idx + 1;
  }, [modeIndex, idx]);

  const bankIdxRef = useRef(0);
  useEffect(() => {
    if (phase === "playing" && isComplex) {
      bankIdxRef.current = 0;
    }
  }, [phase, isComplex]);

  const complexBankRef = useRef([]);
  const complexPtrRef = useRef(0);

  const easyBankRef = useRef([]);
  const easyPtrRef = useRef(0);

  const normalBankRef = useRef([]);
  const normalPtrRef = useRef(0);

  const hardBankRef = useRef([]);
  const hardPtrRef = useRef(0);

  useEffect(() => {
    if (phase !== "playing" || !isComplex) return;

    if (questions?.length) {
      complexBankRef.current = shuffleArr(questions);
      complexPtrRef.current = 0;
    } else {
      complexBankRef.current = [];
      complexPtrRef.current = 0;
    }
  }, [phase, isComplex, questions]);

  const q = questions[idx] || null;

  const [resolvedSrc, setResolvedSrc] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);
  const hasMedia = !!q?.media;

  useEffect(() => {
    Telemetry.trackNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      setAudioMode(isComplex ? "complex" : is.medium ? "medium" : "off");
    } catch {}
  }, [isComplex, is.medium]);

  useEffect(() => {
    let alive = true;

    setResolvedSrc(q?.media?.src || null);
    setImgFailed(false);

    const resolver = q?.media?.resolver;
    if (typeof resolver === "function") {
      Promise.resolve(resolver())
        .then((src) => {
          if (!alive) return;
          setResolvedSrc(src || q?.media?.src || null);
        })
        .catch(() => {
          if (!alive) return;
          setResolvedSrc(q?.media?.src || null);
        });
    }

    return () => {
      alive = false;
    };
  }, [q?.id]);

  function getLastGuardianEarnedFromAny() {
    return "";
  }

  const quizOptsFromNav = useMemo(() => {
    const st = location?.state || {};
    const categoryId = st?.categoryId || null;
    const allowedIslands = st?.allowedIslands || null;
    return { categoryId, allowedIslands };
  }, [location]);

  function buildQuestionsForMode() {
    const base = quizOptsFromNav || {};

    const imageRate = mode.id === "easy" ? 0.45 : mode.id === "normal" ? 0.55 : 0.65;
    const inverseRate = mode.id === "easy" ? 0.35 : mode.id === "normal" ? 0.45 : 0.55;

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

    lastWarnSecRef.current = null;
  }

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
      allowedIslands: quizOptsFromNav?.allowedIslands ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, modeIndex]);

  function markSessionStartedOnce() {
    if (sessionStartedRef.current) return false;
    sessionStartedRef.current = true;
    return true;
  }

  async function startModePlay() {
    Telemetry.trackClick();
    quizHasStartedRef.current = true;

    try {
      Promise.resolve(unlockAudio()).catch(() => {});
    } catch {}

    const shouldIncSession = markSessionStartedOnce();

    let qs = [];

    if (isComplex) {
      const base = quizOptsFromNav || {};
      const imageVariant = "asli";

      const buildByMode = (m) => {
        const imageRate = m.id === "easy" ? 0.45 : m.id === "normal" ? 0.55 : 0.65;
        const inverseRate = m.id === "easy" ? 0.35 : m.id === "normal" ? 0.45 : 0.55;

        // ✅ paksa pulau sesuai MODE_PULAU di builder (easy/normal/hard)
        // supaya tidak ketimpa oleh base.allowedIslands dari navigation
        const stageBase = { ...base };
        delete stageBase.allowedIslands;

        return buildMixedQuizQuestions(nusantaraData, m.totalQuestions, {
          ...stageBase,
          modeId: m.id,
          imageRate,
          inverseRate,
          optionsCount: 3,
          imageVariant,
          uiLevel: level,
        });
      };

      const easyQs = buildByMode(modeEasy).map((q) => ({ ...q, __modeId: "easy" }));
      const normalQs = buildByMode(modeNormal).map((q) => ({ ...q, __modeId: "normal" }));
      const hardQs = buildByMode(modeHard).map((q) => ({ ...q, __modeId: "hard" }));

      easyBankRef.current = shuffleArr(easyQs);
      easyPtrRef.current = 0;

      normalBankRef.current = shuffleArr(normalQs);
      normalPtrRef.current = 0;

      hardBankRef.current = shuffleArr(hardQs);
      hardPtrRef.current = 0;

      qs = [...easyQs, ...normalQs, ...hardQs];
    } else {
      qs = buildQuestionsForMode();
    }

    setQuestions(qs);
    setIdx(0);
    setPicked(undefined);
    setResultState({});
    resetTimerForQuestion();
    setPhase("playing");

    try {
      const prev = stats || {};
      const next = {
        ...prev,
        sessionsPlayed: shouldIncSession
          ? safeNum(prev?.sessionsPlayed ?? prev?.quizCompleted ?? 0) + 1
          : safeNum(prev?.sessionsPlayed ?? 0),
        lastPlayedAt: Date.now(),
        lastQuizModeId: mode?.id ?? null,
        lastQuizModeIndex: safeNum(modeIndex ?? 0),
        lastQuizTouchedAt: Date.now(),
      };

      Promise.resolve(updateStats(next)).catch((e) => {
        console.warn("startModePlay updateStats failed:", e);
      });
    } catch (e) {
      console.warn("startModePlay updateStats exception:", e);
    }

    if (isComplex || is.medium) {
      try {
        playSfx("tap");
      } catch {}
    }

    Telemetry.logEvent("quiz_start_mode", { modeId: mode?.id ?? null, modeIndex });
  }

  const autoStartComplexRef = useRef(false);

  useEffect(() => {
    if (!isComplex) return;
    if (phase !== "splash") return;
    if (!stats) return;
    if (autoStartComplexRef.current) return;
    autoStartComplexRef.current = true;

    startModePlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplex, phase, stats]);

  function queueBadgesAndThen(ids = [], action = null) {
    if (badgeShownRef.current) {
      action?.();
      return;
    }

    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!list.length) {
      action?.();
      return;
    }

    badgeShownRef.current = true;
    afterBadgeActionRef.current = action;

    setBadgeQueue(list);
    setActiveBadge(list[0]);
  }

  function closeBadgePopup() {
    setBadgeQueue((prev) => {
      const next = prev.slice(1);
      const nextId = next[0] || null;

      setActiveBadge(nextId);

      if (!nextId) {
        badgeShownRef.current = false;
        const act = afterBadgeActionRef.current;
        afterBadgeActionRef.current = null;
        act?.();
      }

      return next;
    });
  }

  useEffect(() => {
    if (!activeBadge) return;
    if (!isComplex) return;
    try {
      playSfx("badge");
    } catch {}
  }, [activeBadge, isComplex]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;
    if (picked !== undefined) return;
    if (isComplex) return;

    if (!deadlineRef.current || deadlineRef.current <= Date.now()) {
      resetTimerForQuestion();
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const tick = is.medium ? 100 : 50;

    const runTick = () => {
      const remain = Math.max(0, deadlineRef.current - Date.now());
      const sec = Math.ceil(remain / 1000);

      setTimeLeftMs(remain);
      setTimeLeft(sec);

      if (sec !== lastWarnSecRef.current) {
        lastWarnSecRef.current = sec;
        if (sec <= 3) onTimeWarning(sec);
      }
    };

    runTick();
    timerRef.current = setInterval(runTick, tick);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q?.id, picked, is.medium, isComplex]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;
    if (picked !== undefined) return;
    if (isComplex) return;
    if (timeLeft > 0) return;

    revealAnswer(TIMEOUT_PICK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, picked, q, isComplex]);

  useEffect(() => {
    if (phase === "splash") {
      const totalMs = (mode.timePerQuestion || 0) * 1000;
      setTimeLeft(mode.timePerQuestion);
      setTimeLeftMs(totalMs);
      deadlineRef.current = Date.now() + totalMs;

      lastWarnSecRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeIndex, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    modeRunRef.current = { correct: 0, wrong: 0, answered: 0, totalTimeSec: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, modeIndex]);

  const lastShownKeyRef = useRef("");
  useEffect(() => {
    if (phase !== "playing") return;
    if (!q) return;
    if (isComplex) return;

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
      hasImage: !!q?.media?.src,
    });
  }, [phase, q, idx, modeIndex, mode?.id, globalLevelNum, isComplex]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (picked === undefined) return;
    if (!q) return;
    if (isComplex) return;

    const isTimeout = picked === TIMEOUT_PICK;
    const isCorrectPick = !isTimeout && picked === q.answer;

    modeRunRef.current.answered += 1;
    if (isCorrectPick) modeRunRef.current.correct += 1;
    else modeRunRef.current.wrong += 1;

    const now = Date.now();
    const startedAt = questionStartAtRef.current || now;
    const spentSec = clamp((now - startedAt) / 1000, 0, mode.timePerQuestion || 0);
    modeRunRef.current.totalTimeSec += spentSec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, isComplex]);

  function revealAnswer(choice) {
    if (!q) return;
    if (picked !== undefined) return;

    setPicked(choice);

    const isTimeout = choice === TIMEOUT_PICK;
    const isCorrectPick = !isTimeout && choice === q.answer;

    const map = {};

    for (const opt of q.options) {
      if (opt === q.answer) map[opt] = "correct";
      else if (!isTimeout && opt === choice) map[opt] = "wrong";
      else map[opt] = "idle";
    }

    setResultState(map);

    const now = Date.now();
    const elapsedMs = Math.max(0, now - (questionStartAtRef.current || now));
    setSessionTimeMs((t) => t + elapsedMs);

    const questionId = q?.id ?? q?.questionId ?? `${mode?.id ?? "mode"}_${modeIndex}_${idx}`;
    const category = q?.categoryId ?? q?.categoryTitle ?? null;

    Telemetry.trackAnswer({
      questionId,
      category,
      isCorrect: isCorrectPick,
      timeMs: elapsedMs,
      extra: {
        modeId: mode?.id ?? null,
        modeIndex,
        idx,
        globalLevelNum,
        picked: choice,
        timeout: isTimeout,
      },
    });

    setCurStreak((s) => {
      const next = isCorrectPick ? s + 1 : 0;
      setBestStreak((b) => Math.max(b, next));
      return next;
    });

    const delta = isCorrectPick ? mode.scoreCorrect : mode.scoreWrong;
    setSessionScore((s) => Math.max(0, s + delta));
    if (isCorrectPick) setSessionCorrect((c) => c + 1);
    else setSessionWrong((w) => w + 1);

    if (is.medium) {
      try {
        playSfx("tap");
      } catch {}
      try {
        if (isCorrectPick) playSfx("correct");
        else playSfx("wrong");
      } catch {}
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const nextIdx = idx + 1;

    setTimeout(() => {
      if (nextIdx >= questions.length) {
        setPhase("stageDone");
      } else {
        setIdx(nextIdx);
        setPicked(undefined);
        setResultState({});
        resetTimerForQuestion();
      }
    }, is.simple ? 650 : 1050);
  }

  async function finalizeModeAndMoveNext() {
    const modeId = mode.id;

    const answered = safeNum(modeRunRef.current.answered);
    const correct = safeNum(modeRunRef.current.correct);
    const wrong = safeNum(modeRunRef.current.wrong);
    const runTimeSec = safeNum(modeRunRef.current.totalTimeSec);

    Telemetry.logEvent("mode_complete", { modeId, modeIndex, answered, correct, wrong, runTimeSec });

    const modeScore = correct * safeNum(mode.scoreCorrect) + wrong * safeNum(mode.scoreWrong);

    const prev = stats || {};

    const prevAttempt = safeNum(prev?.attemptTotal ?? 0);
    const nextAttempt = prevAttempt + answered;

    const prevScoreTotal = safeNum(prev?.scoreTotal ?? prev?.pointsTotal ?? prev?.totalPoints ?? 0);
    const nextScoreTotal = Math.max(0, prevScoreTotal + modeScore);

    const prevCampaignByMode = {
      ...ensureObj(prev?.campaignByMode, { easy: 0, normal: 0, hard: 0 }),
    };

    const nextCampaignByMode = {
      ...prevCampaignByMode,
      [modeId]: Math.max(safeNum(prevCampaignByMode?.[modeId] ?? 0), safeNum(mode.totalQuestions ?? 0)),
    };

    const globalLevelNow = MODE_CONFIGS.reduce((sum, m) => {
      const got = safeNum(nextCampaignByMode?.[m.id] ?? 0);
      const cap = safeNum(m.totalQuestions ?? 0);
      return sum + Math.min(got, cap);
    }, 0);

    const prevGLMax = safeNum(prev?.globalLevelMax ?? prev?.globalLevel ?? 0);
    const globalLevelMax = Math.max(prevGLMax, globalLevelNow);

    let nextStage;
    if (modeId !== "hard") nextStage = clamp(modeIndex + 1, 0, MODE_CONFIGS.length - 1);
    else nextStage = 0;

    const timeSumByMode = { ...ensureObj(prev.timeSumByMode, { easy: 0, normal: 0, hard: 0 }) };
    const timeCountByMode = { ...ensureObj(prev.timeCountByMode, { easy: 0, normal: 0, hard: 0 }) };
    const correctByMode = { ...ensureObj(prev.correctByMode, { easy: 0, normal: 0, hard: 0 }) };
    const answeredByMode = { ...ensureObj(prev.answeredByMode, { easy: 0, normal: 0, hard: 0 }) };

    timeSumByMode[modeId] = safeNum(timeSumByMode[modeId]) + runTimeSec;
    timeCountByMode[modeId] = safeNum(timeCountByMode[modeId]) + answered;

    correctByMode[modeId] = safeNum(correctByMode[modeId]) + correct;
    answeredByMode[modeId] = safeNum(answeredByMode[modeId]) + answered;

    const totalTimeBefore = safeNum(prev?.avgTimeMs ?? 0) * prevAttempt;
    const totalTimeNow = totalTimeBefore + safeNum(sessionTimeMs);
    const nextAvgMs = nextAttempt ? Math.round(totalTimeNow / nextAttempt) : 0;

    const avgTimeByMode = { ...ensureObj(prev.avgTimeByMode, { easy: 0, normal: 0, hard: 0 }) };
    const accuracyByMode = { ...ensureObj(prev.accuracyByMode, { easy: 0, normal: 0, hard: 0 }) };

    const runAvgTimeSec = answered ? runTimeSec / answered : 0;
    const runAccuracy01 = answered ? correct / answered : 0;

    avgTimeByMode[modeId] = runAvgTimeSec;
    accuracyByMode[modeId] = clamp01(runAccuracy01);

    const perfectByMode = { ...ensureObj(prev.perfectByMode, { easy: 0, normal: 0, hard: 0 }) };
    const isPerfectRun = answered === safeNum(mode.totalQuestions) && wrong === 0;
    if (isPerfectRun) perfectByMode[modeId] = safeNum(perfectByMode[modeId]) + 1;

    const seen = new Set(ensureArr(prev?.quizUniqueCategories, []));
    for (const qq2 of questions) {
      if (qq2?.categoryId) seen.add(qq2.categoryId);
    }

    const sessionsPlayedSafe = safeNum(prev?.sessionsPlayed ?? 0);

    const nextStats = {
      ...prev,
      attemptTotal: nextAttempt,
      correctTotal: safeNum(prev?.correctTotal) + correct,

      scoreTotal: nextScoreTotal,
      pointsTotal: Math.max(0, safeNum(prev?.pointsTotal) + modeScore),
      totalPoints: Math.max(0, safeNum(prev?.totalPoints) + modeScore),

      campaignByMode: nextCampaignByMode,
      campaignStageIndex: nextStage,
      globalLevel: globalLevelNow,
      globalLevelMax,

      streak: safeNum(curStreak),
      bestStreak: Math.max(safeNum(prev?.bestStreak), safeNum(bestStreak), safeNum(curStreak)),

      avgTimeMs: nextAvgMs,
      lastPlayedAt: Date.now(),

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

    const earnedBefore = earnedIdsRef.current.length ? [...earnedIdsRef.current] : getEarnedIds(badges);

    const ctx = {
      modeFinished: true,
      modeId,
      globalLevelNow,
      totalQuestions: mode.totalQuestions,
      runAnswered: answered,
      runWrong: wrong,
      runCorrect: correct,
      avgTime: runAvgTimeSec,
      accuracy: runAccuracy01 * 100,
    };

    const res = runBadgeEngine(nextStats, earnedBefore, ctx);

    const newlyUnlocked = Array.from(new Set(res?.newlyUnlocked || []));
    const nextEarnedIds = res?.nextEarnedIds || earnedBefore;

    earnedIdsRef.current = nextEarnedIds;

    Promise.resolve(updateStats(nextStats)).catch((e) => {
      console.warn("finalizeModeAndMoveNext updateStats failed:", e);
    });

    if (newlyUnlocked.length) {
      queueBadgesAndThen(newlyUnlocked, () => goNextAfterMode(nextStats));
      Promise.resolve(updateBadges(nextEarnedIds)).catch((err) => console.error("updateBadges failed:", err));
      return;
    }

    goNextAfterMode(nextStats);
  }

  function goNextAfterMode(baseStats) {
    const nextStage = clamp(safeNum(baseStats?.campaignStageIndex ?? 0), 0, MODE_CONFIGS.length - 1);

    if (mode.id === "hard") {
      finalizeSession(baseStats);
      return;
    }

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
    Telemetry.logEvent("quiz_complete", { sessionScore, sessionCorrect, sessionWrong, sessionTimeMs });

    const prev = baseStats || stats || {};
    const nextStats = {
      ...prev,
      quizCompleted: safeNum(prev?.quizCompleted) + 1,
      streak: safeNum(curStreak),
      bestStreak: Math.max(safeNum(prev?.bestStreak), safeNum(bestStreak), safeNum(curStreak)),
      lastPlayedAt: Date.now(),
    };

    const earnedBefore = earnedIdsRef.current.length ? [...earnedIdsRef.current] : getEarnedIds(badges);
    const res = runBadgeEngine(nextStats, earnedBefore, { globalLevelNow: safeNum(nextStats?.globalLevel ?? 0) });

    const newlyUnlocked = Array.from(new Set(res?.newlyUnlocked || []));
    const nextEarnedIds = res?.nextEarnedIds || earnedBefore;

    earnedIdsRef.current = nextEarnedIds;

    Promise.resolve(updateStats(nextStats)).catch((e) => {
      console.warn("finalizeSession updateStats failed:", e);
    });

    if (newlyUnlocked.length) {
      queueBadgesAndThen(newlyUnlocked, () => setPhase("final"));
      Promise.resolve(updateBadges(nextEarnedIds)).catch((err) => console.error("updateBadges failed:", err));
      return;
    }

    setPhase("final");
  }

  useEffect(() => {
    if (phase !== "stageDone") return;
    finalizeModeAndMoveNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const badgeMeta = activeBadge ? BADGE_META?.[activeBadge] || {} : null;

  useEffect(() => {
    if (!stats) return;

    if (quizHasStartedRef.current) return;
    if (initStageRef.current) return;
    initStageRef.current = true;

    const globalMax = safeNum(stats?.globalLevelMax ?? 0);

    if (globalMax >= TOTAL_LEVELS) {
      setModeIndex(0);
      setPhase("splash");
      return;
    }

    const lastModeId = String(stats?.lastQuizModeId || "").trim();
    const byMode = ensureObj(stats?.campaignByMode, { easy: 0, normal: 0, hard: 0 });

    const lastCfg = MODE_CONFIGS.find((m) => m.id === lastModeId) || null;
    const lastDone = lastCfg
      ? safeNum(byMode?.[lastModeId] ?? 0) >= safeNum(lastCfg.totalQuestions ?? 0)
      : true;

    if (lastCfg && !lastDone) {
      const idxLast = MODE_CONFIGS.findIndex((m) => m.id === lastModeId);
      setModeIndex(clamp(idxLast, 0, MODE_CONFIGS.length - 1));
      setPhase("splash");
      return;
    }

    const campaignStage = safeNum(stats?.campaignStageIndex ?? 0);
    setModeIndex(clamp(campaignStage, 0, MODE_CONFIGS.length - 1));
    setPhase("splash");
  }, [stats]);

  // ---------------- UI render ----------------
  let main = null;

  function cardPropsForPhase() {
    if (!is.medium) {
      return {
        className: "ui-card ui-card--pad ui-card--pattern relative overflow-hidden",
        style: undefined,
      };
    }

    return {
      className: "ui-card ui-card--pad relative overflow-hidden",
      style: { background: "var(--surface-1)" },
    };
  }

  if (phase === "splash") {
    if (isComplex) {
      main = (
        <section className="ui-card ui-card--pad">
          <div className="text-sm ui-muted">Memuat world & soal...</div>
        </section>
      );
    } else {
      const cp = cardPropsForPhase();

      main = (
        <div className="space-y-4">
          <section {...cp}>
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-extrabold ui-title">{mode.titleText}</div>
                  <div className="mt-1 text-sm ui-muted">
                    Klik <b>Mulai</b> untuk lanjut.
                  </div>
                </div>
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
                    Telemetry.trackClick();
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
  }

  if (phase === "playing") {
    if (isComplex) {
      if (!questions?.length) {
        main = (
          <section className="ui-card ui-card--pad">
            <div className="text-sm ui-muted">Memuat world & soal...</div>
          </section>
        );
      } else {
        const getNextQuestion = (stageKey) => {
          const pullFrom = (bankRef, ptrRef) => {
            let bank = bankRef.current || [];
            const len = bank.length;
            if (!len) return null;

            let ptr = Number(ptrRef.current || 0);
            if (ptr >= len || ptr < 0) {
              bank = shuffleArr(bank);
              bankRef.current = bank;
              ptr = 0;
            }

            const qx = bank[ptr];
            ptr += 1;

            if (ptr >= len) {
              bankRef.current = shuffleArr(bank);
              ptrRef.current = 0;
            } else {
              ptrRef.current = ptr;
            }

            return qx || bank[0] || null;
          };

          if (stageKey === "easy") return pullFrom(easyBankRef, easyPtrRef);
          if (stageKey === "normal") return pullFrom(normalBankRef, normalPtrRef);
          return pullFrom(hardBankRef, hardPtrRef);
        };

        main = (
          <ThreeRunnerComplex
            totalQuestions={mode.totalQuestions}
            timePerQuestionSec={mode.timePerQuestion}
            timeByStage={{
              easy: modeEasy.timePerQuestion,
              normal: modeNormal.timePerQuestion,
              hard: modeHard.timePerQuestion,
            }}
            bridgePieces={15}
            score={sessionScore}
            getNextQuestion={getNextQuestion}
            onAnswered={({ ok, timeMs, question, picked: pickedOpt }) => {
              modeRunRef.current.answered += 1;
              if (ok) modeRunRef.current.correct += 1;
              else modeRunRef.current.wrong += 1;
              modeRunRef.current.totalTimeSec += Math.max(0, timeMs / 1000);

              setSessionTimeMs((t) => t + timeMs);
              const qModeId = question?.__modeId || "hard";
              const cfg = MODE_CONFIGS.find((m) => m.id === qModeId) || modeHard;
              const delta = ok ? cfg.scoreCorrect : cfg.scoreWrong;
              setSessionScore((s) => Math.max(0, s + delta));
              if (ok) setSessionCorrect((c) => c + 1);
              else setSessionWrong((w) => w + 1);

              setCurStreak((s) => {
                const next = ok ? s + 1 : 0;
                setBestStreak((b) => Math.max(b, next));
                return next;
              });

              try {
                const questionId = question?.id ?? question?.questionId ?? `runner_${bankIdxRef.current}`;
                const category = question?.categoryId ?? question?.categoryTitle ?? null;
                Telemetry.trackAnswer({
                  questionId,
                  category,
                  isCorrect: ok,
                  timeMs,
                  extra: { modeId: mode?.id ?? null, modeIndex, runner: true, picked: pickedOpt },
                });
              } catch {}

              try {
                playSfx("tap");
                if (ok) playSfx("correct");
                else playSfx("wrong");
              } catch {}
            }}
            onFinished={() => setPhase("stageDone")}
            onGameOver={() => setPhase("stageDone")}
          />
        );
      }
    } else {
      const cp = cardPropsForPhase();

      if (!q) {
        main = (
          <section className="ui-card ui-card--pad">
            <div className="text-sm ui-muted">Memuat soal...</div>
          </section>
        );
      } else {
        const totalMs = (mode.timePerQuestion || 0) * 1000;
        const barPct = totalMs ? Math.round((timeLeftMs / Math.max(1, totalMs)) * 100) : 0;

        const pickedDone = picked !== undefined;
        const isTimeoutPick = picked === TIMEOUT_PICK;
        const isCorrectPick = pickedDone && !isTimeoutPick && picked === q.answer;

        main = (
          <div className="space-y-4">
            <section {...cp}>
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-extrabold ui-title">Quiz</div>
                    <div className="mt-1 text-sm ui-muted">
                      {q.categoryTitle} • Level {globalLevelNum}/{TOTAL_LEVELS}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="ui-chip">Score: {sessionScore}</span>
                    <span className="ui-chip">
                      {idx + 1}/{questions.length}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  {is.simple ? (
                    <div className="text-sm ui-muted">
                      Timer: <b>{formatTime(timeLeft)}</b>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="ui-progress" aria-label="timer">
                        <div
                          className="ui-progress__fill"
                          style={{
                            width: `${clamp(barPct, 0, 100)}%`,
                            transition: "width 100ms linear",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`quiz-qwrap ${hasMedia ? "has-media" : ""}`}>
                  {q.media ? (
                    <aside className="quiz-qmedia">
                      <div className="quiz-media">
                        {resolvedSrc ? (
                          <img
                            className="quiz-media__img"
                            src={imgFailed ? q.media.fallbackSrc : resolvedSrc}
                            alt={q.media.alt || "gambar soal"}
                            loading="lazy"
                            onError={() => setImgFailed(true)}
                          />
                        ) : (
                          <div className="quiz-media__skeleton" />
                        )}
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
                          ui={uiMode}
                          state={resultState?.[opt] || "idle"}
                          disabled={picked !== undefined}
                          onClick={() => {
                            Telemetry.trackClick();
                            revealAnswer(opt);
                          }}
                        />
                      ))}
                    </div>

                    {is.medium && pickedDone && !isCorrectPick ? (
                      <div
                        className="mt-3 ui-card ui-card--pad ui-darkpanel bn-feedback"
                        role="status"
                        aria-live="polite"
                        style={{
                          border: "1px solid color-mix(in srgb, var(--accent) 38%, transparent)",
                        }}
                      >
                        <div className="bn-feedback__title">{isTimeoutPick ? "Waktu habis!" : "Masih salah 😅"}</div>

                        <div className="bn-feedback__row">
                          Jawaban yang benar: <b className="bn-feedback__answer">{q.answer}</b>
                          {!isTimeoutPick && picked && picked !== TIMEOUT_PICK ? (
                            <>
                              {" "}
                              ~ Kamu pilih: <b className="bn-feedback__picked">{picked}</b>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
      }
    }
  }

  if (phase === "stageDone") {
    const cp = cardPropsForPhase();
    main = (
      <div className="space-y-4">
        <section {...cp}>
          <div className="relative z-10">
            <div className="text-sm ui-muted">Memproses hasil & badge...</div>
          </div>
        </section>
      </div>
    );
  }

  if (phase === "final") {
    const cp = cardPropsForPhase();

    main = (
      <div className="space-y-4">
        <section {...cp}>
          <div className="relative z-10">
            <div className="text-2xl font-extrabold ui-title">Selesai! 🎉</div>

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
                onClick={() => {
                  Telemetry.trackClick();
                  Telemetry.trackNavigation();
                  navigate("/home", { replace: true });
                }}
              >
                Kembali ke Home
              </button>

              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  Telemetry.trackClick();

                  Telemetry.logEvent("quiz_restart", {
                    fromPhase: "final",
                    modeIndexStart: safeNum(stats?.campaignStageIndex ?? 0),
                  });

                  const s = stats || {};
                  const hardCap = safeNum(MODE_CONFIGS.find((m) => m.id === "hard")?.totalQuestions ?? 0);
                  const hardDone = safeNum(s?.campaignByMode?.hard ?? 0) >= hardCap;
                  const globalDone = safeNum(s?.globalLevel ?? 0) >= TOTAL_LEVELS;

                  const startIndex =
                    hardDone || globalDone ? 0 : clamp(safeNum(s?.campaignStageIndex ?? 0), 0, MODE_CONFIGS.length - 1);

                  quizHasStartedRef.current = false;
                  sessionStartedRef.current = false;
                  badgeShownRef.current = false;

                  setModeIndex(startIndex);
                  setPhase("splash");
                  setQuestions([]);
                  setIdx(0);
                  setPicked(undefined);
                  setResultState({});

                  const mm = MODE_CONFIGS[startIndex] || MODE_CONFIGS[0];
                  const totalMs = (mm.timePerQuestion || 0) * 1000;
                  setTimeLeft(mm.timePerQuestion);
                  setTimeLeftMs(totalMs);
                  deadlineRef.current = Date.now() + totalMs;

                  setSessionScore(0);
                  setSessionCorrect(0);
                  setSessionWrong(0);
                  setSessionTimeMs(0);

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
      {activeBadge ? (
        <BadgeUnlockPopup key={activeBadge} badgeId={activeBadge} meta={badgeMeta} onClose={closeBadgePopup} />
      ) : null}
    </>
  );
}