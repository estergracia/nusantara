// src/pages/Learn.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { getCategoryById } from "../utils/routes.js";
import nusantaraData from "../data/nusantaraData.js";
import { getCategoryValue, normalizeItem } from "../utils/dataAdapter.js";

// ✅ resolver dari quizBuilder (glob src/assets/images)
import { resolveCategoryMediaForUi } from "../utils/quizBuilder.js";

// ✅ SFX (hanya kompleks)
import { playSfx } from "../utils/sfx.js";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function hashStr(s) {
  const str = String(s || "");
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Fun fact "kategori-aware" (tanpa input manual per item)
 */
function buildFunFact({ item, category, value }) {
  if (!item || !category || !value) return "";

  const prov = item.province || item.provinsi || "-";

  const getOther = (fieldKey) => {
    const otherVal = item?.[fieldKey] || "";
    if (!otherVal) return "";
    if (String(otherVal).trim().toLowerCase() === String(value).trim().toLowerCase())
      return "";
    return String(otherVal);
  };

  // dipakai hanya untuk variasi kata, bukan “fact” tambahan
  const iconicAnimal = getOther("iconicAnimal");
  const rumah = getOther("traditionalHouse");
  const pakaian = getOther("traditionalClothes");
  const tarian = getOther("traditionalDance");
  const alat = getOther("traditionalInstrument");
  const senjata = getOther("traditionalWeapon");
  const makanan = getOther("traditionalFood");

  const fk = category.fieldKey;

  const bankByCategory = {
    iconicAnimal: [
      `Satu kata kunci buat ${prov}: “${value}”. Kenapa bisa jadi ikon? (Nanti kamu bakal nemu polanya 😉)`,
      `Coba tebak: kalau ${prov} punya “maskot”, jawabannya “${value}”. Simpan dulu di kepala!`,
      `Bayangkan kamu bikin poster ${prov}. Hewan yang paling pas ditaruh di tengah? “${value}”.`,
      `Mini-challenge: sebut cepat 2x → ${prov}, ${value}. Ulang 3 detik, hafal langsung.`,
      `Kalau ada soal hewan ikonik, kamu cari pola: provinsi → ikon → “${value}”.`,
    ],
    traditionalHouse: [
      `Rumah adat ${prov} bernama “${value}”. Coba bayangkan pintunya… unik nggak ya?`,
      `“${value}” = rumah adat ${prov}. Anggap ini “password” budaya untuk provinsi itu.`,
      `Kuis kilat: rumah adat ${prov}? … “${value}”. Jawab tanpa mikir dulu 😄`,
      rumah ? `Hint asosiasi: rumah adat lain yang pernah kamu lihat? Bandingkan dengan “${value}”.` : "",
      `Kalau kamu lihat kata “${value}”, auto-ingat: itu rumah adat ${prov}.`,
    ],
    traditionalClothes: [
      `Pakaian adat ${prov} itu “${value}”. Kamu kebayang dipakai di acara apa? (cukup bayangin aja 😉)`,
      `“${value}” = pakaian adat ${prov}. Tips: bayangkan warna/aksennya versi kamu sendiri.`,
      `Mode penasaran: kalau kamu cosplay budaya ${prov}, outfit-nya namanya “${value}”.`,
      pakaian ? `Kalau ada pilihan mirip-mirip, cari yang “paling khas”: “${value}”.` : "",
      `Hafalan cepat: ${prov} → pakaian → “${value}”. Simpel, tapi nempel.`,
    ],
    traditionalDance: [
      `Tarian ${prov}: “${value}”. Coba dengar namanya—ritmenya terasa nggak?`,
      `“${value}” adalah tarian daerah ${prov}. Bayangkan gerakan pembukaannya versi kamu.`,
      `Tantangan 5 detik: ${prov} → tari → “${value}”. Bisa jawab cepat?`,
      tarian ? `Kunci memori: “tari kebanggaan ${prov} = ${value}”.` : "",
      `Kalau kamu denger “${value}”, langsung kunci: itu tarian dari ${prov}.`,
    ],
    traditionalInstrument: [
      `Alat musik ${prov} namanya “${value}”. Penasaran bunyinya kayak apa? (bayangin dulu 😄)`,
      `“${value}” = alat musik tradisional ${prov}. Simpan sebagai “soundtrack” daerah itu.`,
      `Mini-quiz: musik khas ${prov}? … “${value}”. Mantap kalau bisa jawab instan.`,
      alat ? `Bayangkan bunyi “${value}” jadi intro sebelum kamu jawab soal.` : "",
      `Kalau ditanya alat musik daerah, ingat pola: provinsi → musik → “${value}”.`,
    ],
    traditionalWeapon: [
      `Senjata tradisional ${prov} adalah “${value}”. Catatan: ini konteksnya warisan budaya ya.`,
      `“${value}” = senjata tradisional dari ${prov}. Penasaran bentuknya? Simpan namanya dulu.`,
      `Kunci hafalan: ${prov} → senjata → “${value}”. Jangan ketukar sama provinsi lain.`,
      senjata ? `Anggap ini “item langka” budaya: ${prov} → “${value}”.` : "",
      `Kalau kamu lihat “${value}”, ingat: itu identitas budaya ${prov}.`,
    ],
    traditionalFood: [
      `Makanan khas ${prov}: “${value}”. Kamu kebayang rasanya? (asam? manis? pedas? terserah bayanganmu 😄)`,
      `“${value}” = kuliner khas ${prov}. Simpan sebagai “menu wajib” kalau suatu hari ke sana.`,
      `Tebak cepat: kalau orang nyebut ${prov}, makanan yang sering dikaitkan: “${value}”.`,
      makanan ? `Bayangkan papan menu: ${prov} — item paling atas “${value}”.` : "",
      `Kalau soal makanan khas muncul, kuncinya: provinsi → kuliner → “${value}”.`,
    ],
  };

  const templates =
    bankByCategory[fk] ||
    [
      `“${value}” adalah ${category.title.toLowerCase()} dari provinsi ${prov}. Simpan dulu—nanti kebuka polanya 😉`,
      `Tips cepat: ucapkan “${prov} → ${value}” sekali, lalu jawab tanpa ragu.`,
      `Kalau kamu bingung, kunci saja: ${category.title.toLowerCase()} ${prov} = “${value}”.`,
      `Mini-challenge: kamu bisa jawab ini dalam 2 detik? ${prov}… ${value}.`,
    ];

  const clean = templates.filter((t) => Boolean(String(t || "").trim()));
  if (!clean.length) return "";

  const idx = hashStr(`${item.id}-${category.id}-${value}`) % clean.length;
  return clean[idx];
}

export default function Learn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categoryId } = useParams();
  const { is } = useUiLevelFirestore();

  const category = getCategoryById(categoryId);

  // ✅ medium: detail card tidak muncul sebelum klik
  const [hasPicked, setHasPicked] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);

  // ✅ anchor untuk scroll ke detail (medium)
  const detailAnchorRef = useRef(null);

  useEffect(() => {
    setHasPicked(false);
    setSelectedIndex(0);
    setPopupOpen(false);
  }, [categoryId, is.simple, is.medium, is.complex]);

  const items = useMemo(() => {
    const norm = (Array.isArray(nusantaraData) ? nusantaraData : []).map(normalizeItem);
    return norm.filter((it) => Boolean(getCategoryValue(it, category)));
  }, [category]);

  useEffect(() => {
    setSelectedIndex((idx) => clamp(idx, 0, Math.max(0, items.length - 1)));
  }, [items.length]);

  const selected = items[selectedIndex] || null;
  const selectedValue = selected ? getCategoryValue(selected, category) : "";

  const gridVariant = is.simple ? "asli" : "chibi";
  const detailVariant = "asli";

  const gridMediaByItem = (it) =>
    resolveCategoryMediaForUi({
      item: it,
      category,
      imageVariant: gridVariant,
    });

  const detailMedia = useMemo(() => {
    if (!selected || !category) return null;
    return resolveCategoryMediaForUi({
      item: selected,
      category,
      imageVariant: detailVariant,
    });
  }, [selected, category]);

  const funFact = useMemo(() => {
    if (!selected || !category) return "";
    if (is.simple) return "";
    return buildFunFact({ item: selected, category, value: selectedValue });
  }, [selected, category, selectedValue, is.simple]);

  // ✅ close popup via ESC
  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPopupOpen(false);
        if (is.complex) playSfx("tap");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupOpen, is.complex]);

  if (!category) {
    return (
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="ui-title text-xl font-extrabold">Kategori tidak ditemukan</div>
        <button
          type="button"
          className="ui-btn ui-btn--primary mt-4"
          onClick={() => navigate({ pathname: "/categories", search: location.search })}
        >
          Kembali ke Categories
        </button>
      </section>
    );
  }

  const scrollToDetail = () => {
    // scroll-margin-top ada di CSS (bn-detailAnchor)
    requestAnimationFrame(() => {
      detailAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const onPickItem = (idx) => {
    setSelectedIndex(idx);

    if (is.medium) {
      setHasPicked(true);
      scrollToDetail();
      return;
    }

    if (is.complex) {
      playSfx("tap");
      playSfx("unlock");
      setPopupOpen(true);
    }
  };

  // (opsional tapi bikin konsisten) kalau udah membuka detail,
  // setiap ganti item di medium akan tetap fokus ke detail
  useEffect(() => {
    if (!is.medium) return;
    if (!hasPicked) return;
    scrollToDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const popupPrev = () => {
    if (selectedIndex === 0) return;
    setSelectedIndex((s) => s - 1);
    playSfx("tap");
  };
  const popupNext = () => {
    if (selectedIndex >= items.length - 1) return;
    setSelectedIndex((s) => s + 1);
    playSfx("tap");
  };

  const showTopDetail = is.medium && hasPicked && selected;
  const showPopup = is.complex && popupOpen && selected;

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="ui-title text-2xl font-extrabold">{category.title}</div>
            <div className="mt-1 text-sm ui-muted">
              {is.medium ? "klik kartu untuk melihat detail." : "klik kartu untuk melihat detail"}
            </div>
          </div>
        </div>

        {/* ✅ anchor target scroll (medium) */}
        <div ref={detailAnchorRef} className="bn-detailAnchor" />

        {/* ✅ MEDIUM: detail card muncul setelah klik + ada tombol X */}
        {showTopDetail ? (
          <div className="mt-4 bn-detailCompact">
            <button
              type="button"
              className="bn-detailClose"
              aria-label="Tutup detail"
              onClick={() => setHasPicked(false)}
              title="Tutup"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="bn-detailRow">
              <div className="bn-detailImg">
                {detailMedia?.src ? (
                  <div className="bn-square bn-square--cover">
                    <img
                      src={detailMedia.src}
                      alt={selectedValue}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="bn-detailBody">
                <div className="ui-title text-lg font-extrabold">{selectedValue || "-"}</div>
                <div className="ui-muted text-sm bn-detailMeta">
                  {selected?.province} {selected?.capital ? `• Ibu kota: ${selected.capital}` : ""}
                </div>

                {funFact ? (
                  <div className="bn-funFact ui-card ui-card--pad" style={{ background: "var(--surface-2)" }}>
                    <div className="text-sm ui-muted">{funFact}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Grid cards */}
      <section
        className={[
          "grid gap-3",
          is.simple ? "sm:grid-cols-3 lg:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-4",
        ].join(" ")}
      >
        {items.map((it, idx) => {
          const v = getCategoryValue(it, category);
          const media = gridMediaByItem(it);

          return (
            <button
              key={`${it.province}-${idx}`}
              type="button"
              className="ui-media-card"
              data-active={idx === selectedIndex ? "1" : "0"}
              onClick={() => onPickItem(idx)}
            >
              {/* SIMPLE: gambar asli no crop */}
              {is.simple ? (
                <>
                  <div className="bn-simpleMedia">
                    {media?.src ? (
                      <img src={media.src} alt={v} onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : null}
                  </div>
                  <div className="bn-simpleBody">
                    <div className="bn-simpleTitle">{v}</div>
                    <div className="bn-simpleMeta">
                      {it.province} • {it.island || "-"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* MEDIUM/COMPLEX: chibi square */}
                  <div className="ui-media-card__img">
                    {media?.src ? (
                      <div className="bn-square bn-square--contain">
                        <img
                          src={media.src}
                          alt={v}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                    ) : (
                      <div className="ui-media-card__ph" />
                    )}
                  </div>

                  <div className="ui-media-card__body">
                    <div className="ui-title text-sm font-extrabold">{v}</div>
                    <div className="text-xs ui-muted">
                      {it.province} • {it.island || "-"}
                    </div>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </section>

      {/* ✅ POPUP: hanya kompleks */}
      {showPopup ? (
        <div
          className="bn-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setPopupOpen(false);
              playSfx("tap");
            }
          }}
        >
          <div className="bn-modal" data-open="1">
            <div className="bn-modal__head">
              <div className="bn-modal__headText">
                <div className="ui-title text-base font-extrabold">{selectedValue || "-"}</div>
                <div className="mt-1 text-xs ui-muted">
                  {selected.province} • {selected.capital ? `Ibu kota: ${selected.capital}` : ""}
                </div>
              </div>

              <button
                type="button"
                className="ui-btn bn-closeBtn"
                onClick={() => {
                  setPopupOpen(false);
                  playSfx("tap");
                }}
              >
                Close
              </button>
            </div>

            <div className="bn-modal__body bn-modal__body--fixed">
              {detailMedia?.src ? (
                <div className="bn-mediaBox">
                  <img
                    src={detailMedia.src}
                    data-fb={detailMedia.fallbackSrc || ""}
                    alt={selectedValue}
                    onError={(e) => {
                      const fb = e.currentTarget.dataset.fb;
                      if (fb && e.currentTarget.src !== fb) {
                        e.currentTarget.src = fb;
                        return;
                      }
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              {funFact ? (
                <div className="bn-funCard ui-card ui-card--pad">
                  <div className="text-sm ui-muted">{funFact}</div>
                </div>
              ) : null}

              <div className="bn-modal__footer">
                <button type="button" className="ui-btn" disabled={selectedIndex === 0} onClick={popupPrev}>
                  Back
                </button>

                <div className="text-xs ui-muted">
                  {selectedIndex + 1}/{items.length}
                </div>

                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  disabled={selectedIndex >= items.length - 1}
                  onClick={popupNext}
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
