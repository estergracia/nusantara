// src/utils/authIdentity.js
// Username + PIN (4 digit) -> Firebase Email/Password (synthetic email).
// Password dibuat "kuat" agar tidak ditolak Firebase.

export function normalizeUsername(input) {
  const raw = (input || "").trim().toLowerCase();
  const safe = raw
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  return safe;
}

export function usernameToEmail(username) {
  const u = normalizeUsername(username);
  return `${u}@nusantara.local`;
}

export function isValidUsername(username) {
  const u = normalizeUsername(username);
  return u.length >= 3;
}

export function sanitizePin(v) {
  // ambil angka saja, max 4 digit
  return String(v || "").replace(/\D/g, "").slice(0, 4);
}

export function isValidPin(pin) {
  const p = sanitizePin(pin);
  return /^\d{4}$/.test(p);
}

/**
 * Buat password kuat deterministik dari username+pin:
 * - minimal 12+
 * - ada huruf besar, kecil, angka, simbol
 */
export function derivePassword(username, pin) {
  const u = normalizeUsername(username);
  const p = sanitizePin(pin);

  // “salt” konstan (untuk prototype). Bisa kamu ganti nama project.
  const SALT = "BNusantara#2025";

  // bentuk password: Ab! + user + _ + pin + @ + salt
  // contoh: Ab!esther_1234@BNusantara#2025
  return `Ab!${u}_${p}@${SALT}`;
}
