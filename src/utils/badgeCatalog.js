// src/utils/badgeCatalog.js
import { CAMPAIGN_TOTAL_LEVELS } from "./storage.js";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ✅ Ambil dari folder public/images/badge
// Vite: import.meta.env.BASE_URL biasanya "/" saat dev,
// dan aman kalau nanti deploy di subfolder.
function asset(file) {
  return `${import.meta.env.BASE_URL}images/badge/${file}`;
}

const PTS_PER_CORRECT = 10;

function campaignLevel(s) {
  const raw = Number(s?.globalLevel ?? 0);
  return clamp(raw, 0, CAMPAIGN_TOTAL_LEVELS); // 0..45
}

export const BADGE_CATALOG = [
  {
    id: "badge_level_11_serindit",
    name: "Burung Serindit",
    description: "Mencapai level 11.",
    tier: "silver",
    icon: "🏅",
    iconUrl: asset("badge_serindit.png"),
    lockedIconUrl: asset("badge_locked_serindit.png"),
    condition: (s) => campaignLevel(s) >= 11,
    progress: (s) => {
      const cur = Math.min(11, campaignLevel(s));
      return { cur: clamp01(cur / 11), text: `${cur}/11` };
    },
  },
  {
    id: "badge_level_26_pesut",
    name: "Pesut Mahakam",
    description: "Mencapai level 26.",
    tier: "gold",
    icon: "🏅",
    iconUrl: asset("badge_pesut.png"),
    lockedIconUrl: asset("badge_locked_pesut.png"),
    condition: (s) => campaignLevel(s) >= 26,
    progress: (s) => {
      const cur = Math.min(26, campaignLevel(s));
      return { cur: clamp01(cur / 26), text: `${cur}/26` };
    },
  },
  {
    id: "badge_level_45_harimau",
    name: "Harimau Sumatera",
    description: "Menyelesaikan semua 45 level kuis.",
    tier: "legendary",
    icon: "🏆",
    iconUrl: asset("badge_harimau.png"),
    lockedIconUrl: asset("badge_locked_harimau.png"),
    condition: (s) => campaignLevel(s) >= 45,
    progress: (s) => {
      const cur = Math.min(45, campaignLevel(s));
      return { cur: clamp01(cur / 45), text: `${cur}/45` };
    },
  },

  {
    id: "badge_streak_5_kepodang",
    name: "Burung Kepodang",
    description: "Menjawab benar 5 soal beruntun tanpa salah.",
    tier: "silver",
    icon: "🔥",
    iconUrl: asset("badge_kepodang.png"),
    lockedIconUrl: asset("badge_locked_kepodang.png"),
    condition: (s) => (s?.bestStreak || 0) >= 5,
    progress: (s) => {
      const cur = Math.min(5, s?.bestStreak || 0);
      return { cur: clamp01(cur / 5), text: `${cur}/5` };
    },
  },
  {
    id: "badge_streak_10_gajah",
    name: "Gajah Sumatera",
    description: "Menjawab benar 10 soal beruntun tanpa salah.",
    tier: "gold",
    icon: "🔥",
    iconUrl: asset("badge_gajah.png"),
    lockedIconUrl: asset("badge_locked_gajah.png"),
    condition: (s) => (s?.bestStreak || 0) >= 10,
    progress: (s) => {
      const cur = Math.min(10, s?.bestStreak || 0);
      return { cur: clamp01(cur / 10), text: `${cur}/10` };
    },
  },

  {
    id: "badge_perfect_easy_jalak",
    name: "Burung Jalak Bali",
    description: "Semua soal tanpa kesalahan.",
    tier: "silver",
    icon: "🌟",
    iconUrl: asset("badge_jalak.png"),
    lockedIconUrl: asset("badge_locked_jalak.png"),
    condition: (s) => (s?.perfectByMode?.easy || 0) >= 1,
    progress: (s) => {
      const cur = Math.min(1, s?.perfectByMode?.easy || 0);
      return { cur: clamp01(cur / 1), text: `${cur}/1` };
    },
  },
  {
    id: "badge_perfect_normal_elang",
    name: "Burung Elang Bondol",
    description: "Semua soal tanpa kesalahan.",
    tier: "gold",
    icon: "🌟",
    iconUrl: asset("badge_elang.png"),
    lockedIconUrl: asset("badge_locked_elang.png"),
    condition: (s) => (s?.perfectByMode?.normal || 0) >= 1,
    progress: (s) => {
      const cur = Math.min(1, s?.perfectByMode?.normal || 0);
      return { cur: clamp01(cur / 1), text: `${cur}/1` };
    },
  },
  {
    id: "badge_perfect_hard_komodo",
    name: "Komodo",
    description: "Semua soal tanpa kesalahan.",
    tier: "legendary",
    icon: "🌟",
    iconUrl: asset("badge_komodo.png"),
    lockedIconUrl: asset("badge_locked_komodo.png"),
    condition: (s) => (s?.perfectByMode?.hard || 0) >= 1,
    progress: (s) => {
      const cur = Math.min(1, s?.perfectByMode?.hard || 0);
      return { cur: clamp01(cur / 1), text: `${cur}/1` };
    },
  },

  {
    id: "badge_speed_normal_tarsius",
    name: "Tarsius",
    description: "Waktu rata-rata < 10 detik.",
    tier: "silver",
    icon: "⏱️",
    iconUrl: asset("badge_tarsius.png"),
    lockedIconUrl: asset("badge_locked_tarsius.png"),
    condition: (s) => {
      const t = s?.avgTimeByMode?.normal || 0;
      return t > 0 && t < 10;
    },
    progress: (s) => {
      const t = s?.avgTimeByMode?.normal || 0;
      if (!t) return { cur: 0, text: "-" };
      return { cur: clamp01((10 - Math.min(10, t)) / 10), text: `${t.toFixed(1)}s (target < 10s)` };
    },
  },

  {
    id: "badge_accuracy_normal_kasuari",
    name: "Burung Kasuari",
    description: "Akurasi ≥ 80%.",
    tier: "gold",
    icon: "🎯",
    iconUrl: asset("badge_kasuari.png"),
    lockedIconUrl: asset("badge_locked_kasuari.png"),
    condition: (s) => (s?.accuracyByMode?.normal || 0) >= 0.8,
    progress: (s) => {
      const a = s?.accuracyByMode?.normal || 0;
      const pct = Math.round(a * 100);
      return { cur: clamp01(a / 0.8), text: `${Math.min(80, pct)}/80%` };
    },
  },

  {
    id: "badge_score_100_belida",
    name: "Ikan Belida",
    description: `Mencapai total 100 poin.`,
    tier: "silver",
    icon: "🏅",
    iconUrl: asset("badge_belida.png"),
    lockedIconUrl: asset("badge_locked_belida.png"),
    condition: (s) => (s?.scoreTotal || 0) >= 100,
    progress: (s) => {
      const cur = Math.min(100, s?.scoreTotal || 0);
      return { cur: clamp01(cur / 100), text: `${cur}/100` };
    },
  },
  {
    id: "badge_score_150_kuau",
    name: "Burung Kuau Raja",
    description: `Mencapai total 150 poin.`,
    tier: "gold",
    icon: "🏅",
    iconUrl: asset("badge_kuau.png"),
    lockedIconUrl: asset("badge_locked_kuau.png"),
    condition: (s) => (s?.scoreTotal || 0) >= 150,
    progress: (s) => {
      const cur = Math.min(150, s?.scoreTotal || 0);
      return { cur: clamp01(cur / 150), text: `${cur}/150` };
    },
  },
  {
    id: "badge_score_200_cendrawasih",
    name: "Burung Cendrawasih",
    description: `Mencapai total 200 poin.`,
    tier: "legendary",
    icon: "🏆",
    iconUrl: asset("badge_cendrawasih.png"),
    lockedIconUrl: asset("badge_locked_cendrawasih.png"),
    condition: (s) => (s?.scoreTotal || 0) >= 200,
    progress: (s) => {
      const cur = Math.min(200, s?.scoreTotal || 0);
      return { cur: clamp01(cur / 200), text: `${cur}/200` };
    },
  },
];
