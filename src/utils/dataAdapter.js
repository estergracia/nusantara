const KEYMAP = {
  island: ["island", "pulau"],
  province: ["province", "provinsi"],
  capital: ["capital", "ibuKota", "ibukota", "ibu_kota"],

  iconicAnimal: ["iconicAnimal", "hewanIkonik", "hewan_ikonik"],
  traditionalHouse: ["traditionalHouse", "rumahAdat", "rumah_adat"],
  traditionalClothes: ["traditionalClothes", "pakaianAdat", "pakaian_adat"],
  traditionalDance: ["traditionalDance", "tarianDaerah", "tarian_daerah"],
  traditionalInstrument: ["traditionalInstrument", "alatMusik", "alatMusikDaerah", "alat_musik", "alat_musik_daerah"],
  traditionalWeapon: ["traditionalWeapon", "senjataDaerah", "senjata_daerah"],
  traditionalFood: ["traditionalFood", "makananKhas", "makanan_khas"],

  images: ["images", "gambar"]
};

function pick(raw, keys, fallback = null) {
  for (const k of keys) {
    if (raw && Object.prototype.hasOwnProperty.call(raw, k) && raw[k]) return raw[k];
  }
  return fallback;
}

export function normalizeItem(raw) {
  const island = pick(raw, KEYMAP.island, "");
  const province = pick(raw, KEYMAP.province, "");
  const capital = pick(raw, KEYMAP.capital, "");

  const item = {
    island,
    province,
    capital,
    iconicAnimal: pick(raw, KEYMAP.iconicAnimal, ""),
    traditionalHouse: pick(raw, KEYMAP.traditionalHouse, ""),
    traditionalClothes: pick(raw, KEYMAP.traditionalClothes, ""),
    traditionalDance: pick(raw, KEYMAP.traditionalDance, ""),
    traditionalInstrument: pick(raw, KEYMAP.traditionalInstrument, ""),
    traditionalWeapon: pick(raw, KEYMAP.traditionalWeapon, ""),
    traditionalFood: pick(raw, KEYMAP.traditionalFood, ""),
    images: pick(raw, KEYMAP.images, {}) || {}
  };

  return item;
}

export function getCategoryValue(item, category) {
  if (!item || !category) return "";
  const key = category.fieldKey;
  if (!key) return "";
  const v = item[key];
  return typeof v === "string" ? v : v ? String(v) : "";
}
