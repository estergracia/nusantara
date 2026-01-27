// src/utils/assetImages.js
// Resolver gambar berbasis folder kategori + variant (asli/chibi) + id provinsi.
// Dipakai oleh Learn.jsx dan quizBuilder.js.

export function slugify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ✅ slug khusus untuk public/images yang pakai dash
function dashify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Placeholder SVG (kalau file gambar belum ada)
function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function makePlaceholderDataUri(labelTop, labelBottom) {
  const top = escapeXml(labelTop || "Belajar Nusantara");
  const bottom = escapeXml(labelBottom || "");
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/>
        <stop offset="100%" stop-color="#eef2f7"/>
      </linearGradient>
      <pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M0 12H24" stroke="#e5e7eb" stroke-width="2" opacity="0.5"/>
        <path d="M12 0V24" stroke="#e5e7eb" stroke-width="2" opacity="0.5"/>
      </pattern>
    </defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <rect width="800" height="450" fill="url(#p)" opacity="0.35"/>
    <rect x="36" y="36" width="728" height="378" rx="28" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
    <circle cx="120" cy="120" r="44" fill="#f1f5f9" stroke="#e5e7eb" stroke-width="4"/>
    <path d="M90 210h620" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round" opacity="0.9"/>
    <path d="M90 260h520" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <path d="M90 310h560" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
    <text x="400" y="205" text-anchor="middle" font-size="34" font-weight="700" fill="#0f172a"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">
      ${top}
    </text>
    <text x="400" y="255" text-anchor="middle" font-size="22" font-weight="600" fill="#334155"
      font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">
      ${bottom}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// mapping fieldKey -> folder kategori gambar
// NOTE: folder ini dipakai untuk 2 tempat:
// - src/assets/images/<folder>/<variant>/...  (diindex via glob)
// - public/images/<folder>/<variant>/...      (fallback URL langsung)
const FIELDKEY_TO_FOLDER = {
  iconicAnimal: "hewan-ikonik",
  traditionalHouse: "rumah-adat",
  traditionalClothes: "pakaian-adat",
  traditionalDance: "tarian-daerah",
  traditionalInstrument: "alat-musik",
  traditionalWeapon: "senjata-daerah",
  traditionalFood: "makanan-khas",
};

const CATEGORY_FOLDERS = new Set(Object.values(FIELDKEY_TO_FOLDER).map((x) => slugify(x)));
const VARIANTS = new Set(["asli", "chibi"]);

let _built = false;
let _map = new Map(); // key -> url

function buildIndexOnce() {
  if (_built) return;
  _built = true;

  const glob = import.meta && typeof import.meta.glob === "function" ? import.meta.glob : null;
  if (!glob) return;

  // index hanya di src/assets/images agar ringan
  const mods = glob("../assets/images/**/*.{png,jpg,jpeg,webp}", {
    eager: true,
    as: "url",
  });

  for (const path in mods) {
    const url = mods[path];
    const parts = String(path).split("/");
    const filename = parts[parts.length - 1] || "";
    const base = filename.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    const baseNorm = slugify(base);
    if (!baseNorm) continue;

    const norms = parts.map((p) => slugify(p));

    // cari kategori folder terakhir yang match
    let cat = null;
    for (let i = norms.length - 1; i >= 0; i--) {
      if (CATEGORY_FOLDERS.has(norms[i])) {
        cat = norms[i];
        break;
      }
    }
    if (!cat) continue;

    // cari variant (asli/chibi) di path
    let variant = null;
    for (let i = norms.length - 2; i >= 0; i--) {
      if (VARIANTS.has(norms[i])) {
        variant = norms[i];
        break;
      }
    }

    // simpan key variant-spesifik
    if (variant) {
      _map.set(`${cat}:${variant}:${baseNorm}`, url);
      _map.set(`${cat}_${variant}_${baseNorm}`, url);
    }

    // simpan key umum (tanpa variant) sebagai fallback
    if (!_map.has(`${cat}:${baseNorm}`)) _map.set(`${cat}:${baseNorm}`, url);
    if (!_map.has(`${cat}_${baseNorm}`)) _map.set(`${cat}_${baseNorm}`, url);

    // key longgar (base saja)
    if (!_map.has(baseNorm)) _map.set(baseNorm, url);
  }
}

function resolveBy(catFolder, variant, keys = []) {
  buildIndexOnce();

  const cat = slugify(catFolder);
  const v = variant ? slugify(variant) : null;

  for (const rawKey of keys) {
    const k = slugify(rawKey);
    if (!k) continue;

    if (v) {
      const hit = _map.get(`${cat}:${v}:${k}`) || _map.get(`${cat}_${v}_${k}`);
      if (hit) return hit;
    }

    const hit2 = _map.get(`${cat}:${k}`) || _map.get(`${cat}_${k}`) || _map.get(k);
    if (hit2) return hit2;
  }

  return null;
}

/**
 * Resolve gambar 1 file = 1 provinsi:
 * file utama: <namaProvinsi>.png (atau jpg/webp) di folder kategori + variant
 *
 * - SIMPLE => gunakan "asli"
 * - MEDIUM/COMPLEX => prefer "chibi", fallback "asli"
 *
 * ✅ Update penting:
 * - Tetap coba dari src/assets/images (via glob index)
 * - Kalau tidak ketemu, fallback ke public/images/...
 * - Prioritas pakai "province" dulu karena file public kamu namanya provinsi penuh (dash)
 */
export function resolveImageForFieldKey({ fieldKey, variant, id, province }) {
  const folder = FIELDKEY_TO_FOLDER[String(fieldKey || "")] || String(fieldKey || "");

  // keys untuk index src/assets (slugify underscore)
  const keysIndex = [province, id].filter(Boolean); // ✅ province dulu

  // 1) coba index src/assets/images dulu
  const preferred = variant ? resolveBy(folder, variant, keysIndex) : null;
  if (preferred) return preferred;

  // fallback ke asli kalau variant chibi tidak ada
  if (variant && slugify(variant) === "chibi") {
    const fb = resolveBy(folder, "asli", keysIndex);
    if (fb) return fb;
  }

  // last fallback: tanpa variant
  const any = resolveBy(folder, null, keysIndex);
  if (any) return any;

  // 2) ✅ fallback ke public/images (sesuai struktur file kamu)
  // public pakai dash di filename: nusa-tenggara-barat.png
  const v = String(variant || "").toLowerCase() === "chibi" ? "chibi" : "asli";

  const provDash = dashify(province);
  if (provDash) return `/images/${folder}/${v}/${provDash}.png`;

  const idDash = dashify(id);
  if (idDash) return `/images/${folder}/${v}/${idDash}.png`;

  return null;
}
