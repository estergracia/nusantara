// src/data/nusantaraData.js

function cleanMeta(v, fallback = "Unknown") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function cleanValue(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "null") return "";
  return s;
}

/**
 * === DATA 38 provinsi kamu ===
 * Tempel data lengkapmu di sini (PROVINSI_DATA).
 * Pastikan seluruh provinsi ada.
 */
const PROVINSI_DATA = [
  {
    id: "aceh",
    provinsi: "Aceh",
    ibuKota: "Banda Aceh",
    pulau: "Sumatera",
    hewanIkonik: null,
    pakaianAdat: "Pakaian adat Ulee Balang",
    rumahAdat: "Rumoh Aceh",
    tarianDaerah: "Tari Saman",
    senjataDaerah: "Rencong",
    alatMusik: "Canang",
    makananKhas: "Mie Aceh"
  },
  {
    id: "sumatera-utara",
    provinsi: "Sumatera Utara",
    ibuKota: "Medan",
    pulau: "Sumatera",
    hewanIkonik: "Burung Beo Nias",
    pakaianAdat: "Pakaian adat Ulos Batak",
    rumahAdat: "Rumah Bolon",
    tarianDaerah: "Tari Tor-tor",
    senjataDaerah: "Piso Surit",
    alatMusik: "Gordang Sambilan",
    makananKhas: "Bika Ambon"
  },
  {
    id: "sumatera-selatan",
    provinsi: "Sumatera Selatan",
    ibuKota: "Palembang",
    pulau: "Sumatera",
    hewanIkonik: "Ikan Belida",
    pakaianAdat: "Pakaian adat Aesan Gede",
    rumahAdat: "Rumah Limas",
    tarianDaerah: "Tari Gending Sriwijaya",
    senjataDaerah: "Tombak Trisula",
    alatMusik: "Gendang Melayu",
    makananKhas: "Pempek"
  },
  {
    id: "sumatera-barat",
    provinsi: "Sumatera Barat",
    ibuKota: "Padang",
    pulau: "Sumatera",
    hewanIkonik: "Burung Kuau Raja",
    pakaianAdat: "Pakaian adat Bundo Kanduang",
    rumahAdat: "Rumah Gadang",
    tarianDaerah: "Tari Piring",
    senjataDaerah: "Karih",
    alatMusik: "Saluang",
    makananKhas: "Rendang"
  },
  {
    id: "bengkulu",
    provinsi: "Bengkulu",
    ibuKota: "Bengkulu",
    pulau: "Sumatera",
    hewanIkonik: null,
    pakaianAdat: "Pakaian adat Melayu Bengkulu",
    rumahAdat: "Rumah adat Bubungan Lima",
    tarianDaerah: "Tari Andun",
    senjataDaerah: null,
    alatMusik: "Serunai Bengkulu",
    makananKhas: "Pendap"
  },
  {
    id: "riau",
    provinsi: "Riau",
    ibuKota: "Pekanbaru",
    pulau: "Sumatera",
    hewanIkonik: "Burung Serindit",
    pakaianAdat: "Pakaian adat Teluk Belanga",
    rumahAdat: "Rumah adat Selaso Jatuh Kembar",
    tarianDaerah: "Tari Zapin Melayu",
    senjataDaerah: "Pedang Jenawi",
    alatMusik: "Gambus",
    makananKhas: "Gulai Belacan"
  },
  {
    id: "kepulauan-riau",
    provinsi: "Kepulauan Riau",
    ibuKota: "Tanjung Pinang",
    pulau: "Sumatera",
    hewanIkonik: "Ikan Kakap Merah",
    pakaianAdat: "Pakaian adat Teluk Belanga dan Kebaya Labuh",
    rumahAdat: "Rumah adat Belah Bubung",
    tarianDaerah: "Tari Joget Dangkong",
    senjataDaerah: "Badik Tumbuk Lado",
    alatMusik: "Gendang Panjang",
    makananKhas: "Otak-otak"
  },
  {
    id: "jambi",
    provinsi: "Jambi",
    ibuKota: "Jambi",
    pulau: "Sumatera",
    hewanIkonik: "Harimau Sumatera",
    pakaianAdat: "Pakaian adat Melayu Jambi",
    rumahAdat: "Rumah adat Kejang Lako",
    tarianDaerah: "Tari Sekapur Sirih",
    senjataDaerah: "Keris Siginjai",
    alatMusik: "Serunai Jambi",
    makananKhas: "Gulai Ikan Patin"
  },
  {
    id: "lampung",
    provinsi: "Lampung",
    ibuKota: "Bandar Lampung",
    pulau: "Sumatera",
    hewanIkonik: "Gajah Sumatera",
    pakaianAdat: "Pakaian adat Tulang Bawang",
    rumahAdat: "Rumah adat Nuwo Sesat",
    tarianDaerah: "Tari Sigeh Pengunten",
    senjataDaerah: "Terapang",
    alatMusik: "Bende",
    makananKhas: "Seruit"
  },
  {
    id: "bangka-belitung",
    provinsi: "Bangka Belitung",
    ibuKota: "Pangkal Pinang",
    pulau: "Sumatera",
    hewanIkonik: null,
    pakaianAdat: "Pakaian adat Melayu Belitung",
    rumahAdat: "Rumah Rakit",
    tarianDaerah: "Tari Campak",
    senjataDaerah: "Siwar Panjang",
    alatMusik: "Gendang Melayu",
    makananKhas: "Mie Bangka"
  },
  {
    id: "kalimantan-timur",
    provinsi: "Kalimantan Timur",
    ibuKota: "Samarinda",
    pulau: "Kalimantan",
    hewanIkonik: "Pesut Mahakam",
    pakaianAdat: "Pakaian adat Urang Besesua",
    rumahAdat: "Rumah adat Lamin",
    tarianDaerah: "Tari Hudoq",
    senjataDaerah: "Mandau Kenyah",
    alatMusik: "Sampe",
    makananKhas: "Ayam Cincane"
  },
  {
    id: "kalimantan-barat",
    provinsi: "Kalimantan Barat",
    ibuKota: "Pontianak",
    pulau: "Kalimantan",
    hewanIkonik: "Burung Enggang",
    pakaianAdat: "Pakaian adat King Baba dan King Bibinge",
    rumahAdat: "Rumah Panjang",
    tarianDaerah: "Tari Monong",
    senjataDaerah: "Mandau Iban",
    alatMusik: "Sape Dayak",
    makananKhas: "Bubur Pedas Sambas"
  },
  {
    id: "kalimantan-tengah",
    provinsi: "Kalimantan Tengah",
    ibuKota: "Palangkaraya",
    pulau: "Kalimantan",
    hewanIkonik: "Burung Enggang",
    pakaianAdat: "Pakaian adat Sangkarut",
    rumahAdat: "Rumah adat Betang",
    tarianDaerah: "Tari Manasai",
    senjataDaerah: "Mandau Ngaju",
    alatMusik: "Katambung",
    makananKhas: "Juhu Singkah"
  },
  {
    id: "kalimantan-selatan",
    provinsi: "Kalimantan Selatan",
    ibuKota: "Banjarbaru",
    pulau: "Kalimantan",
    hewanIkonik: "Bekantan",
    pakaianAdat: "Pakaian adat Bagajah Gamuling Baular Lulut",
    rumahAdat: "Rumah adat Bubungan Tinggi",
    tarianDaerah: "Tari Baksa Kembang",
    senjataDaerah: "Bujak Beliung",
    alatMusik: "Panting",
    makananKhas: "Soto Banjar"
  },
  {
    id: "kalimantan-utara",
    provinsi: "Kalimantan Utara",
    ibuKota: "Tanjung Selor",
    pulau: "Kalimantan",
    hewanIkonik: null,
    pakaianAdat: "Pakaian adat Taa dan Sapei Sapaq",
    rumahAdat: "Rumah adat Baloy",
    tarianDaerah: "Tari Jugit",
    senjataDaerah: "Mandau",
    alatMusik: "Sampeq",
    makananKhas: "Kepiting Soka"
  },
  {
    id: "dki-jakarta",
    provinsi: "DKI Jakarta",
    ibuKota: "Jakarta",
    pulau: "Jawa",
    hewanIkonik: "Burung Elang Bondol",
    pakaianAdat: "Pakaian adat Abang None",
    rumahAdat: "Rumah Kebaya",
    tarianDaerah: "Tari Topeng Betawi",
    senjataDaerah: "Golok",
    alatMusik: "Tanjidor",
    makananKhas: "Kerak Telor"
  },
  {
    id: "banten",
    provinsi: "Banten",
    ibuKota: "Serang",
    pulau: "Jawa",
    hewanIkonik: "Badak Jawa",
    pakaianAdat: "Pakaian adat Pangsi dan Kebaya",
    rumahAdat: "Rumah Baduy",
    tarianDaerah: "Tari Rampak Bedug",
    senjataDaerah: "Kujang",
    alatMusik: "Gogdog Lojor",
    makananKhas: "Sate Bandeng"
  },
  {
    id: "jawa-barat",
    provinsi: "Jawa Barat",
    ibuKota: "Bandung",
    pulau: "Jawa",
    hewanIkonik: "Badak Jawa",
    pakaianAdat: "Pakaian adat Jas Beludru dan Kebaya Sunda",
    rumahAdat: "Rumah adat Jolopong",
    tarianDaerah: "Tari Jaipong",
    senjataDaerah: "Kujang",
    alatMusik: "Angklung",
    makananKhas: "Serabi"
  },
  {
    id: "jawa-tengah",
    provinsi: "Jawa Tengah",
    ibuKota: "Semarang",
    pulau: "Jawa",
    hewanIkonik: "Burung Kepodang",
    pakaianAdat: "Pakaian adat Beskap dan Kebaya",
    rumahAdat: "Joglo",
    tarianDaerah: "Tari Gambyong",
    senjataDaerah: "Keris",
    alatMusik: "Gamelan",
    makananKhas: "Lumpia"
  },
  {
    id: "diy-yogyakarta",
    provinsi: "DI Yogyakarta",
    ibuKota: "Yogyakarta",
    pulau: "Jawa",
    hewanIkonik: "Burung Perkutut Jawa",
    pakaianAdat: "Pakaian adat Paes Ageng",
    rumahAdat: "Joglo",
    tarianDaerah: "Tari Serimpi",
    senjataDaerah: "Keris",
    alatMusik: "Gamelan",
    makananKhas: "Gudeg"
  },
  {
    id: "jawa-timur",
    provinsi: "Jawa Timur",
    ibuKota: "Surabaya",
    pulau: "Jawa",
    hewanIkonik: "Ayam Bekisar",
    pakaianAdat: "Pakaian adat Pesaan dan Kebaya Rancongan",
    rumahAdat: "Joglo Sinom",
    tarianDaerah: "Tari Reog Ponorogo",
    senjataDaerah: "Celurit",
    alatMusik: "Bonang",
    makananKhas: "Rujak Cingur"
  },
  {
    id: "bali",
    provinsi: "Bali",
    ibuKota: "Denpasar",
    pulau: "Bali",
    hewanIkonik: "Burung Jalak Bali",
    pakaianAdat: "Pakaian adat Payas Agung",
    rumahAdat: "Rumah adat Bale",
    tarianDaerah: "Tari Legong",
    senjataDaerah: "Keris",
    alatMusik: "Cengceng",
    makananKhas: "Ayam Betutu"
  },
  {
    id: "ntb",
    provinsi: "Nusa Tenggara Barat",
    ibuKota: "Mataram",
    pulau: "Nusa Tenggara",
    hewanIkonik: "Rusa Timor",
    pakaianAdat: "Pakaian adat Pegon",
    rumahAdat: "Rumah adat Bale Lumbung",
    tarianDaerah: "Tari Gendang Beleq",
    senjataDaerah: "Sampari",
    alatMusik: "Gendang Beleq",
    makananKhas: "Ayam Taliwang"
  },
  {
    id: "ntt",
    provinsi: "Nusa Tenggara Timur",
    ibuKota: "Kupang",
    pulau: "Nusa Tenggara",
    hewanIkonik: "Komodo",
    pakaianAdat: "Pakaian adat Amarasi",
    rumahAdat: "Rumah adat Musalaki",
    tarianDaerah: "Tari Caci",
    senjataDaerah: "Sundu",
    alatMusik: "Sasando",
    makananKhas: "Sei Kupang"
  },
  {
    id: "sulawesi-utara",
    provinsi: "Sulawesi Utara",
    ibuKota: "Manado",
    pulau: "Sulawesi",
    hewanIkonik: "Tarsius",
    pakaianAdat: "Pakaian adat Laku Tepu",
    rumahAdat: "Rumah adat Walewangko",
    tarianDaerah: "Tari Kabasaran",
    senjataDaerah: "Keris",
    alatMusik: "Kolintang",
    makananKhas: "Tinutuan"
  },
  {
    id: "sulawesi-barat",
    provinsi: "Sulawesi Barat",
    ibuKota: "Mamuju",
    pulau: "Sulawesi",
    hewanIkonik: null,
    pakaianAdat: "Pakaian Adat Pokko dan Pattuqduq",
    rumahAdat: "Rumah adat Boyang",
    tarianDaerah: "Tari Pattuqduq Towaine",
    senjataDaerah: "Tombak",
    alatMusik: "Kecapi Mandar",
    makananKhas: "Bolu Paranggi"
  },
  {
    id: "sulawesi-tengah",
    provinsi: "Sulawesi Tengah",
    ibuKota: "Palu",
    pulau: "Sulawesi",
    hewanIkonik: "Burung Maleo",
    pakaianAdat: "Pakaian adat Nggembe",
    rumahAdat: "Rumah adat Souraja",
    tarianDaerah: "Tari Dero",
    senjataDaerah: "Pasatimpo",
    alatMusik: "Lalove",
    makananKhas: "Ikan Jantung Pisang"
  },
  {
    id: "gorontalo",
    provinsi: "Gorontalo",
    ibuKota: "Gorontalo",
    pulau: "Sulawesi",
    hewanIkonik: "Burung Maleo",
    pakaianAdat: "Pakaian adat Biliu dan Paluwala",
    rumahAdat: "Rumah adat Dulohupa",
    tarianDaerah: "Tari Saronde",
    senjataDaerah: "Badik",
    alatMusik: "Ganda",
    makananKhas: "Binte Biluhuta"
  },
  {
    id: "sulawesi-tenggara",
    provinsi: "Sulawesi Tenggara",
    ibuKota: "Kendari",
    pulau: "Sulawesi",
    hewanIkonik: "Anoa",
    pakaianAdat: "Pakaian adat Babu Nggawi",
    rumahAdat: "Rumah adat Malige",
    tarianDaerah: "Tari Lulo",
    senjataDaerah: "Keris",
    alatMusik: "Lado-lado",
    makananKhas: "Lapa-lapa"
  },
  {
    id: "sulawesi-selatan",
    provinsi: "Sulawesi Selatan",
    ibuKota: "Makassar",
    pulau: "Sulawesi",
    hewanIkonik: "Anoa",
    pakaianAdat: "Pakaian adat Baju Bodo",
    rumahAdat: "Rumah adat Tongkonan",
    tarianDaerah: "Tari Pakarena",
    senjataDaerah: "Badik Lompo Battang",
    alatMusik: "Kesokeso",
    makananKhas: "Sup Konro"
  },
  {
    id: "maluku-utara",
    provinsi: "Maluku Utara",
    ibuKota: "Sofifi",
    pulau: "Maluku",
    hewanIkonik: "Burung Bidadari Halmahera",
    pakaianAdat: "Pakaian adat Manteren Lamo",
    rumahAdat: "Rumah adat Sasadu",
    tarianDaerah: "Tari Cakalele",
    senjataDaerah: "Parang Salawaku",
    alatMusik: "Fu",
    makananKhas: "Gohu Ikan"
  },
  {
    id: "maluku",
    provinsi: "Maluku",
    ibuKota: "Ambon",
    pulau: "Maluku",
    hewanIkonik: "Burung Nuri Raja Ambon",
    pakaianAdat: "Pakaian adat Cele",
    rumahAdat: "Rumah adat Baileo",
    tarianDaerah: "Tari Lenso",
    senjataDaerah: "Parang Salawaku",
    alatMusik: "Tifa Maluku",
    makananKhas: "Ikan Asar"
  },
  {
    id: "papua-barat",
    provinsi: "Papua Barat",
    ibuKota: "Manokwari",
    pulau: "Papua",
    hewanIkonik: "Burung Kasuari",
    pakaianAdat: "Pakaian adat Arfak",
    rumahAdat: "Rumah adat Kaki Seribu",
    tarianDaerah: "Tari Yosim Pancar",
    senjataDaerah: "Busur Panah",
    alatMusik: "Tifa Papua Barat",
    makananKhas: "Ikan Bakar Manokwari"
  },
  {
    id: "papua",
    provinsi: "Papua",
    ibuKota: "Jayapura",
    pulau: "Papua",
    hewanIkonik: "Burung Cendrawasih",
    pakaianAdat: "Pakaian adat Asmat",
    rumahAdat: "Rumah adat Honai",
    tarianDaerah: "Tari Perang",
    senjataDaerah: "Belati Tulang Kasuari",
    alatMusik: "Tifa Papua",
    makananKhas: "Papeda"
  },
  {
    id: "papua-selatan",
    provinsi: "Papua Selatan",
    ibuKota: "Kabupaten Merauke",
    pulau: "Papua",
    hewanIkonik: "Kangguru Pohon",
    pakaianAdat: "Pakaian adat Ewer",
    rumahAdat: "Rumah adat Jeuw",
    tarianDaerah: "Tari Tobe",
    senjataDaerah: "Pisuwe",
    alatMusik: null,
    makananKhas: "Sagu Sep"
  },
  {
    id: "papua-tengah",
    provinsi: "Papua Tengah",
    ibuKota: "Kabupaten Nabire",
    pulau: "Papua",
    hewanIkonik: "Anjing Hutan Papua",
    pakaianAdat: "Pakaian adat Koteka dan Rok Rumbai",
    rumahAdat: "Rumah adat Honai",
    tarianDaerah: "Tari Musyoh",
    senjataDaerah: "Pisau Belati",
    alatMusik: null,
    makananKhas: "Bagea"
  },
  {
    id: "papua-pegunungan",
    provinsi: "Papua Pegunungan",
    ibuKota: "Kabupaten Jayawijaya",
    pulau: "Papua",
    hewanIkonik: "Burung Puyuh Salju",
    pakaianAdat: "Pakaian adat Koteka",
    rumahAdat: "Rumah adat Honai",
    tarianDaerah: "Tari Suanggi",
    senjataDaerah: "Parang Papua",
    alatMusik: null,
    makananKhas: "Kue Lontar"
  },
  {
    id: "papua-barat-daya",
    provinsi: "Papua Barat Daya",
    ibuKota: "Sorong",
    pulau: "Papua",
    hewanIkonik: "Burung Cendrawasih",
    pakaianAdat: "Pakaian adat Rumbai Cendrawasih",
    rumahAdat: "Rumah adat Kaki Seribu",
    tarianDaerah: "Tari Yosim Pancar",
    senjataDaerah: "Kapak Papua",
    alatMusik: "Tifa Papua Barat Daya",
    makananKhas: "Udang Selingkuh"
  }
];

const nusantaraData = PROVINSI_DATA.map((p) => {
  const id = cleanMeta(p.id, "").trim();          // ✅ WAJIB ADA
  const prov = cleanMeta(p.provinsi, "Unknown");
  const island = cleanMeta(p.pulau, "Unknown");
  const capital = cleanMeta(p.ibuKota, "Unknown");

  return {
    id, // ✅ kunci untuk match filename: aceh.png, diy-yogyakarta.png, dll

    island,
    province: prov,
    capital,

    iconicAnimal: cleanValue(p.hewanIkonik),
    traditionalHouse: cleanValue(p.rumahAdat),
    traditionalClothes: cleanValue(p.pakaianAdat),
    traditionalDance: cleanValue(p.tarianDaerah),
    traditionalInstrument: cleanValue(p.alatMusik),
    traditionalWeapon: cleanValue(p.senjataDaerah),
    traditionalFood: cleanValue(p.makananKhas),

    // ✅ biarkan kosong, resolver ambil dari assets/images lewat glob
    images: {},
  };
});

export default nusantaraData;