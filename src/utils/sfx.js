// src/utils/sfx.js

// =========================
// Global switches
// =========================
let _enabled = false;         // hanya true saat mode complex
let _autoBgm = false;         // kalau true, bgm akan jalan setelah unlock gesture
let _audioUnlocked = false;   // user gesture sudah terjadi

// =========================
// SFX (WebAudio)
// =========================
let _ctx = null;
let _master = null;
let _limiter = null;

// boost khusus SFX
let _sfxVolume = 1.8; // 1.0 normal, 1.6-2.2 enak lawan bgm

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!_ctx) {
    _ctx = new AudioCtx();

    // master
    _master = _ctx.createGain();
    _master.gain.value = 1.0;

    // limiter/compressor supaya SFX kenceng tapi gak pecah
    _limiter = _ctx.createDynamicsCompressor();
    _limiter.threshold.value = -16;
    _limiter.knee.value = 18;
    _limiter.ratio.value = 8;
    _limiter.attack.value = 0.003;
    _limiter.release.value = 0.14;

    _master.connect(_limiter);
    _limiter.connect(_ctx.destination);
  }

  return _ctx;
}

async function resumeCtxIfNeeded() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

// =========================
// BGM (HTMLAudioElement)
// =========================
let _bgm = null;
let _bgmBaseVol = 0.22; // ✅ backsound sengaja kecil
let _duckTimer = null;

function bgmUrl() {
  // file ada di public/sound/indonesian-epic-382988.mp3
  return `${import.meta.env.BASE_URL}sound/indonesian-epic-382988.mp3`;
}

function initBgm() {
  if (_bgm) return _bgm;
  _bgm = new Audio(bgmUrl());
  _bgm.loop = true;
  _bgm.preload = "auto";
  _bgm.volume = _bgmBaseVol;
  return _bgm;
}

export function setBgmVolume(v) {
  _bgmBaseVol = clamp(Number(v) || 0, 0, 1);
  if (_bgm) _bgm.volume = _bgmBaseVol;
}

function duckBgm(factor = 0.35, ms = 220) {
  if (!_bgm) return;
  if (_duckTimer) clearTimeout(_duckTimer);

  const base = _bgmBaseVol;
  _bgm.volume = clamp(base * factor, 0, 1);

  _duckTimer = setTimeout(() => {
    if (_bgm) _bgm.volume = _bgmBaseVol;
    _duckTimer = null;
  }, ms);
}

export async function playBgm() {
  if (!_enabled) return;      // hanya complex
  if (!_autoBgm) return;
  if (!_audioUnlocked) return;

  const a = initBgm();
  try {
    await a.play();
  } catch (e) {
    // autoplay bisa keblok kalau belum gesture
    console.warn("playBgm blocked:", e);
  }
}

export function stopBgm() {
  if (!_bgm) return;
  _bgm.pause();
  try {
    _bgm.currentTime = 0;
  } catch {
    // ignore
  }
}

// =========================
// ✅ Unlock SFX (MP3)
// =========================
let _unlockSfx = null;

function unlockSfxUrl() {
  // ✅ file ada di public/sound/material-mold-394512.mp3
  return `${import.meta.env.BASE_URL}sound/material-mold-394512.mp3`;
}

function initUnlockSfx() {
  if (_unlockSfx) return _unlockSfx;
  _unlockSfx = new Audio(unlockSfxUrl());
  _unlockSfx.preload = "auto";
  _unlockSfx.loop = false;
  // volume 0..1 (kita scale dari _sfxVolume)
  _unlockSfx.volume = clamp(0.35 * _sfxVolume, 0, 1);
  return _unlockSfx;
}

function playUnlockSample() {
  if (!_enabled) return;          // hanya complex
  if (!_audioUnlocked) return;    // harus sudah unlock gesture

  // duck bgm supaya jelas
  duckBgm(0.28, 420);

  const a = initUnlockSfx();
  a.volume = clamp(0.35 * _sfxVolume, 0, 1);

  try {
    a.currentTime = 0;
  } catch {}

  const p = a.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => {
      // fallback: kalau play() gagal, tetap bunyi via oscillator
      try {
        _playNow("unlock");
      } catch {}
    });
  }
}

// =========================
// Public controls (dipanggil dari App.jsx)
// =========================
export function setAudioEnabled(on) {
  _enabled = !!on;

  // kalau bukan complex -> pastikan semuanya mati
  if (!_enabled) {
    stopBgm();
    return;
  }

  playBgm();
}

export function setAutoBgm(on) {
  _autoBgm = !!on;

  if (!_autoBgm) {
    stopBgm();
    return;
  }

  playBgm();
}

export function setSfxVolume(v) {
  _sfxVolume = clamp(Number(v) || 1, 0, 3);

  // ✅ ikut update volume unlock sample juga
  if (_unlockSfx) _unlockSfx.volume = clamp(0.35 * _sfxVolume, 0, 1);
}

// Dipanggil saat user gesture pertama (pointerdown/keydown/touchstart)
// supaya audio bisa jalan (browser policy)
export async function unlockAudio() {
  _audioUnlocked = true;
  await resumeCtxIfNeeded();
  // init unlock sample biar siap dipakai
  try { initUnlockSfx(); } catch {}
  // coba nyalakan bgm kalau mode complex & autoBgm aktif
  playBgm();
}

// =========================
// SFX generator
// =========================
function _playNow(type = "tap") {
  if (!_enabled) return; // ✅ hanya complex
  const ctx = getCtx();
  if (!ctx || !_master) return;

  // duck bgm supaya sfx lebih terdengar
  duckBgm(0.30, 240);

  const now = ctx.currentTime;

  const isUnlock = type === "unlock";
  const isWrong = type === "wrong";
  const isCorrect = type === "correct";

  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.connect(g);
  g.connect(_master);

  // envelope
  const basePeak = isUnlock ? 0.34 : isCorrect ? 0.22 : isWrong ? 0.22 : 0.12;
  const peak = basePeak * _sfxVolume;

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + (isUnlock ? 0.22 : 0.14));

  // tone
  if (isCorrect) {
    o.type = "sine";
    o.frequency.setValueAtTime(660, now);
    o.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  } else if (isWrong) {
    o.type = "square";
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(110, now + 0.12);
  } else if (isUnlock) {
    o.type = "triangle";
    o.frequency.setValueAtTime(520, now);
    o.frequency.exponentialRampToValueAtTime(980, now + 0.16);
  } else {
    // tap
    o.type = "sine";
    o.frequency.setValueAtTime(420, now);
    o.frequency.exponentialRampToValueAtTime(520, now + 0.06);
  }

  o.start(now);
  o.stop(now + (isUnlock ? 0.25 : 0.16));
}

export function playSfx(type = "tap") {
  if (!_enabled) return; // ✅ only complex

  // ✅ unlock: pakai MP3 sample
  if (type === "unlock") {
    playUnlockSample();
    return;
  }

  // jangan maksa resume ctx di sini (bisa keblok), tapi kalau sudah unlock aman
  _playNow(type);
}
