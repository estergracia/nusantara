// src/utils/sfx.js

// =========================
// Global switches / state
// =========================
let _audioUnlocked = false; // user gesture sudah terjadi
let _audioMode = "off"; // off | medium | complex

// Legacy toggles (supaya call lama tidak rusak)
let _autoBgm = false; // legacy: khusus complex
let _legacyEnabled = false; // legacy: enable complex

// =========================
// Helpers
// =========================
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// =========================
// WebAudio
// - medium soft SFX + complex tap + warning beep (via limiter)
// - complex file SFX (via BYPASS BUS -> destination) biar keras & jelas
// =========================
let _ctx = null;
let _master = null;
let _limiter = null;
let _fileBus = null; // ✅ jalur khusus file SFX, bypass limiter
let _activeOscs = new Set();

function getCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!_ctx) {
    _ctx = new AudioCtx();

    _master = _ctx.createGain();
    _master.gain.value = 1.0;

    // limiter biar aman untuk oscillator & beep
    _limiter = _ctx.createDynamicsCompressor();
    _limiter.threshold.value = -16;
    _limiter.knee.value = 18;
    _limiter.ratio.value = 8;
    _limiter.attack.value = 0.003;
    _limiter.release.value = 0.14;

    _master.connect(_limiter);
    _limiter.connect(_ctx.destination);

    // ✅ FILE BUS: file SFX langsung ke output (lebih jelas, tidak “kecut” oleh limiter)
    _fileBus = _ctx.createGain();
    _fileBus.gain.value = 1.0;
    _fileBus.connect(_ctx.destination);
  }

  return _ctx;
}

async function resumeCtxIfNeeded() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }
}

function stopAllOsc() {
  if (!_ctx) return;
  const now = _ctx.currentTime;

  for (const o of _activeOscs) {
    try {
      o.stop(now);
    } catch {}
  }
  _activeOscs.clear();
}

// =========================
// BGM (pisah medium vs complex)
// =========================
let _bgmComplex = null;
let _bgmMedium = null;

let _bgmComplexVol = 0.50; // 0.35–0.50
let _bgmMediumVol = 0.20; // 0.15–0.25

function bgmComplexUrl() {
  return `${import.meta.env.BASE_URL}sound/Ethnic-music.mp3`;
}
function bgmMediumUrl() {
  return `${import.meta.env.BASE_URL}sound/indonesian-epic-382988.mp3`;
}

function initBgmComplex() {
  if (_bgmComplex) return _bgmComplex;
  const a = new Audio(bgmComplexUrl());
  a.loop = true;
  a.preload = "auto";
  a.volume = _bgmComplexVol;
  _bgmComplex = a;
  return a;
}

function initBgmMedium() {
  if (_bgmMedium) return _bgmMedium;
  const a = new Audio(bgmMediumUrl());
  a.loop = true;
  a.preload = "auto";
  a.volume = _bgmMediumVol;
  _bgmMedium = a;
  return a;
}

export function setBgmVolume(v) {
  _bgmComplexVol = clamp(Number(v) || 0.50, 0.35, 0.50);
  if (_bgmComplex && _audioMode === "complex") _bgmComplex.volume = _bgmComplexVol;
}

export function setMediumBgmVolume(v) {
  _bgmMediumVol = clamp(Number(v) || 0.20, 0.15, 0.25);
  if (_bgmMedium && _audioMode === "medium") _bgmMedium.volume = _bgmMediumVol;
}

export async function playBgm() {
  if (_audioMode !== "complex") return;
  if (!_audioUnlocked) return;

  stopMediumBgm();

  const a = initBgmComplex();
  a.volume = _bgmComplexVol;

  if (!a.paused) return;

  try {
    await a.play();
  } catch (e) {
    console.warn("playBgm blocked:", e);
  }
}

export async function playMediumBgm() {
  if (_audioMode !== "medium") return;
  if (!_audioUnlocked) return;

  stopComplexBgm();

  const a = initBgmMedium();
  a.volume = _bgmMediumVol;

  if (!a.paused) return;

  try {
    await a.play();
  } catch (e) {
    console.warn("playMediumBgm blocked:", e);
  }
}

export function stopComplexBgm() {
  if (!_bgmComplex) return;
  _bgmComplex.pause();
  try {
    _bgmComplex.currentTime = 0;
  } catch {}
}

export function stopMediumBgm() {
  if (!_bgmMedium) return;
  _bgmMedium.pause();
  try {
    _bgmMedium.currentTime = 0;
  } catch {}
}

export function stopBgm() {
  stopComplexBgm();
  stopMediumBgm();
}

// =========================
// ✅ Pause/resume BGM saat SFX complex (anti race)
// =========================
let _duckDepth = 0;
let _bgmWasPlayingBeforeDuck = false;
let _duckTimers = new Set();

function resetDuckState() {
  for (const t of _duckTimers) {
    try {
      clearTimeout(t);
    } catch {}
  }
  _duckTimers.clear();
  _duckDepth = 0;
  _bgmWasPlayingBeforeDuck = false;
}

function pauseComplexBgmForSfx() {
  if (_audioMode !== "complex") return;
  if (!_bgmComplex) return;

  _duckDepth += 1;

  if (_duckDepth === 1) {
    _bgmWasPlayingBeforeDuck = !_bgmComplex.paused;
    if (_bgmWasPlayingBeforeDuck) {
      try {
        _bgmComplex.pause();
      } catch {}
    }
  }
}

function pauseComplexBgmForSfxTimed(ms = 1000) {
  if (_audioMode !== "complex") return () => {};
  if (!_bgmComplex) return () => {};

  _duckDepth += 1;

  if (_duckDepth === 1) {
    _bgmWasPlayingBeforeDuck = !_bgmComplex.paused;
    if (_bgmWasPlayingBeforeDuck) {
      try {
        _bgmComplex.pause();
      } catch {}
    }
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    resumeComplexBgmAfterSfx();
  };

  const t = setTimeout(() => {
    _duckTimers.delete(t);
    release();
  }, Math.max(0, Number(ms) || 0));

  _duckTimers.add(t);

  return release;
}

async function resumeComplexBgmAfterSfx() {
  if (_audioMode !== "complex") return;
  if (!_bgmComplex) return;

  _duckDepth = Math.max(0, _duckDepth - 1);
  if (_duckDepth !== 0) return;

  if (_bgmWasPlayingBeforeDuck && _audioUnlocked) {
    try {
      await _bgmComplex.play();
    } catch {}
  }
  _bgmWasPlayingBeforeDuck = false;
}

// =========================
// Medium SFX
// =========================
let _mediumSfxEnabled = true;
let _mediumSfxVol = 0.28;
const _MEDIUM_SFX_MAX = 0.45;

export function setMediumSfxEnabled(on) {
  _mediumSfxEnabled = !!on;
}

export function setMediumSfxVolume(v) {
  _mediumSfxVol = clamp(Number(v) || 0.28, 0, _MEDIUM_SFX_MAX);
}

function playMediumSoftSfx(type, volOverride) {
  const ctx = getCtx();
  if (!ctx || !_master) return;

  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.connect(g);
  g.connect(_master);

  const peak = clamp(typeof volOverride === "number" ? volOverride : _mediumSfxVol, 0, _MEDIUM_SFX_MAX);
  const dur = type === "tap" ? 0.06 : type === "correct" ? 0.11 : 0.12;

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.007);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  o.type = "sine";

  if (type === "correct") {
    o.frequency.setValueAtTime(560, now);
    o.frequency.exponentialRampToValueAtTime(760, now + 0.06);
  } else if (type === "wrong") {
    o.frequency.setValueAtTime(260, now);
    o.frequency.exponentialRampToValueAtTime(190, now + 0.08);
  } else {
    o.frequency.setValueAtTime(440, now);
    o.frequency.exponentialRampToValueAtTime(520, now + 0.04);
  }

  _activeOscs.add(o);
  o.onended = () => _activeOscs.delete(o);

  o.start(now);
  o.stop(now + dur + 0.02);
}

// ✅ Badge chime (untuk popup badge)
function playBadgeChime() {
  if (!_audioUnlocked) return;

  const ctx = getCtx();
  if (!ctx || !_master) return;

  const now = ctx.currentTime;
  const notes = [660, 880];
  const dur = 0.10;

  notes.forEach((freq, i) => {
    const t0 = now + i * 0.11;

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    o.connect(g);
    g.connect(_master);

    _activeOscs.add(o);
    o.onended = () => _activeOscs.delete(o);

    o.start(t0);
    o.stop(t0 + dur + 0.02);
  });
}

// =========================
// Complex SFX — file gong + tap osc
// =========================
let _complexSfxVol = 1.0; // 0.40–1.00
let _tapVol = 0.24; // 0.08–0.30
let _complexBoost = 3.4; // 1.0–4.0

function sfxWrongUrl() {
  return `${import.meta.env.BASE_URL}sound/gong-indonesia-olistik-sound.mp3`;
}

const _bufCache = new Map();
async function loadBuffer(url) {
  const ctx = getCtx();
  if (!ctx) return null;

  const cached = _bufCache.get(url);
  if (cached) return cached;

  try {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    _bufCache.set(url, buf);
    return buf;
  } catch (e) {
    console.warn("loadBuffer failed:", url, e);
    return null;
  }
}

export function setComplexSfxVolume(v) {
  _complexSfxVol = clamp(Number(v) || 1.0, 0.40, 1.00);
}
export function setTapVolume(v) {
  _tapVol = clamp(Number(v) || 0.24, 0.08, 0.30);
}
export function setComplexSfxBoost(v) {
  _complexBoost = clamp(Number(v) || 3.4, 1.0, 4.0);
}

// loop state
let _loopSrc = null;
let _loopGain = null;

export function stopLoopSfx() {
  const ctx = getCtx();
  if (!ctx) return;

  if (_loopSrc) {
    try {
      _loopSrc.stop();
    } catch {}
    _loopSrc = null;
  }
  _loopGain = null;

  try {
    resumeComplexBgmAfterSfx();
  } catch {}
}

function playTapOsc(vol01 = 0.16) {
  if (!_audioUnlocked) return;

  const ctx = getCtx();
  if (!ctx || !_master) return;

  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.connect(g);
  g.connect(_master);

  const peak = clamp(vol01, 0.06, 0.35);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  o.type = "sine";
  o.frequency.setValueAtTime(420, now);
  o.frequency.exponentialRampToValueAtTime(520, now + 0.04);

  _activeOscs.add(o);
  o.onended = () => _activeOscs.delete(o);

  o.start(now);
  o.stop(now + 0.07);
}

async function playComplexFileSfxOnce(type, volMul = 1.0) {
  if (!_audioUnlocked) return;

  const ctx = getCtx();
  if (!ctx || !_fileBus) return;

  // complex correct = silent
  if (type === "correct") return;

  const url = type === "wrong" ? sfxWrongUrl() : null;
  if (!url) return;

  await resumeCtxIfNeeded();

  const buf = await loadBuffer(url);
  if (!buf) {
    playMediumSoftSfx(type);
    return;
  }

  const releaseDuck = pauseComplexBgmForSfxTimed(1000);

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const g = ctx.createGain();
  const mul = clamp(Number(volMul) || 1.0, 0.6, 1.6);
  g.gain.value = clamp(_complexSfxVol, 0.40, 1.00) * _complexBoost * mul;

  src.connect(g);
  g.connect(_fileBus);

  _activeOscs.add(src);
  src.onended = () => _activeOscs.delete(src);

  try {
    src.start();
  } catch {
    try {
      releaseDuck?.();
    } catch {}
    playMediumSoftSfx(type);
  }
}

async function playComplexFileSfxLoop(type, volMul = 1.0) {
  if (!_audioUnlocked) return;

  stopLoopSfx();

  const ctx = getCtx();
  if (!ctx || !_fileBus) return;

  if (type === "correct") return;

  const url = type === "wrong" ? sfxWrongUrl() : null;
  if (!url) return;

  await resumeCtxIfNeeded();

  const buf = await loadBuffer(url);
  if (!buf) {
    playMediumSoftSfx(type);
    return;
  }

  pauseComplexBgmForSfx();

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const g = ctx.createGain();
  const mul = clamp(Number(volMul) || 1.0, 0.6, 1.6);
  g.gain.value = clamp(_complexSfxVol, 0.40, 1.00) * _complexBoost * mul;

  src.connect(g);
  g.connect(_fileBus);

  _loopSrc = src;
  _loopGain = g;

  try {
    src.start();
  } catch {
    stopLoopSfx();
  }
}

// =========================
// Warning beep (complex only, <=3 detik)
// =========================
let _warnBeepVol = 0.70;

export function setWarningBeepVolume(v) {
  _warnBeepVol = clamp(Number(v) || 0.70, 0.45, 0.70);
}

export function onTimeWarning(remainingSeconds) {
  if (_audioMode !== "complex") return;
  if (!_audioUnlocked) return;

  if (remainingSeconds <= 3 && remainingSeconds > 0) {
    playWarningBeepOnce();
  }
}

function playWarningBeepOnce() {
  const ctx = getCtx();
  if (!ctx || !_master) return;

  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.connect(g);
  g.connect(_master);

  const peak = _warnBeepVol;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  o.type = "square";
  o.frequency.setValueAtTime(880, now);

  _activeOscs.add(o);
  o.onended = () => _activeOscs.delete(o);

  o.start(now);
  o.stop(now + 0.10);
}

// =========================
// Public controls: mode + unlock
// =========================
export function setAudioMode(mode) {
  const raw = String(mode || "off").toLowerCase();

  let next = raw;
  if (next === "simple" || next === "simpel") next = "off";

  const normalized = next === "complex" || next === "medium" ? next : "off";

  if (normalized === _audioMode) return;

  const prev = _audioMode;
  _audioMode = normalized;

  stopLoopSfx();
  stopAllOsc();

  if (prev === "complex" && _audioMode !== "complex") resetDuckState();
  if (_audioMode === "off") resetDuckState();

  if (prev === "complex" && _audioMode !== "complex") stopComplexBgm();
  if (prev === "medium" && _audioMode !== "medium") stopMediumBgm();

  // ✅ HARD STOP off (biar gak bocor)
  if (_audioMode === "off") {
    stopBgm();
    return;
  }

  if (_audioUnlocked) {
    if (_audioMode === "complex") playBgm();
    if (_audioMode === "medium") playMediumBgm();
  }
}

export async function unlockAudio() {
  _audioUnlocked = true;
  await resumeCtxIfNeeded();

  if (_audioMode === "complex") {
    try {
      await Promise.all([loadBuffer(sfxWrongUrl())]);
    } catch {}
  }

  if (_audioMode === "complex") playBgm();
  if (_audioMode === "medium") playMediumBgm();
}

// =========================
// Public: play SFX
// =========================
export function playSfx(type = "tap", opts = undefined) {
  if (!_audioUnlocked) return;

  const isObj = opts && typeof opts === "object";
  const loop = !!(isObj && opts.loop);

  if (_audioMode === "medium") {
    if (!_mediumSfxEnabled) return;

    if (type === "badge") {
      playBadgeChime();
      return;
    }

    if (type !== "correct" && type !== "wrong" && type !== "tap") return;

    const v = isObj && typeof opts.volume === "number" ? opts.volume : undefined;
    playMediumSoftSfx(type, v);
    return;
  }

  if (_audioMode === "complex") {
    if (type === "badge") {
      playBadgeChime();
      return;
    }

    if (type === "tap") {
      const v = isObj && typeof opts.volume === "number" ? opts.volume : _tapVol;
      playTapOsc(v);
      return;
    }

    if (type === "correct") return;

    if (type === "wrong") {
      const mul = isObj && typeof opts.volume === "number" ? opts.volume : 1.0;
      if (loop) playComplexFileSfxLoop(type, mul);
      else playComplexFileSfxOnce(type, mul);
      return;
    }

    if (type === "unlock") {
      playTapOsc(0.26);
      return;
    }
  }
}

// =========================
// Legacy API
// =========================
export function setAudioEnabled(on) {
  _legacyEnabled = !!on;

  if (!_legacyEnabled) {
    _audioMode = "off";
    stopLoopSfx();
    stopBgm();
    stopAllOsc();
    resetDuckState();
    return;
  }

  _audioMode = "complex";
  stopMediumBgm();

  if (_audioUnlocked) playBgm();
}

export function setAutoBgm(on) {
  _autoBgm = !!on;

  if (_audioMode !== "complex") return;

  if (!_autoBgm) {
    stopComplexBgm();
    return;
  }

  stopMediumBgm();

  if (_audioUnlocked) playBgm();
}

export function setSfxVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return;

  const norm = clamp(n / 3, 0, 1);

  setComplexSfxVolume(0.40 + norm * 0.60);
  setTapVolume(0.08 + norm * 0.22);
  setMediumSfxVolume(norm * _MEDIUM_SFX_MAX);
}