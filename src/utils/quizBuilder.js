// src/utils/quizBuilder.js
import { getCategoryById, CATEGORIES } from "./routes.js";
import { normalizeItem, getCategoryValue } from "./dataAdapter.js";

// ======================
// Helpers
// ======================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uniqueBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (k == null) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
function safeIsland(item) {
  return item?.pulau || item?.island || item?.islandName || item?.Pulau || null;
}
function safeProvince(item) {
  return item?.province || item?.provinsi || item?.Provinsi || null;
}
function safeArray(x) {
  return Array.isArray(x) ? x : [];
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function slugify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function capFirst(s) {
  const t = String(s || "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// ======================
// Placeholder image (no file needed)
// ======================
function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function makePlaceholderDataUri(labelTop, labelBottom) {
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

// ======================
// Image resolver (Vite: import.meta.glob)
// Struktur final:
// src/assets/images/<kategori>/<asli|chibi>/<nama-provinsi>.png (opsional)
// + fallback public/images/<kategori>/<asli|chibi>/<nama-provinsi>.png (punya kamu)
// ======================

// set true kalau mau debug di console
const DEBUG_IMAGES = true;

let _imageIndexBuilt = false;
let _imagesByKey = new Map(); // key -> url

const FIELDKEY_TO_FOLDER = {
  iconicAnimal: "hewan-ikonik",
  traditionalHouse: "rumah-adat",
  traditionalClothes: "pakaian-adat",
  traditionalDance: "tarian-daerah",
  traditionalInstrument: "alat-musik",
  traditionalWeapon: "senjata-daerah",
  traditionalFood: "makanan-khas",
};

// ✅ alias fieldKey lama (Indonesia) -> fieldKey canonical
const FIELDKEY_ALIAS = {
  hewanIkonik: "iconicAnimal",
  rumahAdat: "traditionalHouse",
  pakaianAdat: "traditionalClothes",
  tarianDaerah: "traditionalDance",
  alatMusik: "traditionalInstrument",
  senjataDaerah: "traditionalWeapon",
  makananKhas: "traditionalFood",
};

function fileKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonFieldKey(fk) {
  const raw = String(fk || "").trim();
  return FIELDKEY_ALIAS[raw] || raw;
}

function buildImageIndexOnce() {
  if (_imageIndexBuilt) return;
  _imageIndexBuilt = true;

  const glob =
    import.meta && typeof import.meta.glob === "function" ? import.meta.glob : null;
  if (!glob) {
    if (DEBUG_IMAGES)
      console.warn("[quizBuilder] import.meta.glob not available (kamu bukan Vite?)");
    return;
  }

  // ✅ gabung 2 pattern biar aman (relative & absolute)
  const modsRel = glob("../assets/images/**/*.{png,jpg,jpeg,webp}", { eager: true });
  const modsAbs = glob("/src/assets/images/**/*.{png,jpg,jpeg,webp}", { eager: true });
  const mods = { ...modsRel, ...modsAbs };

  // ✅ regex: .../images/<folder>/<variant>/<file>.<ext>
  const re = /(?:^|\/)images\/([^/]+)\/([^/]+)\/([^/]+)\.(png|jpe?g|webp)$/i;

  let matched = 0;

  for (const path in mods) {
    const mod = mods[path];
    const url = typeof mod === "string" ? mod : mod?.default || null;
    if (!url || typeof url !== "string") continue;

    const p = String(path).replaceAll("\\", "/");
    const m = p.match(re);
    if (!m) continue;

    const folderRaw = m[1];
    const variantRaw = m[2];
    const baseRaw = m[3];

    const folderNorm = slugify(folderRaw);
    const variantNorm = slugify(variantRaw);
    const baseNorm = slugify(baseRaw);

    if (!folderNorm || !baseNorm) continue;
    if (variantNorm !== "asli" && variantNorm !== "chibi") continue;

    matched += 1;

    _imagesByKey.set(`${folderNorm}:${variantNorm}:${baseNorm}`, url);
    _imagesByKey.set(`${folderNorm}_${variantNorm}_${baseNorm}`, url);

    if (!_imagesByKey.has(`${folderNorm}:${baseNorm}`))
      _imagesByKey.set(`${folderNorm}:${baseNorm}`, url);
    if (!_imagesByKey.has(`${folderNorm}_${baseNorm}`))
      _imagesByKey.set(`${folderNorm}_${baseNorm}`, url);

    if (!_imagesByKey.has(baseNorm)) _imagesByKey.set(baseNorm, url);
  }

  if (DEBUG_IMAGES) {
    console.log("[quizBuilder] glob total keys:", Object.keys(mods).length);
    console.log("[quizBuilder] matched images:", matched);
    console.log("[quizBuilder] image index size:", _imagesByKey.size);
  }
}

function resolveRealImage({ fieldKey, id, province, variant, item }) {
  buildImageIndexOnce();

  const fkRaw = String(fieldKey || "");
  const fk = canonFieldKey(fkRaw);

  const direct =
    item?.images?.[fk] || item?.images?.[fkRaw] || item?.image || item?.img || null;

  if (typeof direct === "string" && direct) {
    if (!direct.startsWith("data:image/")) return direct;
  }

  const folder = FIELDKEY_TO_FOLDER[fk] || FIELDKEY_TO_FOLDER[fkRaw] || fk;
  const folderSlug = slugify(folder);

  const idSlug = slugify(id || "");
  const provSlug = slugify(province || "");

  // ✅ PRIORITAS province dulu (karena file public kamu pakai nama provinsi penuh)
  const primaryKeys = [provSlug, idSlug].filter(Boolean);

  const findWithVariant = (v) => {
    const vv = slugify(v || "");
    for (const k of primaryKeys) {
      const hit =
        _imagesByKey.get(`${folderSlug}:${vv}:${k}`) ||
        _imagesByKey.get(`${folderSlug}_${vv}_${k}`);
      if (hit) return hit;
    }
    return null;
  };

  if (variant === "chibi") {
    const ch = findWithVariant("chibi");
    if (ch) return ch;
    const as = findWithVariant("asli");
    if (as) return as;
  }

  if (variant === "asli") {
    const as = findWithVariant("asli");
    if (as) return as;
  }

  const asAny = findWithVariant("asli");
  if (asAny) return asAny;
  const chAny = findWithVariant("chibi");
  if (chAny) return chAny;

  for (const k of primaryKeys) {
    const hit =
      _imagesByKey.get(`${folderSlug}:${k}`) ||
      _imagesByKey.get(`${folderSlug}_${k}`) ||
      _imagesByKey.get(k);
    if (hit) return hit;
  }

  if (DEBUG_IMAGES) {
    console.warn("[quizBuilder] real image not found", {
      fieldKey,
      folderSlug,
      idSlug,
      provSlug,
      variant,
    });
  }

  return null;
}

// ⚠️ fungsi lama masih dipertahankan (dipakai juga oleh UI public/images)
// ✅ FIX: prioritas province dulu, baru id (biar cocok dengan public/images kamu)
function resolveMedia({ fieldKey, id, province, variant }) {
  const fk = String(fieldKey || "");
  const folder = FIELDKEY_TO_FOLDER[fk] || fk;

  const v = String(variant || "").toLowerCase() === "chibi" ? "chibi" : "asli";

  const keyProvince = fileKey(province);
  const keyId = fileKey(id);

  // ✅ src utama: province (kalau ada), baru id
  const keyMain = keyProvince || keyId;
  if (!keyMain) return { src: "", fallbackSrc: "" };

  const src = `/images/${folder}/${v}/${keyMain}.png`;

  // ✅ fallback:
  // - kalau chibi: coba asli (key sama)
  // - kalau bukan chibi & punya 2 key: coba key satunya
  let fallbackSrc = "";
  if (v === "chibi") {
    fallbackSrc = `/images/${folder}/asli/${keyMain}.png`;
  } else if (keyProvince && keyId && keyProvince !== keyId) {
    const other = keyMain === keyProvince ? keyId : keyProvince;
    fallbackSrc = `/images/${folder}/${v}/${other}.png`;
  }

  if (DEBUG_IMAGES) {
    console.log("[media]", {
      fk,
      folder,
      province,
      id,
      keyProvince,
      keyId,
      variant: v,
      src,
      fallbackSrc,
    });
  }

  return { src, fallbackSrc };
}

// ✅ resolver: pakai real image index bila ada,
// kalau tidak ada -> pakai public path -> fallback placeholder
function resolveBestMedia({ item, category, idKey, province, variant }) {
  const fieldKey = category?.fieldKey || "";
  const fk = canonFieldKey(fieldKey);

  const real = resolveRealImage({
    fieldKey: fk,
    id: idKey,
    province,
    variant,
    item,
  });

  const pub = resolveMedia({
    fieldKey: fk,
    id: idKey,
    province,
    variant,
  });

  const placeholder = makePlaceholderDataUri(category?.title || "Belajar Nusantara", province);

  // src: prefer real, else public
  const src = real || pub?.src || placeholder;

  // fallback: chibi -> real(asli) / pub(asli) -> placeholder
  let fallbackSrc = placeholder;
  if (String(variant || "").toLowerCase() === "chibi") {
    const realAsli = resolveRealImage({
      fieldKey: fk,
      id: idKey,
      province,
      variant: "asli",
      item,
    });
    fallbackSrc = realAsli || pub?.fallbackSrc || placeholder;
  }

  return { src, fallbackSrc };
}

// ✅ helper buat Learn.jsx (tetap export)
export function resolveCategoryMediaForUi({ item, category, imageVariant }) {
  if (!item || !category) return { src: "", fallbackSrc: "" };
  const province = String(item?.province || item?.provinsi || "").trim();
  const idKey = item?.__id || item?.id || slugify(province);

  return resolveBestMedia({
    item,
    category,
    idKey,
    province,
    variant: imageVariant || "asli",
  });
}

// ======================
// Konfigurasi lama (MODE_PULAU + VARIASI)
// ======================
export const MODE_PULAU = {
  easy: ["Sumatera", "Jawa"],
  normal: ["Kalimantan", "Sulawesi"],
  hard: ["Papua", "Maluku", "Nusa Tenggara", "Bali"],
};

const QUESTION_VARIATIONS = {
  TEKS: "variasi-1",
  GAMBAR_KE_PROVINSI: "variasi-2",
  GAMBAR_KE_GAMBAR: "variasi-3",
};

// ======================
// Question builder
// ======================
/**
 * opts:
 * - categoryId: string (optional)
 * - allowedIslands: string[] (optional)
 * - modeId: "easy" | "normal" | "hard" (optional)
 * - inverseRate: number (0..1) default 0.45
 * - imageRate: number (0..1) default 0.55
 * - optionsCount: number default 3
 * - imageVariant: "asli" | "chibi" | null
 */
export function buildMixedQuizQuestions(rawData, count = 10, opts = {}) {
  const { categoryId } = opts || {};
  const optionsCount = Number(opts?.optionsCount || 3);

  const inverseRate =
    typeof opts?.inverseRate === "number" ? opts.inverseRate : 0.45;
  const imageRate =
    typeof opts?.imageRate === "number" ? opts.imageRate : 0.55;

  const imageVariant = opts?.imageVariant || "asli";

  const modeId = String(opts?.modeId || "").trim();
  const defaultIslands = MODE_PULAU[modeId] || null;

  const allowedIslands =
    Array.isArray(opts?.allowedIslands) && opts.allowedIslands.length
      ? opts.allowedIslands
      : defaultIslands;

  const normalized = (rawData || []).map((raw) => {
    const n = normalizeItem(raw);
    const prov =
      safeProvince(n) ||
      raw?.provinsi ||
      raw?.province ||
      raw?.Provinsi ||
      "";

    // ⚠️ boleh tetap simpan raw.id, tapi resolver gambar sekarang prioritas province
    n.__id = raw?.id || n?.id || slugify(prov);
    n.__province = prov;
    n.id = raw?.id || n.id;
    return n;
  });

  const filteredByIsland =
    Array.isArray(allowedIslands) && allowedIslands.length
      ? normalized.filter((it) => {
          const isl = safeIsland(it);
          if (!isl) return true;
          return allowedIslands.includes(String(isl));
        })
      : normalized;

  const cats = categoryId
    ? [getCategoryById(categoryId)].filter(Boolean)
    : [...CATEGORIES];

  // pool: kombinasi provinsi + kategori + value
  const pool = [];
  for (const item of filteredByIsland) {
    const province = String(safeProvince(item) || item.__province || "").trim();
    if (!province) continue;

    for (const c of cats) {
      const v = getCategoryValue(item, c);
      if (!v) continue;

      pool.push({
        item,
        cat: c,
        province,
        value: String(v),
        idKey: item.__id || slugify(province),
      });
    }
  }

  const uniqPool = uniqueBy(
    pool,
    (p) => `${p.province}__${p.cat?.fieldKey || ""}__${p.value || ""}`
  );

  const allProvinces = uniqueBy(uniqPool.map((p) => p.province), (x) => x).map(
    String
  );

  const valuesByField = new Map();
  const entriesByField = new Map();

  for (const p of uniqPool) {
    const fk = canonFieldKey(p.cat?.fieldKey || "");
    if (!fk) continue;

    if (!valuesByField.has(fk)) valuesByField.set(fk, []);
    valuesByField.get(fk).push(p.value);

    if (!entriesByField.has(fk)) entriesByField.set(fk, []);
    entriesByField.get(fk).push(p);
  }

  for (const [k, arr] of valuesByField.entries()) {
    valuesByField.set(k, uniqueBy(arr, (x) => x));
  }

  function buildOptionsValue(fieldKey, correctValue) {
    const sameFieldVals = safeArray(valuesByField.get(fieldKey));
    const wrongPool = sameFieldVals.filter((x) => x !== correctValue);
    const wrongNeed = Math.max(0, optionsCount - 1);

    let wrong = shuffle(wrongPool).slice(0, wrongNeed);

    if (wrong.length < wrongNeed) {
      const globalVals = uniqueBy(uniqPool.map((p) => p.value), (x) => x).filter(
        (x) => x !== correctValue
      );
      const extra = shuffle(globalVals.filter((x) => !wrong.includes(x))).slice(
        0,
        wrongNeed - wrong.length
      );
      wrong = [...wrong, ...extra];
    }

    while (wrong.length < wrongNeed) wrong.push(`(opsi ${wrong.length + 2})`);
    return shuffle([correctValue, ...wrong]).slice(0, optionsCount);
  }

  function buildOptionsProvince(correctProvince) {
    const wrongNeed = Math.max(0, optionsCount - 1);
    let wrong = shuffle(allProvinces.filter((p) => p !== correctProvince)).slice(
      0,
      wrongNeed
    );
    while (wrong.length < wrongNeed) wrong.push(`(opsi ${wrong.length + 2})`);
    return shuffle([correctProvince, ...wrong]).slice(0, optionsCount);
  }

  const wantCount = Math.max(1, Number(count || 1));
  let picked = shuffle(uniqPool).slice(0, wantCount);
  if (picked.length < wantCount) picked = shuffle(uniqPool).slice(0, wantCount);

  let imgCount = Math.round(wantCount * clamp(imageRate, 0, 1));
  imgCount = clamp(imgCount, 0, picked.length);

  if (wantCount >= 2) {
    imgCount = Math.max(1, imgCount);
    imgCount = Math.min(imgCount, wantCount - 1);
  }

  const pickedKeys = picked.map(
    (p) => `${p.province}__${canonFieldKey(p.cat?.fieldKey || "")}__${p.value}`
  );
  const imgSet = new Set(shuffle(pickedKeys).slice(0, imgCount));

  const questions = picked.map((p, index) => {
    const cat = p.cat;
    const province = p.province;
    const value = p.value;

    const fieldKey = canonFieldKey(cat?.fieldKey || "");
    const catNameLower = String(cat?.title || "").toLowerCase();

    const pickKey = `${province}__${fieldKey}__${value}`;
    const wantsImage = imgSet.has(pickKey);

    let variation = QUESTION_VARIATIONS.TEKS;
    if (wantsImage) {
      variation =
        Math.random() < 0.5
          ? QUESTION_VARIATIONS.GAMBAR_KE_PROVINSI
          : QUESTION_VARIATIONS.GAMBAR_KE_GAMBAR;
    }

    let prompt = "";
    let answer = "";
    let options = [];
    let media = null;
    let optionMediaMap = null;
    let qType = "province_to_value";

    const bestMedia = resolveBestMedia({
      item: p.item,
      category: cat,
      idKey: p.idKey,
      province,
      variant: imageVariant,
    });

    if (variation === QUESTION_VARIATIONS.TEKS) {
      const isInverseText = Math.random() < clamp(inverseRate, 0, 1);

      if (!isInverseText) {
        prompt = `Apa ${catNameLower} dari provinsi ${province}?`;
        answer = value;
        options = buildOptionsValue(fieldKey, answer);
        qType = "province_to_value";
      } else {
        const variants = [
          `${value} merupakan ${catNameLower} dari provinsi?`,
          `${cat?.title || "Kategori"} "${value}" berasal dari provinsi?`,
          `Provinsi manakah yang memiliki ${catNameLower} bernama ${value}?`,
        ];
        prompt = pickOne(variants);
        answer = province;
        options = buildOptionsProvince(answer);
        qType = "value_to_province";
      }
    }

    if (variation === QUESTION_VARIATIONS.GAMBAR_KE_PROVINSI) {
      prompt = `${capFirst(catNameLower)} ini berasal dari provinsi mana?`;
      answer = province;
      options = buildOptionsProvince(answer);
      media = {
        src: bestMedia?.src || makePlaceholderDataUri(cat?.title, province),
        fallbackSrc:
          bestMedia?.fallbackSrc || makePlaceholderDataUri(cat?.title, province),
        alt: `${cat?.title || "Gambar"} ${province}`,
      };
      qType = "img_to_province";
    }

    if (variation === QUESTION_VARIATIONS.GAMBAR_KE_GAMBAR) {
      prompt = `Manakah ${catNameLower} yang berasal dari provinsi ${province}?`;
      answer = value;

      const entries = shuffle(safeArray(entriesByField.get(fieldKey))).filter(
        (x) => x && x.value && x.value !== value
      );

      const distract = [];
      const usedVal = new Set([value]);

      for (const e of entries) {
        const v = e.value;
        if (!v || usedVal.has(v)) continue;

        const m = resolveBestMedia({
          item: e.item,
          category: cat,
          idKey: e.idKey,
          province: e.province,
          variant: imageVariant,
        });

        distract.push({ entry: e, media: m });
        usedVal.add(v);
        if (distract.length === 2) break;
      }

      if (distract.length < 2) {
        prompt = `Apa ${catNameLower} dari provinsi ${province}?`;
        answer = value;
        options = buildOptionsValue(fieldKey, answer);
        qType = "province_to_value";
      } else {
        const all = shuffle([
          { label: value, media: bestMedia, province },
          {
            label: distract[0].entry.value,
            media: distract[0].media,
            province: distract[0].entry.province,
          },
          {
            label: distract[1].entry.value,
            media: distract[1].media,
            province: distract[1].entry.province,
          },
        ]);

        options = all.map((x) => x.label);

        optionMediaMap = {};
        for (const opt of all) {
          optionMediaMap[opt.label] = {
            src: opt.media?.src || makePlaceholderDataUri(cat?.title, opt.province),
            fallbackSrc:
              opt.media?.fallbackSrc || makePlaceholderDataUri(cat?.title, opt.province),
            alt: `${cat?.title || "Gambar"} ${opt.province}`,
          };
        }

        qType = "province_to_img";
      }
    }

    return {
      id: `${slugify(province)}-${cat?.id}-${index}-${Math.random()
        .toString(16)
        .slice(2)}`,
      prompt,
      options,
      answer,
      explanation: `${province} • ${cat?.title || "Kategori"}: ${value}`,
      categoryId: cat?.id || "",
      categoryTitle: cat?.title || "",
      fieldKey,
      media,
      optionMediaMap,
      qType,
      provinceId: p.idKey,
      variation,
    };
  });

  return questions;
}

// ======================
// Mode configs
// ======================
export const MODE_CONFIGS = [
  {
    id: "easy",
    name: "Mode Mudah",
    splashId: "splash-easy",
    titleText: "Ayo Pemanasan!",
    totalQuestions: 11,
    scoreCorrect: 10,
    scoreWrong: -5,
    timePerQuestion: 20,
  },
  {
    id: "normal",
    name: "Mode Normal",
    splashId: "splash-normal",
    titleText: "Saatnya Tantangan!",
    totalQuestions: 15,
    scoreCorrect: 15,
    scoreWrong: -7,
    timePerQuestion: 15,
  },
  {
    id: "hard",
    name: "Mode Sulit",
    splashId: "splash-hard",
    titleText: "Tantangan Terakhir!",
    totalQuestions: 19,
    scoreCorrect: 20,
    scoreWrong: -10,
    timePerQuestion: 10,
  },
];

export function getModeConfig(id) {
  return MODE_CONFIGS.find((m) => m.id === id) || MODE_CONFIGS[0];
}
