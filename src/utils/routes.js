export const CATEGORIES = [
  {
    id: "iconic-animals",
    title: "Hewan Ikonik",
    icon: "🦅",
    fieldKey: "iconicAnimal",
    shortDesc: "Kenali hewan khas yang melekat pada suatu provinsi."
  },
  {
    id: "traditional-houses",
    title: "Rumah Adat",
    icon: "🏠",
    fieldKey: "traditionalHouse",
    shortDesc: "Belajar rumah adat dari berbagai daerah di Indonesia."
  },
  {
    id: "traditional-clothes",
    title: "Pakaian Adat",
    icon: "👘",
    fieldKey: "traditionalClothes",
    shortDesc: "Nama pakaian adat yang sering dipakai pada acara tradisional."
  },
  {
    id: "traditional-dances",
    title: "Tarian Daerah",
    icon: "💃",
    fieldKey: "traditionalDance",
    shortDesc: "Tarian tradisional yang menjadi kebanggaan daerah."
  },
  {
    id: "traditional-instruments",
    title: "Alat Musik Daerah",
    icon: "🎶",
    fieldKey: "traditionalInstrument",
    shortDesc: "Alat musik tradisional yang unik dan beragam."
  },
  {
    id: "traditional-weapons",
    title: "Senjata Daerah",
    icon: "🗡️",
    fieldKey: "traditionalWeapon",
    shortDesc: "Senjata tradisional sebagai warisan budaya."
  },
  {
    id: "traditional-foods",
    title: "Makanan Khas",
    icon: "🍲",
    fieldKey: "traditionalFood",
    shortDesc: "Kuliner khas dari berbagai provinsi di Nusantara."
  }
];

export function getCategoryById(categoryId) {
  return CATEGORIES.find((c) => c.id === categoryId) || null;
}
