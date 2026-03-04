// src/components/ThreeRunnerComplex.jsx
import React, { useEffect, useRef, useState } from "react";
import nusantaraData from "../data/nusantaraData";
import { playSfx } from "../utils/sfx";
import BadgeUnlockPopup from "./BadgeUnlockPopup";
import Telemetry from "../utils/telemetry"; // ✅ telemetry integration

/* =========================================================
   Helpers
========================================================= */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function norm(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
function normNoSpace(s) {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

const GUARDIAN_IMAGES = Array.from({ length: 11 }, (_, i) => `/images/guardian/npc${i + 1}.png`);
function pickRandomGuardian() {
  return GUARDIAN_IMAGES[Math.floor(Math.random() * GUARDIAN_IMAGES.length)];
}
function weightedPick(items) {
  const total = items.reduce((a, b) => a + (b.w || 0), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w || 0;
    if (r <= 0) return it.key;
  }
  return items[items.length - 1]?.key;
}

/* ===================== Gate assets per island ===================== */
function gateAssetForRegion(region) {
  const r = norm(region);
  if (r.includes("sumatera")) return "/images/asset/gerbang_sumatera.png";
  if (r.includes("jawa")) return "/images/asset/gerbang_jawa.png";
  if (r.includes("kalimantan")) return "/images/asset/gerbang_kalimantan.png";
  if (r.includes("sulawesi")) return "/images/asset/gerbang_sulawesi.png";
  if (r.includes("papua")) return "/images/asset/gerbang_papua.png";
  if (r.includes("maluku")) return "/images/asset/gerbang_maluku.png";
  if (r.includes("nusa tenggara") || r.includes("nusatenggara")) return "/images/asset/gerbang_nusatenggara.png";
  if (r.includes("bali")) return "/images/asset/gerbang_bali.png";
  return "/images/asset/gerbang_sumatera.png";
}

/* ===================== Mixed Question System (Nusantara) ===================== */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uniqNonEmpty(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    const s = (v ?? "").toString().trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}
function makeOptions(correct, pool, count = 4) {
  const other = shuffle(uniqNonEmpty(pool).filter((x) => norm(x) !== norm(correct)));
  const opts = shuffle([correct, ...other.slice(0, Math.max(0, count - 1))]);
  return opts.slice(0, count);
}
function weightedPickType(items) {
  const total = items.reduce((a, b) => a + (b.w || 0), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w || 0;
    if (r <= 0) return it.type;
  }
  return items[items.length - 1]?.type || "mcq";
}
function makeId(prefix = "q") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
function pickProvinceByIslandStrict(island) {
  const list = nusantaraData.filter((p) => norm(p.island) === norm(island));
  if (list.length) return list[Math.floor(Math.random() * list.length)];
  return nusantaraData[Math.floor(Math.random() * nusantaraData.length)];
}
function poolForField(island, fieldKey) {
  const sameIsland = nusantaraData.filter((x) => norm(x.island) === norm(island));
  return sameIsland.map((x) => (x?.[fieldKey] ?? "").toString().trim()).filter(Boolean);
}
function provincePoolByIsland(island) {
  const sameIsland = nusantaraData.filter((x) => norm(x.island) === norm(island));
  return sameIsland.length ? sameIsland : nusantaraData;
}

/* ===================== LABEL INDONESIA ===================== */
const FIELD_LABEL_ID = {
  capital: "Ibu Kota",
  traditionalFood: "Makanan Khas",
  traditionalHouse: "Rumah Adat",
  island: "Pulau",
  traditionalDance: "Tarian Daerah",
  traditionalInstrument: "Alat Musik",
  traditionalWeapon: "Senjata Daerah",
  iconicAnimal: "Hewan Ikonik",
  provinceImage: "Provinsi",
};
function labelIdForFieldKey(key) {
  return FIELD_LABEL_ID[key] || key;
}

/* ===================== Scramble jadi suku kata ===================== */
function syllabifyId(word) {
  const w = (word ?? "").toString().trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return [];

  const vowels = new Set(["a", "i", "u", "e", "o"]);
  const out = [];
  let cur = "";

  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const next = w[i + 1] || "";
    const next2 = w[i + 2] || "";
    cur += ch;

    const isV = vowels.has(ch);
    if (!isV) continue;

    if (!next) {
      out.push(cur);
      cur = "";
      break;
    }

    const nextIsV = vowels.has(next);
    const next2IsV = vowels.has(next2);

    if (nextIsV) {
      out.push(cur);
      cur = "";
      continue;
    }

    if (next && next2 && next2IsV) {
      out.push(cur);
      cur = "";
      continue;
    }

    if (next) {
      cur += next;
      i += 1;
      out.push(cur);
      cur = "";
    }
  }

  if (cur) out.push(cur);
  return out.filter(Boolean);
}

const FIELD_BANK = {
  easy: [
    { key: "capital", label: "Ibu Kota" },
    { key: "traditionalFood", label: "Makanan Khas" },
    { key: "traditionalHouse", label: "Rumah Adat" },
    { key: "island", label: "Pulau" },
  ],
  normal: [
    { key: "traditionalDance", label: "Tarian Daerah" },
    { key: "traditionalInstrument", label: "Alat Musik" },
    { key: "traditionalWeapon", label: "Senjata Daerah" },
    { key: "capital", label: "Ibu Kota" },
  ],
  hard: [
    { key: "traditionalDance", label: "Tarian Daerah" },
    { key: "traditionalInstrument", label: "Alat Musik" },
    { key: "traditionalWeapon", label: "Senjata Daerah" },
    { key: "iconicAnimal", label: "Hewan Ikonik" },
    { key: "traditionalHouse", label: "Rumah Adat" },
    { key: "traditionalFood", label: "Makanan Khas" },
  ],
};

function pickFieldForProvince(p, stageKey) {
  const bank = FIELD_BANK[stageKey] || FIELD_BANK.easy;
  const available = bank.filter((f) => ((p?.[f.key] ?? "").toString().trim().length > 0));
  const list = available.length ? available : bank;
  return list[Math.floor(Math.random() * list.length)];
}

function makeMCQ(island, stageKey, usedProvIds) {
  const prov = pickProvinceByIslandStrict(island);
  if (prov?.id && usedProvIds?.has(prov.id) && nusantaraData.length > 3) return null;
  if (prov?.id) usedProvIds?.add(prov.id);

  const field = pickFieldForProvince(prov, stageKey);
  const answer = (prov?.[field.key] ?? "").toString().trim() || "Unknown";

  let pool;
  if (field.key === "island") pool = uniqNonEmpty(nusantaraData.map((x) => x.island));
  else if (field.key === "capital") pool = uniqNonEmpty(nusantaraData.map((x) => x.capital));
  else pool = poolForField(island, field.key);

  const options = makeOptions(answer, pool, 4);

  return {
    id: makeId("mcq"),
    type: "mcq",
    prompt: `Apa ${field.label} dari ${prov.province}?`,
    options,
    answer,
    meta: { provinceId: prov.id, province: prov.province, island: prov.island, field: field.key, fieldLabel: field.label },
  };
}

function makeTF(island, stageKey) {
  const prov = pickProvinceByIslandStrict(island);
  const field = pickFieldForProvince(prov, stageKey);

  const correctValue = (prov?.[field.key] ?? "").toString().trim();
  if (!correctValue) return null;

  const makeTrue = Math.random() < 0.5;
  let statedValue = correctValue;
  let correctBool = true;

  if (!makeTrue) {
    const pool = field.key === "capital" ? uniqNonEmpty(nusantaraData.map((x) => x.capital)) : poolForField(island, field.key);
    const wrongs = pool.filter((x) => norm(x) !== norm(correctValue));
    if (wrongs.length) {
      statedValue = wrongs[Math.floor(Math.random() * wrongs.length)];
      correctBool = false;
    }
  }

  return {
    id: makeId("tf"),
    type: "tf",
    prompt: "",
    statement: `${statedValue} adalah ${field.label} ${prov.province}.`,
    answer: correctBool,
    meta: { provinceId: prov.id, province: prov.province, island: prov.island, field: field.key, fieldLabel: field.label, correctValue },
  };
}

function makeScramble(island, stageKey) {
  const prov = pickProvinceByIslandStrict(island);

  const preferred = ["capital", "traditionalFood", "traditionalHouse", "traditionalDance", "traditionalInstrument", "traditionalWeapon", "iconicAnimal"];
  const bank = FIELD_BANK[stageKey] || FIELD_BANK.easy;

  const candidates = preferred
    .map((k) => bank.find((b) => b.key === k) || { key: k, label: labelIdForFieldKey(k) })
    .filter((f) => ((prov?.[f.key] ?? "").toString().trim().length > 0));

  const pickFrom = candidates.length ? candidates : bank;
  const field = pickFrom[Math.floor(Math.random() * pickFrom.length)];

  const answer = (prov?.[field.key] ?? "").toString().trim();
  if (!answer) return null;

  const raw = answer.replace(/\s+/g, "");
  const sylls = syllabifyId(raw);
  if (sylls.length < 2) return null;

  const tokens = shuffle(sylls.map((s) => s.toUpperCase()));

  return {
    id: makeId("scr"),
    type: "scramble",
    prompt: `Susun ${field.label} dari ${prov.province}.`,
    tokens,
    answer,
    meta: { provinceId: prov.id, province: prov.province, island: prov.island, field: field.key, fieldLabel: field.label },
  };
}

function makeOddOneOut(island, stageKey) {
  const poolProv = provincePoolByIsland(island);
  const prov = poolProv[Math.floor(Math.random() * poolProv.length)];
  const field = pickFieldForProvince(prov, stageKey);

  const correctValue = (prov?.[field.key] ?? "").toString().trim();
  if (!correctValue) return null;

  const provGoodA = correctValue;
  const otherFields = (FIELD_BANK[stageKey] || FIELD_BANK.easy).map((f) => f.key).filter((k) => k !== field.key);

  let provGoodB = "";
  for (const k of shuffle(otherFields)) {
    const v = (prov?.[k] ?? "").toString().trim();
    if (v) {
      provGoodB = v;
      break;
    }
  }
  if (!provGoodB) return null;

  const otherProv = nusantaraData.filter((x) => x.id !== prov.id);
  if (!otherProv.length) return null;

  let wrong = "";
  for (let t = 0; t < 10; t++) {
    const p2 = otherProv[Math.floor(Math.random() * otherProv.length)];
    const f2 = pickFieldForProvince(p2, stageKey);
    const v2 = (p2?.[f2.key] ?? "").toString().trim();
    if (v2 && norm(v2) !== norm(provGoodA) && norm(v2) !== norm(provGoodB)) {
      wrong = v2;
      break;
    }
  }
  if (!wrong) return null;

  const options = shuffle([provGoodA, provGoodB, wrong]);

  return {
    id: makeId("odd"),
    type: "odd",
    prompt: `Manakah yang BUKAN milik ${prov.province}?`,
    options,
    answer: wrong,
    meta: {
      provinceId: prov.id,
      province: prov.province,
      island: prov.island,
      field: field.key,
      fieldLabel: field.label,
      good: [provGoodA, provGoodB],
    },
  };
}

function makeWordbank(island, stageKey) {
  const prov = pickProvinceByIslandStrict(island);
  const field = pickFieldForProvince(prov, stageKey);
  const answer = (prov?.[field.key] ?? "").toString().trim();
  if (!answer) return null;

  const pool = field.key === "capital" ? uniqNonEmpty(nusantaraData.map((x) => x.capital)) : poolForField(island, field.key);
  const options = makeOptions(answer, pool, 4);

  return {
    id: makeId("wb"),
    type: "wordbank",
    prompt: `Isi yang benar: ${field.label} ${prov.province} adalah ____`,
    options,
    answer,
    meta: { provinceId: prov.id, province: prov.province, island: prov.island, field: field.key, fieldLabel: field.label },
  };
}

function makeImageQuestion(island, stageKey, usedProvIds) {
  const prov = pickProvinceByIslandStrict(island);
  if (!prov?.id) return null;
  if (usedProvIds?.has(prov.id) && nusantaraData.length > 3) return null;
  usedProvIds?.add(prov.id);

  const imageUrl = `/images/provinsi/${prov.id}.png`;

  const poolProv = provincePoolByIsland(island);
  const namePool = uniqNonEmpty(poolProv.map((p) => p.province));
  const options = makeOptions(prov.province, namePool, 4);

  return {
    id: makeId("img"),
    type: "image",
    prompt: `Gambar ini provinsi apa?`,
    imageUrl,
    options,
    answer: prov.province,
    meta: { provinceId: prov.id, province: prov.province, island: prov.island, field: "provinceImage", fieldLabel: "Provinsi" },
  };
}

/* ===================== RANDOM SOAL TIAP GERBANG (VARIATIF) ===================== */
const PACKS = {
  easy: [
    { type: "mcq", w: 55 },
    { type: "tf", w: 25 },
    { type: "scramble", w: 20 },
  ],
  normal: [
    { type: "mcq", w: 40 },
    { type: "scramble", w: 25 },
    { type: "odd", w: 25 },
    { type: "tf", w: 10 },
  ],
  hard: [
    { type: "wordbank", w: 30 },
    { type: "scramble", w: 25 },
    { type: "image", w: 25 },
    { type: "odd", w: 20 },
  ],
};

function makeMixedQuestion(island, stageKey, usedProvIds, forcedType = null) {
  const pack = PACKS[stageKey] || PACKS.easy;
  const type = forcedType || weightedPickType(pack);

  const makers = {
    mcq: () => makeMCQ(island, stageKey, usedProvIds),
    tf: () => makeTF(island, stageKey),
    scramble: () => makeScramble(island, stageKey),
    odd: () => makeOddOneOut(island, stageKey),
    wordbank: () => makeWordbank(island, stageKey),
    image: () => makeImageQuestion(island, stageKey, usedProvIds),
  };

  return makers[type]?.() || null;
}

/* =========================================================
   ✅ REVISI: jumlah soal per gerbang
========================================================= */
const QUESTIONS_PER_GATE = 5;

function buildMixedGateQuestions(island, stageKey, count = QUESTIONS_PER_GATE) {
  const out = [];
  const used = new Set();

  // rencana 5 soal (variatif)
  const planByStage = {
    easy: ["tf", "scramble", "mcq", "mcq", "tf"],
    normal: ["scramble", "odd", "mcq", "tf", "scramble"],
    hard: ["wordbank", "image", "scramble", "odd", "wordbank"],
  };

  const plan = shuffle((planByStage[stageKey] || ["mcq", "tf", "scramble", "mcq", "tf"]).slice(0, count));

  for (const t of plan) {
    const q = makeMixedQuestion(island, stageKey, used, t);
    if (q) out.push(q);
  }

  const MAX_TRY = 60;
  let tries = 0;
  while (out.length < count && tries < MAX_TRY) {
    tries += 1;
    const q = makeMixedQuestion(island, stageKey, used, null);
    if (!q) continue;
    out.push(q);
  }

  if (!out.length) {
    const q = makeMCQ(island, stageKey, used);
    if (q) out.push(q);
  }

  return out.slice(0, count);
}

function buildGateQuestions(stageKey, region) {
  const island = region || "Nusantara";
  const qs = buildMixedGateQuestions(island, stageKey, QUESTIONS_PER_GATE);
  return qs.map((q) => ({ ...q, __modeId: stageKey }));
}

/* ===================== BADGE STATS (tetap) ===================== */
const BADGE_CATALOG = [
  { id: "badge_level_11_serindit", check: (s) => s.globalLevel >= 11 },
  { id: "badge_level_26_pesut", check: (s) => s.globalLevel >= 26 },
  { id: "badge_level_45_harimau", check: (s) => s.globalLevel >= 45 },

  { id: "badge_streak_5_kepodang", check: (s) => s.bestStreak >= 5 },
  { id: "badge_streak_10_gajah", check: (s) => s.bestStreak >= 10 },

  { id: "badge_perfect_easy_jalak", check: (s) => (s.perfectByMode?.easy || 0) >= 1 },
  { id: "badge_perfect_normal_elang", check: (s) => (s.perfectByMode?.normal || 0) >= 1 },
  { id: "badge_perfect_hard_komodo", check: (s) => (s.perfectByMode?.hard || 0) >= 1 },

  { id: "badge_speed_normal_tarsius", check: (s) => (s.avgTimeByMode?.normal || 999) < 10 && (s.timeCountByMode?.normal || 0) > 0 },
  { id: "badge_accuracy_normal_kasuari", check: (s) => (s.accuracyByMode?.normal || 0) >= 0.8 && (s.answeredByMode?.normal || 0) > 0 },

  { id: "badge_score_100_belida", check: (s) => (s.scoreTotal || 0) >= 100 },
  { id: "badge_score_150_kuau", check: (s) => (s.scoreTotal || 0) >= 150 },
  { id: "badge_score_200_cendrawasih", check: (s) => (s.scoreTotal || 0) >= 200 },
];

const BADGE_META = {
  badge_level_11_serindit: { label: "Serindit", detail: "Lulus 11 gerbang perfect", iconUrl: "/images/badge/badge_serindit.png", tier: "silver" },
  badge_level_26_pesut: { label: "Pesut", detail: "Lulus 26 gerbang perfect", iconUrl: "/images/badge/badge_pesut.png", tier: "gold" },
  badge_level_45_harimau: { label: "Harimau", detail: "Lulus 45 gerbang perfect", iconUrl: "/images/badge/badge_harimau.png", tier: "legendary" },

  badge_streak_5_kepodang: { label: "Kepodang", detail: "Best streak 5", iconUrl: "/images/badge/badge_kepodang.png", tier: "silver" },
  badge_streak_10_gajah: { label: "Gajah", detail: "Best streak 10", iconUrl: "/images/badge/badge_gajah.png", tier: "gold" },

  badge_perfect_easy_jalak: { label: "Jalak", detail: "Perfect gate di Easy", iconUrl: "/images/badge/badge_jalak.png", tier: "bronze" },
  badge_perfect_normal_elang: { label: "Elang", detail: "Perfect gate di Normal", iconUrl: "/images/badge/badge_elang.png", tier: "silver" },
  badge_perfect_hard_komodo: { label: "Komodo", detail: "Perfect gate di Hard", iconUrl: "/images/badge/badge_komodo.png", tier: "gold" },

  badge_speed_normal_tarsius: { label: "Tarsius", detail: "Avg time Normal < 10 detik", iconUrl: "/images/badge/badge_tarsius.png", tier: "silver" },
  badge_accuracy_normal_kasuari: { label: "Kasuari", detail: "Akurasi Normal ≥ 80%", iconUrl: "/images/badge/badge_kasuari.png", tier: "silver" },

  badge_score_100_belida: { label: "Belida", detail: "Score total 100", iconUrl: "/images/badge/badge_belida.png", tier: "bronze" },
  badge_score_150_kuau: { label: "Kuau Raja", detail: "Score total 150", iconUrl: "/images/badge/badge_kuau.png", tier: "silver" },
  badge_score_200_cendrawasih: { label: "Cendrawasih", detail: "Score total 200", iconUrl: "/images/badge/badge_cendrawasih.png", tier: "gold" },
};

function emptyStats(globalLevelMax = 0) {
  return {
    globalLevel: 0,
    globalLevelMax,
    bestStreak: 0,
    perfectByMode: { easy: 0, normal: 0, hard: 0 },
    avgTimeByMode: { easy: 0, normal: 0, hard: 0 },
    accuracyByMode: { easy: 0, normal: 0, hard: 0 },
    timeSumByMode: { easy: 0, normal: 0, hard: 0 },
    timeCountByMode: { easy: 0, normal: 0, hard: 0 },
    correctByMode: { easy: 0, normal: 0, hard: 0 },
    answeredByMode: { easy: 0, normal: 0, hard: 0 },
    scoreTotal: 0,
  };
}

/* =========================================================
   Component
========================================================= */
export default function ThreeRunnerComplex({
  // totalQuestions tidak dipakai lagi untuk limit; tetap disimpan agar tidak merusak pemanggil lama
  totalQuestions = 45,
  onAnswered,
  onFinished,
  onGameOver,
  onStatsUpdate,
  onHome,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ===================== Layout ===================== */
  const TOPBAR_OFFSET_PX = 96;
  const HUD_TOP = TOPBAR_OFFSET_PX + 14;

  const HUD_LEFT = isMobile ? 10 : 14;
  const HUD_RIGHT = isMobile ? 10 : undefined;
  const HUD_WIDTH = isMobile ? "calc(100% - 20px)" : 200;

  const DIALOG_TOP = isMobile ? HUD_TOP + 118 : HUD_TOP;
  const DIALOG_LEFT = isMobile ? 10 : undefined;
  const DIALOG_RIGHT = 10;

  const HUD_RIGHT_GAP = 14;
  const DIALOG_LEFT_CSS = isMobile ? undefined : `calc(${14}px + ${200}px + ${HUD_RIGHT_GAP}px)`;

  /* ===================== Callback refs ===================== */
  const onAnsweredRef = useRef(onAnswered);
  const onFinishedRef = useRef(onFinished);
  const onGameOverRef = useRef(onGameOver);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const onHomeRef = useRef(onHome);

  useEffect(() => void (onAnsweredRef.current = onAnswered), [onAnswered]);
  useEffect(() => void (onFinishedRef.current = onFinished), [onFinished]);
  useEffect(() => void (onGameOverRef.current = onGameOver), [onGameOver]);
  useEffect(() => void (onStatsUpdateRef.current = onStatsUpdate), [onStatsUpdate]);
  useEffect(() => void (onHomeRef.current = onHome), [onHome]);

  /* ===================== Toast ===================== */
  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);
  function toast(msg) {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 1100);
  }

  /* ===================== HUD state ===================== */
  const HP_MAX = 5;
  const [hpMax] = useState(HP_MAX);
  const [hp, setHp] = useState(HP_MAX);
  const [coin, setCoin] = useState(0);
  const [xp, setXp] = useState(0);
  const [xpMax] = useState(100);

  const [streak, setStreak] = useState(0);
  const streakRef = useRef(0);

  // globalLevelUi = jumlah gerbang yang berhasil (perfect) / progress
  const [globalLevelUi, setGlobalLevelUi] = useState(0);
  const gateIndexRef = useRef(0);

  /* ===================== Finish Popup ===================== */
  const [finishOpen, setFinishOpen] = useState(false);
  function restartGame() {
    try {
      Telemetry.trackClick();
    } catch {}
    window.location.reload();
  }
  function goHome() {
    try {
      Telemetry.trackNavigation();
      Telemetry.endSession();
    } catch {}
    if (typeof onHomeRef.current === "function") {
      onHomeRef.current();
      return;
    }
    window.location.href = "/";
  }

  /* ===================== Badge Popup Queue ===================== */
  const unlockedBadgesRef = useRef(new Set());
  const badgeQueueRef = useRef([]);
  const [badgePopup, setBadgePopup] = useState(null);

  function openNextBadgePopup() {
    if (badgePopup) return;
    const id = badgeQueueRef.current.shift();
    if (!id) return;
    const meta = BADGE_META[id] || { label: "Badge Unlocked", detail: id, iconUrl: "/images/badge/badge_belida.png", tier: "bronze" };
    setBadgePopup({ badgeId: id, meta });
  }
  function enqueueBadge(id) {
    badgeQueueRef.current.push(id);
    openNextBadgePopup();
  }
  function closeBadgePopup() {
    setBadgePopup(null);
    window.setTimeout(() => openNextBadgePopup(), 60);
  }

  /* ===================== Pause / GameOver ===================== */
  const pausedRef = useRef(false);
  function setPaused(v) {
    pausedRef.current = v;
  }

  const endedRef = useRef(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState("hp0");
  const goHomeTimerRef = useRef(null);

  function hardStopGame(reason = "hp0") {
    if (endedRef.current) return;

    endedRef.current = true;
    setPaused(true);
    setGameOverReason(reason);
    setGameOver(true);

    try {
      onGameOverRef.current?.({ reason, gateIndex: gateIndexRef.current, globalLevel: globalLevelUi });
    } catch {}

    try {
      Telemetry.endSession();
    } catch {}

    if (goHomeTimerRef.current) clearTimeout(goHomeTimerRef.current);
    goHomeTimerRef.current = window.setTimeout(() => {
      goHome();
    }, 1400);
  }

  useEffect(() => {
    return () => {
      if (goHomeTimerRef.current) clearTimeout(goHomeTimerRef.current);
    };
  }, []);

  /* ===================== Gate system (regions) ===================== */
  const gateRef = useRef({
    stageKey: "easy",
    gateType: "standard",
    region: "Sumatera",
    guardianSrc: GUARDIAN_IMAGES[0],
  });

  // kamu bisa edit daftar region di sini
  const regionsRef = useRef({
    easy: ["Sumatera", "Jawa"],
    normal: ["Kalimantan", "Sulawesi"],
    hard: ["Papua", "Maluku", "Nusa Tenggara", "Bali"],
  });

  // ✅ REVISI: urutan pulau fixed, tidak loop ulang
  function allRegionsInOrder() {
    const r = regionsRef.current;
    const merged = [...(r.easy || []), ...(r.normal || []), ...(r.hard || [])];

    const seen = new Set();
    const out = [];
    for (const name of merged) {
      const k = norm(name);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    return out.length ? out : ["Nusantara"];
  }

  // total gerbang mengikuti pulau yang ada
  const totalGates = allRegionsInOrder().length;

  // ✅ REVISI: stage ditentukan dari index gerbang (bukan 15/30/45)
  function stageKeyForGateIndex(idx) {
    const e = regionsRef.current.easy?.length || 0;
    const n = regionsRef.current.normal?.length || 0;
    if (idx < e) return "easy";
    if (idx < e + n) return "normal";
    return "hard";
  }

  function pickGateType(stageKey) {
    if (stageKey === "easy") {
      return weightedPick([
        { key: "standard", w: 60 },
        { key: "combo", w: 20 },
        { key: "hint", w: 15 },
        { key: "perfectMini", w: 5 },
      ]);
    }
    if (stageKey === "normal") {
      return weightedPick([
        { key: "standard", w: 50 },
        { key: "speed", w: 20 },
        { key: "combo", w: 20 },
        { key: "perfect", w: 10 },
      ]);
    }
    return weightedPick([
      { key: "standard", w: 40 },
      { key: "review", w: 30 },
      { key: "speed", w: 15 },
      { key: "perfectBoss", w: 10 },
      { key: "merchant", w: 5 },
    ]);
  }

  /* ===================== Telemetry helpers ===================== */
  function applyUiDataAttrFromStage(stageKey) {
    // telemetry.js mengerti "easy/normal/hard" dan akan map ke UI mode
    // tapi CSS kamu pakai data-ui: simple/medium/complex, jadi kita set di sini juga.
    const st = String(stageKey || "").toLowerCase();
    const ui = st === "easy" ? "simple" : st === "normal" ? "medium" : "complex";
    try {
      if (typeof document !== "undefined") document.documentElement.dataset.ui = ui;
    } catch {}
  }

  function syncTelemetryMode(stageKey) {
    try {
      Telemetry.setMode(stageKey); // boleh "easy/normal/hard" karena telemetry normalizeMode() memetakan
    } catch {}
    applyUiDataAttrFromStage(stageKey);
  }

  // Start telemetry session once
  useEffect(() => {
    const initialStage = stageKeyForGateIndex(gateIndexRef.current || 0);
    syncTelemetryMode(initialStage);

    // startSession tanpa uid: telemetry akan ambil dari firebase auth saat ready
    try {
      Telemetry.startSession({ mode: initialStage });
    } catch {}

    return () => {
      try {
        Telemetry.endSession();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================== Stats + Badge Engine ===================== */
  const statsRef = useRef(emptyStats(Number(totalGates || 0)));

  function emitStatsUpdate() {
    try {
      onStatsUpdateRef.current?.({ ...statsRef.current });
    } catch {}
  }

  function checkBadges() {
    const s = statsRef.current;
    for (const b of BADGE_CATALOG) {
      if (unlockedBadgesRef.current.has(b.id)) continue;
      let ok = false;
      try {
        ok = !!b.check(s);
      } catch {
        ok = false;
      }
      if (ok) {
        unlockedBadgesRef.current.add(b.id);
        enqueueBadge(b.id);
      }
    }
  }

  function updateStatsPerAnswer({ ok, timeMs, stageKey, curStreak }) {
    const s = statsRef.current;
    const key = stageKey || "easy";
    const t = Math.max(0, Number(timeMs || 0)) / 1000;

    s.answeredByMode[key] += 1;
    if (ok) s.correctByMode[key] += 1;

    s.timeSumByMode[key] += t;
    s.timeCountByMode[key] += 1;

    s.avgTimeByMode[key] = s.timeCountByMode[key] ? s.timeSumByMode[key] / s.timeCountByMode[key] : 0;
    s.accuracyByMode[key] = s.answeredByMode[key] ? s.correctByMode[key] / s.answeredByMode[key] : 0;

    const st = Number(curStreak || 0);
    s.bestStreak = Math.max(s.bestStreak, st);

    emitStatsUpdate();
    checkBadges();
  }

  function updateStatsPerGatePerfect(stageKey) {
    const s = statsRef.current;
    const key = stageKey || "easy";

    s.globalLevel += 1;
    s.globalLevelMax = Math.max(s.globalLevelMax || 0, s.globalLevel);
    s.perfectByMode[key] += 1;

    emitStatsUpdate();
    checkBadges();
  }

  function addScore(points) {
    const p = Math.max(0, Number(points || 0));
    statsRef.current.scoreTotal += p;
    emitStatsUpdate();
    checkBadges();
  }

  /* ===================== 2D Runner world ===================== */
  const distRef = useRef(0);
  const [distUi, setDistUi] = useState(0);
  const rafRef = useRef(0);

  const NPC_START_X = 900;
  const GAP_NPC_TO_GATE = 520;
  const GAP_PER_GATE = 1200;

  const npcXRef = useRef(NPC_START_X);
  const gateXRef = useRef(NPC_START_X + GAP_NPC_TO_GATE);

  const npcTriggeredRef = useRef(false);
  const gateTriggeredRef = useRef(false);

  const PLAYER_X_SCREEN = 140;
  const NPC_STOP_GAP = 110;
  const GATE_STOP_GAP = 170;

  const ACTOR_BOTTOM = 110;
  const PLAYER_W = 90;
  const NPC_W = 92;
  const GATE_W = 170;

  const GATE_BOTTOM = ACTOR_BOTTOM + 12;

  /* ===================== Coins ===================== */
  const coinsRef = useRef([]);
  const lastCoinSpawnXRef = useRef(0);

  const COIN_MIN_GAP = 260;
  const COIN_MAX_GAP = 620;
  const COIN_COLLECT_RADIUS = 44;

  function spawnCoinAhead() {
    const gap = COIN_MIN_GAP + Math.random() * (COIN_MAX_GAP - COIN_MIN_GAP);
    const x = Math.max(distRef.current + 260, lastCoinSpawnXRef.current + gap);
    lastCoinSpawnXRef.current = x;

    coinsRef.current.push({
      id: `coin_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
      x,
      collected: false,
    });

    if (coinsRef.current.length > 22) {
      coinsRef.current = coinsRef.current.filter((c) => c.x > distRef.current - 600);
    }
  }

  function ensureCoinsAhead() {
    while (coinsRef.current.length < 6) spawnCoinAhead();
    const lastX = coinsRef.current.length ? coinsRef.current[coinsRef.current.length - 1].x : -Infinity;
    if (lastX < distRef.current + 1100) spawnCoinAhead();
  }

  function updateCoins() {
    ensureCoinsAhead();

    const playerX = PLAYER_X_SCREEN;
    let picked = 0;

    for (const c of coinsRef.current) {
      if (c.collected) continue;
      const screenX = c.x - distRef.current;
      const dx = screenX - playerX;
      if (Math.abs(dx) <= COIN_COLLECT_RADIUS) {
        c.collected = true;
        picked += 1;
      }
    }

    if (picked > 0) {
      setCoin((v) => v + picked);
      addScore(picked * 1);
    }

    coinsRef.current = coinsRef.current.filter((c) => c.x > distRef.current - 700 && !c.collected);
  }

  function setPositionsForGateStep(step) {
    const baseNpc = NPC_START_X + step * GAP_PER_GATE;
    npcXRef.current = baseNpc;
    gateXRef.current = baseNpc + GAP_NPC_TO_GATE;

    const runup = 520;
    const npcStopDist = npcXRef.current - (PLAYER_X_SCREEN + NPC_STOP_GAP);
    distRef.current = Math.max(0, npcStopDist - runup);

    npcTriggeredRef.current = false;
    gateTriggeredRef.current = false;

    coinsRef.current = [];
    lastCoinSpawnXRef.current = distRef.current;
    for (let i = 0; i < 6; i++) spawnCoinAhead();

    setDistUi(distRef.current);
  }

  useEffect(() => {
    setPositionsForGateStep(gateIndexRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================== Dialog system ===================== */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState("welcome");
  const [dialogSpeaker, setDialogSpeaker] = useState("NPC");
  const [dialogPortraitSrc, setDialogPortraitSrc] = useState(GUARDIAN_IMAGES[0]);
  const [dialogTyped, setDialogTyped] = useState("");
  const [dialogFadeOut, setDialogFadeOut] = useState(false);
  const [dialogTyping, setDialogTyping] = useState(false);

  const dialogLinesRef = useRef([]);
  const dialogIndexRef = useRef(0);
  const typingAbortRef = useRef({ abort: false });
  const afterDialogActionRef = useRef(null);

  async function typeText(text, speed = 18) {
    typingAbortRef.current.abort = false;
    setDialogTyping(true);
    setDialogTyped("");
    for (let i = 0; i < text.length; i++) {
      if (typingAbortRef.current.abort) break;
      setDialogTyped((prev) => prev + text[i]);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, speed));
    }
    setDialogTyped(text);
    setDialogTyping(false);
  }

  async function showDialogLine(line) {
    setDialogFadeOut(true);
    await new Promise((r) => setTimeout(r, 160));
    setDialogFadeOut(false);

    setDialogSpeaker(line?.speaker || "NPC");

    const guardianSrc = gateRef.current.guardianSrc || GUARDIAN_IMAGES[0];
    if (line?.role === "guardian") setDialogPortraitSrc(guardianSrc);
    else if (line?.portraitSrc) setDialogPortraitSrc(line.portraitSrc);
    else setDialogPortraitSrc(guardianSrc);

    await typeText(line?.text || "", 18);
  }

  async function openDialog(kind, lines, afterCloseAction = null) {
    setPaused(true);
    setDialogKind(kind);
    dialogLinesRef.current = Array.isArray(lines) ? lines : [];
    dialogIndexRef.current = 0;
    afterDialogActionRef.current = afterCloseAction;

    setDialogOpen(true);
    const first = dialogLinesRef.current[0];
    if (first) await showDialogLine(first);
  }

  function closeDialog() {
    setDialogOpen(false);
    setDialogTyped("");
    setDialogFadeOut(false);
    setDialogTyping(false);
    dialogLinesRef.current = [];
    dialogIndexRef.current = 0;
    typingAbortRef.current.abort = false;
  }

  const gateQuizLaunchedRef = useRef(false);

  async function nextDialog() {
    if (!dialogOpen) return;

    // ✅ click telemetry
    try {
      Telemetry.trackClick();
    } catch {}

    if (dialogTyping) {
      typingAbortRef.current.abort = true;
      const cur = dialogLinesRef.current[dialogIndexRef.current];
      setDialogTyped(cur?.text || "");
      setDialogTyping(false);
      return;
    }

    const nextIdx = dialogIndexRef.current + 1;
    if (nextIdx >= dialogLinesRef.current.length) {
      const endedKind = dialogKind;
      const action = afterDialogActionRef.current;

      closeDialog();
      afterDialogActionRef.current = null;

      if (endedKind === "welcome") {
        setPaused(false);
        return;
      }

      if (endedKind === "gate") {
        if (!gateQuizLaunchedRef.current) {
          gateQuizLaunchedRef.current = true;
          window.setTimeout(() => openQuiz(), 0);
        }
        return;
      }

      if (endedKind === "result") {
        if (typeof action === "function") action();
        return;
      }

      setPaused(false);
      return;
    }

    dialogIndexRef.current = nextIdx;
    await showDialogLine(dialogLinesRef.current[nextIdx]);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (dialogOpen) nextDialog();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, dialogTyping]);

  /* =========================================================
     ✅ REVISI: dialog beda tiap pulau
  ========================================================= */
  function islandFlavor(region) {
    const r = norm(region);
    if (r.includes("sumatera")) return "sumatera";
    if (r.includes("jawa")) return "jawa";
    if (r.includes("kalimantan")) return "kalimantan";
    if (r.includes("sulawesi")) return "sulawesi";
    if (r.includes("papua")) return "papua";
    if (r.includes("maluku")) return "maluku";
    if (r.includes("nusa tenggara") || r.includes("nusatenggara")) return "nusatenggara";
    if (r.includes("bali")) return "bali";
    return "nusantara";
  }

  function buildWelcomeConversation(stageKey, region) {
    const isl = islandFlavor(region);

    const baseEasy = [
      { role: "guardian", speaker: "Penjaga", text: "Hei, Petualang! Langkahmu ringan… tapi jangan lengah. Tanah Nusantara suka menguji ingatan." },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Kalau aku lupa, aku boleh belajar lagi kan?" },
      { role: "guardian", speaker: "Penjaga", text: "Justru itu. Di sini, yang kuat bukan yang hafal sekali… tapi yang mau mengulang sampai paham." },
    ];

    const baseNormal = [
      { role: "guardian", speaker: "Penjaga", text: "Hutan dan laut menjaga rahasia mereka. Kamu siap belajar lebih cepat?" },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Kalau aku terlambat, apa gerbang akan menunggu?" },
      { role: "guardian", speaker: "Penjaga", text: "Tidak. Waktu di sini berjalan. Jawab cepat, tapi jangan asal." },
    ];

    const baseHard = [
      { role: "guardian", speaker: "Penjaga", text: "Di ujung perjalanan, pengetahuan tidak cukup diingat… harus menempel di kepala." },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku takut salah." },
      { role: "guardian", speaker: "Penjaga", text: "Takut boleh. Menyerah jangan. Kalau kamu jatuh… kamu akan mundur satu gerbang." },
    ];

    const flavor = {
      sumatera: {
        lead: "Angin Sumatera membawa cerita lama tentang kerajaan, sungai, dan rasa yang kuat.",
        tip: "Ingat baik-baik: banyak nama di sini mirip, tapi maknanya berbeda.",
      },
      jawa: {
        lead: "Di Jawa, sejarah berlapis-lapis. Setiap langkah, ada jejak budaya yang rapat.",
        tip: "Jangan terburu-buru pilih jawaban seperti menata batik: teliti.",
      },
      kalimantan: {
        lead: "Kalimantan luas, hutannya dalam. Pengetahuan di sini seperti sungai: mengalir jauh.",
        tip: "Fokus pada ciri khas alat musik, tarian, dan rumah adat sering jadi kunci.",
      },
      sulawesi: {
        lead: "Sulawesi punya bentuk unik, seperti teka-teki. Budayanya pun kaya arah.",
        tip: "Perhatikan detail. Satu kata bisa membedakan jawaban benar dan hampir benar.",
      },
      papua: {
        lead: "Papua megah dan kuat. Di sini, nama dan simbol budaya terasa tegas.",
        tip: "Pegang pola: awal kata, akhir kata, dan panjang huruf bisa menolongmu.",
      },
      maluku: {
        lead: "Maluku pernah disebut kepulauan rempah. Ceritanya tersebar di banyak pulau.",
        tip: "Kalau ragu, ingat asosiasi: rempah, laut, dan tradisi pesisir.",
      },
      nusatenggara: {
        lead: "Nusa Tenggara panas dan berangin. Tradisinya berwarna dan berani.",
        tip: "Jangan tertukar nama banyak yang terdengar mirip kalau tidak fokus.",
      },
      bali: {
        lead: "Bali punya ritme yang khas tarian, musik, dan upacara saling terkait.",
        tip: "Pikirkan pasangan: tarian, musik, rumah adat. Biasanya saling menguatkan.",
      },
      nusantara: {
        lead: "Setiap pulau punya rahasia. Kamu sedang mengumpulkan kunci-kunci Nusantara.",
        tip: "Tarik napas. Ingatanmu akan lebih rapi kalau tenang.",
      },
    }[isl];

    const close = [
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Baik. Aku siap." },
      { role: "guardian", speaker: "Penjaga", text: "Bagus. Gerbang menunggu." },
    ];

    const stageBase = stageKey === "easy" ? baseEasy : stageKey === "normal" ? baseNormal : baseHard;

    return [
      { role: "guardian", speaker: "Penjaga", text: `${flavor.lead}` },
      ...stageBase,
      { role: "guardian", speaker: "Penjaga", text: `${flavor.tip}` },
      ...close,
    ];
  }

  function buildGateIntro(region) {
    const isl = islandFlavor(region);

    const tag = {
      sumatera: "Gerbang Sumatera",
      jawa: "Gerbang Jawa",
      kalimantan: "Gerbang Kalimantan",
      sulawesi: "Gerbang Sulawesi",
      papua: "Gerbang Papua",
      maluku: "Gerbang Maluku",
      nusatenggara: "Gerbang Nusa Tenggara",
      bali: "Gerbang Bali",
      nusantara: "Gerbang Nusantara",
    }[isl];

    return [
      { role: "guardian", speaker: "Penjaga Gerbang", text: `${tag}. Berhenti di garis ini, Petualang.` },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku harus melakukan apa?" },
      { role: "guardian", speaker: "Penjaga Gerbang", text: `${QUESTIONS_PER_GATE} pertanyaan. ${QUESTIONS_PER_GATE} kunci. ${QUESTIONS_PER_GATE} langkah.` },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Kalau aku menjawab salah?" },
      { role: "guardian", speaker: "Penjaga Gerbang", text: "Gerbang akan menolak… dan kamu mundur satu gerbang." },
      { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Kalau aku sempurna?" },
      { role: "guardian", speaker: "Penjaga Gerbang", text: "Kalau kamu sempurna… gerbang memberi berkah. Dan namamu akan diingat." },
    ];
  }

  function buildResultDialog({ outcome, hpNow, streakNow }) {
    const lines = [];

    if (outcome === "perfect") {
      lines.push(
        { role: "guardian", speaker: "Penjaga Gerbang", text: `${QUESTIONS_PER_GATE} kunci. Semuanya pas.` },
        { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku berhasil!" },
        { role: "guardian", speaker: "Penjaga Gerbang", text: "Bukan berhasil… kamu menguasai. Ambil berkah ini." }
      );
    } else if (outcome === "back") {
      lines.push(
        { role: "guardian", speaker: "Penjaga Gerbang", text: "Kunci-kuncimu runtuh." },
        { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku… gagal total?" },
        { role: "guardian", speaker: "Penjaga Gerbang", text: "Hukum gerbang berlaku. Kamu harus mundur satu gerbang." }
      );
    } else {
      lines.push(
        { role: "guardian", speaker: "Penjaga Gerbang", text: "Kuncimu belum lengkap." },
        { role: "guardian", speaker: "Penjaga Gerbang", text: "Nyawamu berkurang." },
        { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku harus lebih hati-hati." }
      );
    }

    if (streakNow >= 5) {
      lines.push(
        { role: "guardian", speaker: "Penjaga", text: "Api kombo menyala di langkahmu." },
        { role: "guardian", speaker: "Penjaga", text: "Jangan puas. Biasanya orang jatuh saat merasa aman." }
      );
    }

    if (hpNow <= 1) {
      lines.push(
        { role: "guardian", speaker: "Penjaga", text: "Napasmu berat. Gunakan koinmu untuk bantuan… atau tenangkan pikiranmu." },
        { role: "player", speaker: "Petualang", portraitSrc: "/images/guardian/user_kiri.png", text: "Aku akan memilih dengan bijak." }
      );
    }

    return lines;
  }

  /* ===================== Quiz + Hint system ===================== */
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("Gerbang Ujian");

  const quizQRef = useRef([]);
  const [qi, setQi] = useState(0);

  const [gateCorrect, setGateCorrect] = useState(0);
  const [gateWrong, setGateWrong] = useState(0);
  const [gateTimeout, setGateTimeout] = useState(0);

  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const [lastOutcome, setLastOutcome] = useState("");

  const [remainMsUi, setRemainMsUi] = useState(0);
  const [totalMsUi, setTotalMsUi] = useState(1);
  const [barKey, setBarKey] = useState(0);

  const [hintText, setHintText] = useState("");
  const hintUsedRef = useRef(new Set());

  function computeHint(q) {
    if (!q) return "";
    const ans = (q.answer ?? "").toString().trim();
    const clean = ans.replace(/\s+/g, "");
    const first = clean[0] ? clean[0].toUpperCase() : "?";
    const last = clean[clean.length - 1] ? clean[clean.length - 1].toUpperCase() : "?";

    if (q.type === "scramble") {
      return `Petunjuk: diawali "${first}", diakhiri "${last}", panjang ${clean.length} huruf.`;
    }
    if (q.type === "tf") {
      const cv = (q.meta?.correctValue ?? "").toString().trim().replace(/\s+/g, "");
      const f2 = cv[0] ? cv[0].toUpperCase() : first;
      return `Petunjuk: kata kuncinya diawali "${f2}".`;
    }
    return `Petunjuk: jawaban diawali "${first}" dan panjang ${clean.length} huruf.`;
  }

  function useHint() {
    const q = quizQRef.current[qi];
    if (!q) return;

    try {
      Telemetry.trackClick();
    } catch {}

    if (hintUsedRef.current.has(q.id)) {
      toast("Hint sudah dipakai.");
      return;
    }
    if (coin < 10) {
      toast("Coin kurang (butuh 10).");
      return;
    }

    hintUsedRef.current.add(q.id);
    setCoin((c) => Math.max(0, c - 10));
    setHintText(computeHint(q));
    try {
      playSfx("badge");
    } catch {}
    toast("Hint dipakai. -10 coin");
  }

  const timeoutAppliedRef = useRef(false);
  const qStartMsRef = useRef(0);
  const deadlineMsRef = useRef(0);
  const rafTimerRef = useRef(0);

  function stopTimer() {
    if (rafTimerRef.current) cancelAnimationFrame(rafTimerRef.current);
    rafTimerRef.current = 0;
  }

  function applyHpDelta(delta) {
    if (delta < 0) {
      try {
        playSfx("wrong");
      } catch {}
    }
    setHp((h) => {
      const next = clamp(h + delta, 0, hpMax);
      if (next <= 0) window.setTimeout(() => hardStopGame("hp0"), 0);
      return next;
    });
  }

  function applyXpDelta(delta) {
    setXp((x) => {
      const next = clamp(x + delta, 0, xpMax);
      if (next <= 0) window.setTimeout(() => hardStopGame("xp0"), 0);
      return next;
    });
  }

  // ✅ timer habis: quiz tetap terbuka (desktop & mobile)
  function startTimer(sec) {
    stopTimer();
    timeoutAppliedRef.current = false;

    const safe = Math.max(1, Number(sec) || 1);
    const totalMs = safe * 1000;

    setTotalMsUi(totalMs);
    setRemainMsUi(totalMs);
    setBarKey((k) => k + 1);

    const now = Date.now();
    qStartMsRef.current = now;
    deadlineMsRef.current = now + totalMs;

    const tick = () => {
      if (!quizOpen) {
        stopTimer();
        return;
      }

      const remain = Math.max(0, deadlineMsRef.current - Date.now());
      setRemainMsUi(remain);

      if (remain <= 0) {
        if (!timeoutAppliedRef.current) {
          timeoutAppliedRef.current = true;

          // ✅ stop loop timer, tapi quiz tetap terbuka
          stopTimer();

          const q = quizQRef.current[qi];
          const stageKey = q?.__modeId || gateRef.current.stageKey || "easy";

          setChecked(true);
          setLastOutcome("timeout");
          setGateTimeout((x) => x + 1);

          applyHpDelta(-1);
          applyXpDelta(-2);

          streakRef.current = 0;
          setStreak(0);

          updateStatsPerAnswer({ ok: false, timeMs: totalMs, stageKey, curStreak: 0 });

          // ✅ telemetry: wrong answer
          try {
            Telemetry.trackAnswer({ isCorrect: false });
          } catch {}

          try {
            onAnsweredRef.current?.({ ok: false, timeout: true, timeMs: totalMs, question: q, picked: "" });
          } catch {}

          toast("Waktu habis. -1 HP");
        }
        return; // ✅ jangan RAF lagi
      }

      rafTimerRef.current = requestAnimationFrame(tick);
    };

    rafTimerRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => stopTimer(), []);

  function openQuiz() {
    const stageKey = gateRef.current.stageKey;
    const region = gateRef.current.region || "Nusantara";
    const qs = buildGateQuestions(stageKey, region);

    if (!qs.length) {
      setPaused(false);
      return;
    }

    // ✅ telemetry: sync mode tiap buka quiz
    syncTelemetryMode(stageKey);

    setPaused(true);
    setQuizOpen(true);

    setQi(0);
    setGateCorrect(0);
    setGateWrong(0);
    setGateTimeout(0);

    setSelected("");
    setChecked(false);
    setLastOutcome("");

    hintUsedRef.current = new Set();
    setHintText("");

    setQuizTitle(`Gerbang Ujian - ${region}`);
    quizQRef.current = qs;

    const t = stageKey === "easy" ? 12 : stageKey === "normal" ? 10 : 8;
    startTimer(t);
  }

  function checkAnswer(pickedOverride) {
    if (!quizOpen) return;
    if (checked) return;

    const q = quizQRef.current[qi];
    if (!q) return;

    const picked = (pickedOverride ?? selected ?? "").toString();
    if (!picked) return;

    // ✅ telemetry: click answer
    try {
      Telemetry.trackClick();
    } catch {}

    stopTimer();

    const timeMs = Math.max(0, Date.now() - (qStartMsRef.current || Date.now()));
    const stageKey = q.__modeId || gateRef.current.stageKey || "easy";

    let ok = false;
    if (q.type === "tf") {
      const pickedBool = picked === "Benar";
      ok = pickedBool === Boolean(q.answer);
    } else if (q.type === "scramble") {
      ok = normNoSpace(picked) === normNoSpace(q.answer);
    } else {
      ok = norm(picked) === norm(q.answer);
    }

    // ✅ tetap di quiz, tampilkan tombol Lanjut
    setChecked(true);

    if (ok) {
      setLastOutcome("correct");
      setGateCorrect((x) => x + 1);

      setCoin((c) => c + 10);
      applyXpDelta(+10);
      addScore(10);

      const nextStreak = streakRef.current + 1;
      streakRef.current = nextStreak;
      setStreak(nextStreak);

      updateStatsPerAnswer({ ok: true, timeMs, stageKey, curStreak: nextStreak });

      toast("Benar! +10 coin, +10 XP");
    } else {
      // ✅ SALAH: cuma penalty, quiz tidak ditutup
      setLastOutcome("wrong");
      setGateWrong((x) => x + 1);

      applyHpDelta(-1);
      applyXpDelta(-2);

      streakRef.current = 0;
      setStreak(0);

      updateStatsPerAnswer({ ok: false, timeMs, stageKey, curStreak: 0 });

      // ✅ telemetry: wrong answer
      try {
        Telemetry.trackAnswer({ isCorrect: false });
      } catch {}

      toast("Salah. -1 HP");
    }

    try {
      onAnsweredRef.current?.({ ok, timeout: false, timeMs, question: q, picked });
    } catch {}
  }

  function onPick(opt) {
    if (!quizOpen) return;
    if (checked) return;

    setSelected(opt);
    checkAnswer(opt);
  }

  function finishGateEvaluation(finalCorrect, finalWrong, finalTimeout) {
    const perfect = finalCorrect === QUESTIONS_PER_GATE && finalWrong === 0 && finalTimeout === 0;
    const stageKey = gateRef.current.stageKey || "easy";

    const afterResult = () => {
      // ✅ selalu maju ke gerbang berikutnya (tidak mengulang pulau)
      const nextGateIndex = gateIndexRef.current + 1;
      gateIndexRef.current = nextGateIndex;

      // ✅ telemetry: navigation (pindah gerbang)
      try {
        Telemetry.trackNavigation();
      } catch {}

      if (perfect) {
        const nextGlobal = globalLevelUi + 1;
        setGlobalLevelUi(nextGlobal);

        updateStatsPerGatePerfect(stageKey);

        // bonus perfect
        applyXpDelta(+30);
        setCoin((c) => c + 20);
        setHp((h) => Math.min(hpMax, h + 1));
        addScore(20);

        toast("Perfect! Lanjut gerbang berikutnya.");
      } else {
        // ❗ tidak perfect: TIDAK mundur, TIDAK diulang
        toast("Belum perfect. Tetap lanjut gerbang berikutnya.");
      }

      // ✅ cek finish berdasarkan jumlah gerbang/pulau
      if (nextGateIndex >= Number(totalGates || 0)) {
        endedRef.current = true;
        setPaused(true);
        setQuizOpen(false);
        setFinishOpen(true);

        try {
          Telemetry.endSession();
        } catch {}

        try {
          onFinishedRef.current?.();
        } catch {}
        return;
      }

      // ✅ stage berikutnya mungkin beda -> sync telemetry mode + data-ui
      const nextStage = stageKeyForGateIndex(nextGateIndex);
      syncTelemetryMode(nextStage);

      setPaused(false);
      setPositionsForGateStep(nextGateIndex);
    };

    // outcome dialog (tidak ada back lagi)
    const outcome = perfect ? "perfect" : "retry";

    openDialog("result", buildResultDialog({ outcome, hpNow: hp, streakNow: streakRef.current }), afterResult);
  }

  function nextQuestion() {
    if (!quizOpen) return;

    try {
      Telemetry.trackClick();
    } catch {}

    const stageKey = gateRef.current.stageKey;
    const next = qi + 1;

    // ✅ HANYA tutup quiz kalau sudah selesai semua soal (misal 5)
    if (next >= QUESTIONS_PER_GATE || next >= quizQRef.current.length) {
      stopTimer();
      setQuizOpen(false);
      finishGateEvaluation(gateCorrect, gateWrong, gateTimeout);
      return;
    }

    // ✅ lanjut ke soal berikutnya
    setQi(next);
    setSelected("");
    setChecked(false);
    setLastOutcome("");
    setHintText("");

    const t = stageKey === "easy" ? 12 : stageKey === "normal" ? 10 : 8;
    startTimer(t);
  }

  useEffect(() => {
    if (!dialogOpen && gateTriggeredRef.current && !quizOpen && !gateQuizLaunchedRef.current) {
      gateQuizLaunchedRef.current = true;
      window.setTimeout(() => openQuiz(), 0);
    }
  }, [dialogOpen, quizOpen]);

  /* ===================== Main loop ===================== */
  useEffect(() => {
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current && !endedRef.current && !gameOver && !finishOpen) {
        distRef.current += 260 * dt;

        updateCoins();

        if (!npcTriggeredRef.current) {
          const npcStopDist = npcXRef.current - (PLAYER_X_SCREEN + NPC_STOP_GAP);
          if (distRef.current >= npcStopDist) {
            distRef.current = npcStopDist;
            npcTriggeredRef.current = true;
            setDistUi(distRef.current);

            const regions = allRegionsInOrder();
            const curGateIdx = gateIndexRef.current;

            // ✅ kalau sudah habis semua pulau, finish
            if (curGateIdx >= regions.length) {
              endedRef.current = true;
              setPaused(true);
              setQuizOpen(false);
              setFinishOpen(true);
              try {
                Telemetry.endSession();
              } catch {}
              try {
                onFinishedRef.current?.();
              } catch {}
              rafRef.current = requestAnimationFrame(tick);
              return;
            }

            const stageKey = stageKeyForGateIndex(curGateIdx);
            const gateType = pickGateType(stageKey);
            const region = regions[curGateIdx] || "Nusantara";
            const guardianSrc = pickRandomGuardian();

            gateRef.current = { stageKey, gateType, region, guardianSrc };

            // ✅ telemetry: mode mengikuti stage gate yang aktif
            syncTelemetryMode(stageKey);

            openDialog("welcome", buildWelcomeConversation(stageKey, region));
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
        }

        if (!gateTriggeredRef.current) {
          const gateStopDist = gateXRef.current - (PLAYER_X_SCREEN + GATE_STOP_GAP);
          if (distRef.current >= gateStopDist) {
            distRef.current = gateStopDist;
            gateTriggeredRef.current = true;
            setDistUi(distRef.current);

            gateQuizLaunchedRef.current = false;
            openDialog("gate", buildGateIntro(gateRef.current.region));
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
        }

        setDistUi(distRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalLevelUi, gameOver, finishOpen]);

  /* ===================== Render helpers ===================== */
  const xpPct = clamp((xp / Math.max(1, xpMax)) * 100, 0, 100);
  const groundOffsetX = -Math.floor(distUi % 1024);

  const npcScreenX = Math.round(npcXRef.current - distUi);
  const gateScreenX = Math.round(gateXRef.current - distUi);

  const coinsScreen = coinsRef.current
    .map((c) => ({ id: c.id, x: Math.round(c.x - distUi) }))
    .filter((c) => c.x > -120 && c.x < (typeof window !== "undefined" ? window.innerWidth : 1200) + 240);

  const QUESTION_SIZE = isMobile ? 18 : 24;
  const STATEMENT_SIZE = isMobile ? 16 : 20;
  const OPTION_SIZE = isMobile ? 13 : 14;
  const OPTION_PAD_Y = isMobile ? 9 : 10;
  const OPTION_PAD_X = isMobile ? 12 : 14;

  const quizW = isMobile ? "calc(100% - 18px)" : "min(980px, calc(100% - 24px))";
  const quizPad = isMobile ? 14 : 18;

  const COIN_SVG =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cdefs%3E%3CradialGradient id='g' cx='30%25' cy='30%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23fff2c2'/%3E%3Cstop offset='45%25' stop-color='%23e7c36a'/%3E%3Cstop offset='100%25' stop-color='%23b8862b'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='32' cy='32' r='26' fill='url(%23g)' stroke='%23996c1f' stroke-width='3'/%3E%3Ccircle cx='32' cy='32' r='18' fill='none' stroke='%23fff0b5' stroke-opacity='.55' stroke-width='3'/%3E%3Cpath d='M32 18c6 0 11 5 11 11s-5 11-11 11-11-5-11-11 5-11 11-11zm0 6c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z' fill='%238a5a14' fill-opacity='.25'/%3E%3C/svg%3E";

  const gateImgSrc = gateAssetForRegion(gateRef.current.region);

  const finishStats = statsRef.current;
  const accEasy = Math.round((finishStats.accuracyByMode.easy || 0) * 100);
  const accNormal = Math.round((finishStats.accuracyByMode.normal || 0) * 100);
  const accHard = Math.round((finishStats.accuracyByMode.hard || 0) * 100);

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", background: "transparent", overflow: "hidden" }}>
      {/* Badge popup */}
      {badgePopup ? <BadgeUnlockPopup badgeId={badgePopup.badgeId} meta={badgePopup.meta} onClose={closeBadgePopup} /> : null}

      <style>{`
        :root{ --font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
        :root[data-ui="complex"]{
          --border: rgba(214, 168, 79, 0.55);
          --text: #f6e7c8;
          --muted: rgba(246, 231, 200, 0.75);
          --radius: 28px;
          --radius-sm: 18px;
          --panel-bg: rgba(16, 42, 47, 0.78);
          --panel-shadow: 0 16px 40px rgba(0,0,0,0.55);
          --inner-bg: rgba(255, 255, 255, 0.06);

          --bn-panel: var(--panel-bg);
          --bn-line: var(--border);
          --bn-text: var(--text);
          --bn-muted: var(--muted);
          --bn-shadow: var(--panel-shadow);

          --primary-bg: rgba(214, 168, 79, 0.95);
          --primary-border: rgba(0,0,0,0.25);
          --primary-text: #22170d;

          --surface: rgba(16,42,47,0.92);
          color-scheme: dark;
        }
        :root{
          --bn-panel: rgba(16, 42, 47, 0.78);
          --bn-line: rgba(214,168,79,0.35);
          --bn-text: #f6e7c8;
          --bn-muted: rgba(246,231,200,0.75);
          --bn-shadow: 0 16px 40px rgba(0,0,0,0.55);
          --radius: 28px;
          --radius-sm: 18px;
          --inner-bg: rgba(255, 255, 255, 0.06);
          --primary-bg: rgba(214, 168, 79, 0.95);
          --primary-border: rgba(0,0,0,0.25);
          --primary-text: #22170d;

          --surface: rgba(16,42,47,0.92);
          --border: rgba(214,168,79,0.55);
          --text: #f6e7c8;
        }

        .bnQuestion { font-weight: 900 !important; }

        @keyframes shrinkX { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes pulseBar { 0%, 100% { transform: scaleY(1); opacity: 0.95; } 50% { transform: scaleY(1.55); opacity: 1; } }
        @keyframes coinBob { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
        @keyframes coinSpin { 0% { transform: translateX(-50%) rotateY(0deg); } 50% { transform: translateX(-50%) rotateY(180deg); } 100% { transform: translateX(-50%) rotateY(360deg); } }
        @keyframes bnBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes finishPop { from { transform: translateY(10px) scale(.985); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>

      {/* ===================== GAME OVER POPUP ===================== */}
      {gameOver && !finishOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,.70)",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font)",
            color: "var(--bn-text)",
            padding: 14,
          }}
        >
          <div
            style={{
              width: isMobile ? "calc(100% - 10px)" : "min(620px, calc(100% - 24px))",
              borderRadius: "var(--radius)",
              border: "1px solid rgba(255,255,255,.14)",
              boxShadow: "var(--bn-shadow)",
              background: "var(--bn-panel)",
              overflow: "hidden",
              animation: "finishPop .18s ease-out both",
            }}
          >
            <div style={{ padding: isMobile ? 14 : 18, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontWeight: 1200, fontSize: isMobile ? 20 : 28 }}>💀 Game Over</div>
              <div style={{ marginTop: 6, color: "var(--bn-muted)", fontWeight: 900, lineHeight: 1.5 }}>
                {gameOverReason === "hp0" ? "Nyawamu habis." : "Kamu kehabisan XP."} Kamu akan kembali ke Home…
              </div>
            </div>
            <div style={{ padding: isMobile ? 14 : 18, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={goHome}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  borderRadius: "var(--radius-sm)",
                  padding: isMobile ? "12px 14px" : "14px 18px",
                  fontWeight: 1100,
                  fontSize: isMobile ? 15 : 16,
                  color: "var(--bn-text)",
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              >
                Ke Home Sekarang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== FINISH POPUP ===================== */}
      {finishOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,.65)",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font)",
            color: "var(--bn-text)",
            padding: 14,
          }}
        >
          <div
            style={{
              width: isMobile ? "calc(100% - 10px)" : "min(860px, calc(100% - 24px))",
              borderRadius: "var(--radius)",
              border: "1px solid var(--bn-line)",
              boxShadow: "var(--bn-shadow)",
              background: "var(--bn-panel)",
              overflow: "hidden",
              animation: "finishPop .18s ease-out both",
            }}
          >
            <div style={{ padding: isMobile ? 14 : 18, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontWeight: 1200, fontSize: isMobile ? 20 : 28 }}>🎉 Selesai!</div>
              <div style={{ marginTop: 6, color: "var(--bn-muted)", fontWeight: 900, lineHeight: 1.5 }}>
                Kamu sudah menyelesaikan semua gerbang ({Number(totalGates || 0)}/{Number(totalGates || 0)}).
              </div>
            </div>

            <div style={{ padding: isMobile ? 14 : 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", borderRadius: "var(--radius-sm)", padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--bn-muted)", fontWeight: 900 }}>TOTAL SCORE</div>
                  <div style={{ marginTop: 6, fontSize: isMobile ? 28 : 38, fontWeight: 1200 }}>{Math.round(finishStats.scoreTotal || 0)}</div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14, padding: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--bn-muted)", fontWeight: 900 }}>Coin</div>
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>{coin}</div>
                    </div>
                    <div style={{ background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 14, padding: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--bn-muted)", fontWeight: 900 }}>Best Streak</div>
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1100 }}>{finishStats.bestStreak || 0}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", borderRadius: "var(--radius-sm)", padding: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--bn-muted)", fontWeight: 900 }}>RINGKASAN</div>

                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 1000 }}>Akurasi Easy</div>
                      <div style={{ fontWeight: 1100 }}>{accEasy}%</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 1000 }}>Akurasi Normal</div>
                      <div style={{ fontWeight: 1100 }}>{accNormal}%</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 1000 }}>Akurasi Hard</div>
                      <div style={{ fontWeight: 1100 }}>{accHard}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={restartGame}
                  style={{
                    appearance: "none",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    padding: isMobile ? "12px 14px" : "14px 18px",
                    fontWeight: 1100,
                    fontSize: isMobile ? 15 : 16,
                    color: "var(--primary-text)",
                    background: "var(--primary-bg)",
                    border: "1px solid var(--primary-border)",
                  }}
                >
                  Main Lagi
                </button>

                <button
                  type="button"
                  onClick={goHome}
                  style={{
                    appearance: "none",
                    cursor: "pointer",
                    borderRadius: "var(--radius-sm)",
                    padding: isMobile ? "12px 14px" : "14px 18px",
                    fontWeight: 1100,
                    fontSize: isMobile ? 15 : 16,
                    color: "var(--bn-text)",
                    background: "rgba(255,255,255,.07)",
                    border: "1px solid rgba(255,255,255,.12)",
                  }}
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== 2D WORLD ===================== */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 180,
            backgroundImage: `url("/images/asset/tanah.png")`,
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 180px",
            backgroundPosition: `${groundOffsetX}px bottom`,
          }}
        />

        {/* Coins */}
        {coinsScreen.map((c) => (
          <img
            key={c.id}
            src="/images/asset/coin.png"
            alt="coin"
            draggable={false}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = COIN_SVG;
            }}
            style={{
              position: "absolute",
              left: c.x,
              bottom: ACTOR_BOTTOM + 62,
              width: 34,
              height: 34,
              transform: "translateX(-50%)",
              animation: "coinBob 1s infinite ease-in-out, coinSpin 1.05s infinite linear",
              userSelect: "none",
              opacity: 0.98,
            }}
          />
        ))}

        <img
          src="/images/guardian/user_kanan.png"
          alt="player"
          draggable={false}
          style={{
            position: "absolute",
            left: 140,
            bottom: ACTOR_BOTTOM,
            width: PLAYER_W,
            height: "auto",
            userSelect: "none",
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,.35))",
          }}
        />

        <img
          src={gateRef.current.guardianSrc}
          alt="npc"
          draggable={false}
          style={{
            position: "absolute",
            left: npcScreenX,
            bottom: ACTOR_BOTTOM + 18,
            width: NPC_W,
            height: "auto",
            transform: "translateX(-50%)",
            opacity: npcTriggeredRef.current || dialogOpen ? 1 : 0,
            transition: "opacity .25s ease",
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,.30))",
          }}
        />

        <img
          src={gateImgSrc}
          alt="gate"
          draggable={false}
          style={{
            position: "absolute",
            left: gateScreenX,
            bottom: GATE_BOTTOM,
            width: GATE_W,
            height: "auto",
            transform: "translateX(-50%)",
            filter: "drop-shadow(0 16px 26px rgba(0,0,0,.35))",
          }}
          onError={(e) => {
            e.currentTarget.src = "/images/asset/gerbang_sumatera.png";
          }}
        />
      </div>

      {/* ===================== HUD ===================== */}
      <div
        style={{
          position: "fixed",
          top: HUD_TOP,
          left: HUD_LEFT,
          right: HUD_RIGHT,
          zIndex: 50,
          width: HUD_WIDTH,
          background: "var(--bn-panel)",
          border: "1px solid var(--bn-line)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 10px",
          boxShadow: "var(--bn-shadow)",
          backdropFilter: "blur(10px)",
          pointerEvents: "none",
          color: "var(--bn-text)",
          fontFamily: "var(--font)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--bn-muted)", fontWeight: 800 }}>HP</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
              {Array.from({ length: hpMax }).map((_, i) => {
                const on = i < hp;
                return (
                  <span key={i} style={{ width: 14, height: 14, opacity: on ? 0.95 : 0.25, display: "inline-flex" }}>
                    <svg viewBox="0 0 24 24">
                      <path
                        fill="#ef4444"
                        d="M12 21s-7-4.35-9.33-8.28C.46 9.39 2.24 6 5.8 6c1.74 0 3.11.9 4.02 2.02C10.73 6.9 12.1 6 13.84 6c3.56 0 5.34 3.39 3.13 6.72C19 16.65 12 21 12 21z"
                      />
                    </svg>
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--bn-muted)", fontWeight: 800 }}>Coin</div>
            <div style={{ fontSize: 12, fontWeight: 1000 }}>{coin}</div>
          </div>
        </div>

        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--bn-muted)", marginBottom: 5 }}>
            <span>XP</span>
            <span>
              {xp} / {xpMax}
            </span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.10)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpPct}%`, background: "linear-gradient(90deg, rgba(214,168,79,.95), rgba(58,166,161,.85))", transition: "width .2s ease" }} />
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--bn-muted)", fontWeight: 900 }}>
          <span>Lv</span>
          <span>
            {globalLevelUi}/{Number(totalGates || 0)}
          </span>
        </div>
      </div>

      {/* ===================== Dialog (Avatar kiri + dialog kanan) ===================== */}
      {dialogOpen ? (
        <div
          onClick={nextDialog}
          role="button"
          tabIndex={0}
          style={{
            position: "fixed",
            top: DIALOG_TOP,
            left: isMobile ? DIALOG_LEFT : DIALOG_LEFT_CSS,
            right: DIALOG_RIGHT,
            zIndex: 60,
            pointerEvents: "auto",
            fontFamily: "var(--font)",
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              color: "var(--bn-text)",
              background: "var(--bn-panel)",
              border: "1px solid var(--bn-line)",
              boxShadow: "var(--bn-shadow)",
              backdropFilter: "blur(10px)",
              minHeight: isMobile ? 120 : 150,
              overflowX: "hidden",
              overflowY: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "88px 1fr" : "148px 1fr",
                gap: isMobile ? 10 : 12,
                padding: isMobile ? 10 : 12,
                alignItems: "start",
              }}
            >
              <div
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: "var(--inner-bg)",
                  border: "1px solid rgba(255,255,255,.14)",
                  overflow: "hidden",
                  width: isMobile ? 88 : "100%",
                  height: isMobile ? 88 : 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={dialogPortraitSrc}
                  alt="npc"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: isMobile ? 2 : 6,
                  }}
                  onError={(e) => {
                    e.currentTarget.src = GUARDIAN_IMAGES[0];
                  }}
                />
              </div>

              <div style={{ minWidth: 0, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    fontSize: 12,
                    color: "var(--bn-muted)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    opacity: 0.95,
                  }}
                >
                  Klik
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingRight: 96,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      background: "rgba(0,0,0,.35)",
                      border: "1px solid rgba(255,255,255,.12)",
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontWeight: 1100,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      flex: "0 0 auto",
                    }}
                  >
                    {dialogSpeaker}
                  </div>

                  <div
                    style={{
                      fontWeight: 1100,
                      fontSize: 13,
                      opacity: 0.92,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {dialogKind === "welcome" ? "Sambutan" : dialogKind === "gate" ? "Gerbang Ujian" : "Hasil Gerbang"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: isMobile ? 16 : 18,
                    lineHeight: 1.4,
                    opacity: dialogFadeOut ? 0 : 1,
                    transition: "opacity .22s ease",
                    position: "relative",
                    paddingRight: 28,
                    textShadow: "0 2px 10px rgba(0,0,0,.35)",
                    whiteSpace: "normal",
                    wordBreak: "normal",
                    overflowWrap: "break-word",
                    hyphens: "none",
                  }}
                >
                  {dialogTyped}
                  {!dialogTyping ? (
                    <span
                      style={{
                        position: "absolute",
                        right: 8,
                        bottom: 0,
                        color: "rgba(255,255,255,.65)",
                        animation: "bnBob 1s infinite ease-in-out",
                        userSelect: "none",
                      }}
                    >
                      ▾
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== Quiz Popup ===================== */}
      {quizOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 65,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(6px)",
            pointerEvents: "auto",
            fontFamily: "var(--font)",
            color: "var(--bn-text)",
          }}
        >
          <div
            style={{
              width: quizW,
              borderRadius: "var(--radius)",
              overflow: "hidden",
              border: "1px solid var(--bn-line)",
              boxShadow: "var(--bn-shadow)",
              position: "relative",
              background: "var(--bn-panel)",
            }}
          >
            <div
              style={{
                padding: isMobile ? "12px 14px 10px 14px" : "16px 18px 12px 18px",
                borderBottom: "1px solid rgba(255,255,255,.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 1100, fontSize: isMobile ? 16 : 20 }}>{quizTitle}</div>

                <div
                  style={{
                    marginTop: 10,
                    height: 6,
                    width: isMobile ? 180 : 220,
                    maxWidth: "70vw",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.10)",
                    border: "1px solid rgba(255,255,255,.10)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    key={barKey}
                    style={{
                      height: "100%",
                      width: "100%",
                      transformOrigin: "left",
                      animation: `shrinkX ${Math.max(1, totalMsUi)}ms linear forwards`,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "100%",
                        background: "linear-gradient(90deg, rgba(214,168,79,.95), rgba(58,166,161,.85))",
                        transformOrigin: "center",
                        animation: remainMsUi > 0 && remainMsUi <= 5000 ? "pulseBar .8s infinite ease-in-out" : "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={useHint}
                disabled={checked}
                style={{
                  appearance: "none",
                  cursor: checked ? "not-allowed" : "pointer",
                  borderRadius: 999,
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  fontWeight: 1100,
                  fontSize: 13,
                  color: "var(--bn-text)",
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.12)",
                  whiteSpace: "nowrap",
                  opacity: checked ? 0.6 : 1,
                }}
              >
                Hint (-10) 🪙
              </button>
            </div>

            <div style={{ padding: quizPad }}>
              <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", borderRadius: "var(--radius-sm)", padding: isMobile ? 12 : 16 }}>
                {hintText ? (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 16,
                      border: "1px solid rgba(214,168,79,.28)",
                      background: "rgba(214,168,79,.10)",
                      color: "rgba(246,231,200,.92)",
                      fontWeight: 900,
                      fontSize: 13,
                      lineHeight: 1.35,
                    }}
                  >
                    {hintText}
                  </div>
                ) : null}

                {(() => {
                  const q = quizQRef.current[qi];
                  if (!q) return null;

                  const opts = Array.isArray(q?.options) ? q.options : [];

                  if (q.type === "image") {
                    return (
                      <>
                        <p className="bnQuestion" style={{ margin: "0 0 18px 0", fontSize: QUESTION_SIZE, lineHeight: 1.12 }}>
                          {q.prompt}
                        </p>

                        <div
                          style={{
                            width: "100%",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid rgba(255,255,255,.12)",
                            background: "rgba(0,0,0,.18)",
                            overflow: "hidden",
                            marginBottom: 12,
                          }}
                        >
                          <img
                            src={q.imageUrl}
                            alt="clue"
                            draggable={false}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            style={{
                              width: "100%",
                              height: isMobile ? 160 : 220,
                              objectFit: "cover",
                              display: "block",
                              filter: "saturate(1.05) contrast(1.02)",
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          {opts.map((opt) => {
                            const isSel = selected === opt;
                            return (
                              <div
                                key={opt}
                                onClick={() => onPick(opt)}
                                role="button"
                                tabIndex={0}
                                style={{
                                  background: "rgba(255,255,255,.07)",
                                  border: "1px solid rgba(255,255,255,.12)",
                                  padding: `${OPTION_PAD_Y}px ${OPTION_PAD_X}px`,
                                  borderRadius: "var(--radius-sm)",
                                  fontWeight: 1000,
                                  fontSize: OPTION_SIZE,
                                  cursor: checked ? "not-allowed" : "pointer",
                                  userSelect: "none",
                                  outline: isSel ? "2px solid rgba(214,168,79,.75)" : "none",
                                }}
                              >
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  }

                  if (q.type === "tf") {
                    return (
                      <>
                        <div className="bnQuestion" style={{ fontSize: STATEMENT_SIZE, lineHeight: 1.22, marginBottom: 14 }}>
                          {q.statement}
                        </div>

                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {["Benar", "Salah"].map((label) => {
                            const isSel = selected === label;
                            return (
                              <div
                                key={label}
                                onClick={() => onPick(label)}
                                role="button"
                                tabIndex={0}
                                style={{
                                  background: "rgba(255,255,255,.07)",
                                  border: "1px solid rgba(255,255,255,.12)",
                                  padding: `${OPTION_PAD_Y}px ${OPTION_PAD_X}px`,
                                  borderRadius: "var(--radius-sm)",
                                  fontWeight: 1000,
                                  fontSize: OPTION_SIZE,
                                  cursor: checked ? "not-allowed" : "pointer",
                                  userSelect: "none",
                                  outline: isSel ? "2px solid rgba(214,168,79,.75)" : "none",
                                }}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  }

                  if (q.type === "scramble") {
                    const current = selected || "";
                    const cleanAns = (q.answer || "").toString().replace(/\s+/g, "").toLowerCase();

                    return (
                      <>
                        <p className="bnQuestion" style={{ margin: "0 0 18px 0", fontSize: QUESTION_SIZE, lineHeight: 1.12 }}>
                          {q.prompt}
                        </p>

                        <div
                          style={{
                            marginTop: 10,
                            borderRadius: "var(--radius-sm)",
                            border: "2px dashed rgba(246,231,200,.25)",
                            minHeight: 54,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 1100,
                            fontSize: isMobile ? 20 : 24,
                            letterSpacing: 1,
                            background: "rgba(0,0,0,.12)",
                          }}
                        >
                          {current || "—"}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                          {(q.tokens || []).map((tkn, idx) => (
                            <div
                              key={`${tkn}-${idx}`}
                              onClick={() => {
                                if (checked) return;
                                try {
                                  Telemetry.trackClick();
                                } catch {}
                                const next = `${selected ? `${selected} ` : ""}${tkn}`;
                                setSelected(next);

                                const cleanNext = next.replace(/\s+/g, "").toLowerCase();
                                if (cleanNext === cleanAns || cleanNext.length >= cleanAns.length) {
                                  checkAnswer(next);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              style={{
                                minWidth: isMobile ? 64 : 76,
                                height: isMobile ? 44 : 48,
                                padding: "0 12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255,255,255,.07)",
                                border: "1px solid rgba(255,255,255,.12)",
                                borderRadius: "var(--radius-sm)",
                                fontWeight: 1100,
                                fontSize: OPTION_SIZE,
                                cursor: checked ? "not-allowed" : "pointer",
                                userSelect: "none",
                              }}
                            >
                              {tkn}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (checked) return;
                              try {
                                Telemetry.trackClick();
                              } catch {}
                              setSelected("");
                            }}
                            style={{
                              appearance: "none",
                              border: "1px solid rgba(255,255,255,.12)",
                              background: "rgba(255,255,255,.07)",
                              color: "var(--bn-text)",
                              borderRadius: "var(--radius-sm)",
                              padding: "10px 14px",
                              fontWeight: 1000,
                              cursor: checked ? "not-allowed" : "pointer",
                              fontSize: 14,
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </>
                    );
                  }

                  return (
                    <>
                      <p className="bnQuestion" style={{ margin: "0 0 18px 0", fontSize: QUESTION_SIZE, lineHeight: 1.12 }}>
                        {q.prompt}
                      </p>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {opts.map((opt) => {
                          const isSel = selected === opt;
                          return (
                            <div
                              key={opt}
                              onClick={() => onPick(opt)}
                              role="button"
                              tabIndex={0}
                              style={{
                                background: "rgba(255,255,255,.07)",
                                border: "1px solid rgba(255,255,255,.12)",
                                padding: `${OPTION_PAD_Y}px ${OPTION_PAD_X}px`,
                                borderRadius: "var(--radius-sm)",
                                fontWeight: 1000,
                                fontSize: OPTION_SIZE,
                                cursor: checked ? "not-allowed" : "pointer",
                                userSelect: "none",
                                outline: isSel ? "2px solid rgba(214,168,79,.75)" : "none",
                              }}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

                {checked ? (
                  <div style={{ marginTop: 14, fontWeight: 1000, color: "var(--bn-muted)", fontSize: 14 }}>
                    {lastOutcome === "correct" ? "✅ Benar" : lastOutcome === "wrong" ? "❌ Salah" : lastOutcome === "timeout" ? "⏳ Timeout" : ""}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                padding: isMobile ? "12px 14px" : "14px 18px",
                borderTop: "1px solid rgba(255,255,255,.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "var(--bn-muted)", fontWeight: 1000, fontSize: 14 }}>{`${gateCorrect}/${QUESTIONS_PER_GATE}`}</div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {checked ? (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    style={{
                      appearance: "none",
                      cursor: "pointer",
                      borderRadius: "var(--radius-sm)",
                      padding: isMobile ? "12px 14px" : "14px 18px",
                      fontWeight: 1100,
                      fontSize: isMobile ? 16 : 18,
                      color: "#07121f",
                      background: "rgba(73,208,138,.90)",
                      border: "1px solid rgba(73,208,138,.90)",
                    }}
                  >
                    Lanjut
                  </button>
                ) : (
                  <div style={{ color: "var(--bn-muted)", fontWeight: 900, fontSize: 13 }}>Pilih jawaban untuk lanjut</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== Toast ===================== */}
      {toastMsg ? (
        <div
          style={{
            position: "fixed",
            bottom: 18,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 80,
            background: "rgba(0,0,0,.55)",
            border: "1px solid rgba(255,255,255,.12)",
            color: "var(--bn-text)",
            padding: "10px 14px",
            borderRadius: 999,
            fontWeight: 900,
            fontFamily: "var(--font)",
            backdropFilter: "blur(8px)",
          }}
        >
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}