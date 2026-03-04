import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";
import { getCategoryById } from "../utils/routes.js";
import nusantaraData from "../data/nusantaraData.js";
import { getCategoryValue, normalizeItem } from "../utils/dataAdapter.js";

import { resolveCategoryMediaForUi } from "../utils/quizBuilder.js";
import { playSfx, playBgm, setAudioMode, stopComplexBgm } from "../utils/sfx.js";
import Telemetry from "../utils/telemetry.js";
import { useAuth } from "../contexts/AuthContext.jsx";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function hashStr(s) {
  const str = String(s || "");
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function buildFunFact({ item, category, value }) {
  if (!item || !category || !value) return "";

  const prov = item.province || item.provinsi || "-";

  const getOther = (fieldKey) => {
    const otherVal = item?.[fieldKey] || "";
    if (!otherVal) return "";
    if (String(otherVal).trim().toLowerCase() === String(value).trim().toLowerCase()) return "";
    return String(otherVal);
  };

  const rumah = getOther("traditionalHouse");
  const pakaian = getOther("traditionalClothes");
  const tarian = getOther("traditionalDance");
  const alat = getOther("traditionalInstrument");
  const senjata = getOther("traditionalWeapon");
  const makanan = getOther("traditionalFood");

  const fk = category.fieldKey;

  const bankByCategory = {
    iconicAnimal: [
      `Coba tebak: kalau ${prov} punya “maskot”, jawabannya “${value}”. Simpan dulu di kepala!`,
      `Bayangkan kamu bikin poster ${prov}. Hewan yang paling pas ditaruh di tengah? “${value}”.`,
      `Mini-challenge: sebut cepat 2x → ${prov}, ${value}. Ulang 3 detik, hafal langsung.`,
    ],
    traditionalHouse: [
      `Rumah adat ${prov} bernama “${value}”. Coba bayangkan pintunya… unik nggak ya?`,
      `“${value}” = rumah adat ${prov}. Anggap ini “password” budaya untuk provinsi itu.`,
      rumah ? `Hint asosiasi: bandingkan dengan rumah adat lain, tapi kuncinya tetap “${value}”.` : "",
    ],
    traditionalClothes: [
      `Pakaian adat ${prov} itu “${value}”. Kebayang dipakai di acara apa?`,
      `“${value}” = pakaian adat ${prov}. Tips: bayangkan warna/aksennya versi kamu sendiri.`,
      pakaian ? `Kalau ada pilihan mirip-mirip, cari yang “paling khas”: “${value}”.` : "",
    ],
    traditionalDance: [
      `Tarian ${prov}: “${value}”. Coba dengar namanya—ritmenya terasa nggak?`,
      `“${value}” adalah tarian daerah ${prov}. Bayangkan gerakan pembukaannya.`,
      tarian ? `Kunci memori: “tari kebanggaan ${prov} = ${value}”.` : "",
    ],
    traditionalInstrument: [
      `Alat musik ${prov} namanya “${value}”. Penasaran bunyinya kayak apa?`,
      `“${value}” = alat musik tradisional ${prov}. Simpan sebagai “soundtrack” daerah itu.`,
      alat ? `Bayangkan bunyi “${value}” jadi intro sebelum kamu jawab soal.` : "",
    ],
    traditionalWeapon: [
      `Senjata tradisional ${prov} adalah “${value}”. (konteks: warisan budaya ya)`,
      `“${value}” = senjata tradisional dari ${prov}. Simpan namanya dulu.`,
      senjata ? `Anggap ini “item langka”: ${prov} → “${value}”.` : "",
    ],
    traditionalFood: [
      `Makanan khas ${prov}: “${value}”. Kamu kebayang rasanya?`,
      `“${value}” = kuliner khas ${prov}. Simpan sebagai “menu wajib” kalau suatu hari ke sana.`,
      makanan ? `Bayangkan papan menu: ${prov} — item paling atas “${value}”.` : "",
    ],
  };

  const templates =
    bankByCategory[fk] || [
      `“${value}” adalah ${category.title.toLowerCase()} dari provinsi ${prov}.`,
      `Tips cepat: ucapkan “${prov} → ${value}” sekali, lalu jawab tanpa ragu.`,
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
  const { currentUser } = useAuth();

  const uiMode = is.simple ? "simple" : is.medium ? "medium" : "complex";
  const category = getCategoryById(categoryId);

  const [hasPicked, setHasPicked] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);

  const detailAnchorRef = useRef(null);

  // ✅ Sinkronkan mode audio dengan UI mode (tanpa ubah bank soal/scoring)
  useEffect(() => {
    setAudioMode(uiMode);
  }, [uiMode]);

  useEffect(() => {
    Telemetry.trackNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  useEffect(() => {
    setHasPicked(false);
    setSelectedIndex(0);
    setPopupOpen(false);

    // ✅ Anti-bocor: kalau keluar dari complex, pastikan BGM complex mati.
    // (Kalau tetap di complex: jangan dimatikan)
    if (!is.complex) stopComplexBgm();
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

  // ✅ Revisi #1: funFact tidak boleh muncul di mode complex (no elaborated feedback)
  const funFact = useMemo(() => {
    if (!selected || !category) return "";
    if (is.simple) return "";
    if (is.complex) return "";
    return buildFunFact({ item: selected, category, value: selectedValue });
  }, [selected, category, selectedValue, is.simple, is.complex]);

  // ✅ Complex: BGM nyala terus selama mode complex (tidak tergantung popup)
  useEffect(() => {
    if (!is.complex) return;
    playBgm();
  }, [is.complex]);

  // Helper close popup (konsisten Escape / backdrop / button)
  const closePopup = useCallback(() => {
    setPopupOpen(false);

    // ✅ BGM TIDAK DIMATIKAN
    if (is.complex) {
      playSfx("tap");
      window.setTimeout(() => playSfx("tap"), 60);
    }
  }, [is.complex]);

  // Escape close
  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePopup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popupOpen, closePopup]);

  if (!category) {
    return (
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="ui-title text-xl font-extrabold">Kategori tidak ditemukan</div>
        <button
          type="button"
          className="ui-btn ui-btn--primary mt-4"
          onClick={() => {
            Telemetry.trackClick();
            Telemetry.trackNavigation();
            navigate({ pathname: "/categories", search: location.search });
          }}
        >
          Kembali ke Categories
        </button>
      </section>
    );
  }

  const scrollToDetail = () => {
    requestAnimationFrame(() => {
      detailAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const onPickItem = (idx) => {
    Telemetry.trackClick();
    setSelectedIndex(idx);

    if (is.medium) {
      setHasPicked(true);
      scrollToDetail();
      return;
    }

    if (is.complex) {
      // ✅ Revisi #5: audio complex lebih ramai
      playSfx("tap");
      window.setTimeout(() => playSfx("tap"), 60);

      // ✅ BGM complex tidak perlu start/stop per popup,
      // tapi aman kalau dipanggil (sfx.js sudah anti-dobel)
      playBgm();

      setPopupOpen(true);
    }
  };

  // Medium: grid dihilangkan -> detail selalu tampil (single viewer)
  const showMediumViewer = is.medium && selected;
  // Simple & Complex: grid tetap seperti lama
  const showGrid = !is.medium;

  const popupPrev = () => {
    if (selectedIndex === 0) return;
    Telemetry.trackClick();
    setSelectedIndex((s) => s - 1);

    playSfx("tap");
    if (is.complex) window.setTimeout(() => playSfx("tap"), 40);
  };

  const popupNext = () => {
    if (selectedIndex >= items.length - 1) return;
    Telemetry.trackClick();
    setSelectedIndex((s) => s + 1);

    playSfx("tap");
    if (is.complex) window.setTimeout(() => playSfx("tap"), 40);
  };

  const showPopup = is.complex && popupOpen && selected;

  return (
    <div className="ui-page ui-page--learn space-y-4">
      <section className="ui-card ui-card--pattern ui-card--pad">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="ui-title text-2xl font-extrabold">{category.title}</div>
          </div>
        </div>

        <div ref={detailAnchorRef} className="bn-detailAnchor" />

        {showMediumViewer ? (
          <div className="mt-4 bn-detailCompact bn-detailCompact--learnOne">
            <div className="bn-detailRow bn-detailRow--learnOne">
              <div className="bn-detailImg">
                {detailMedia?.src ? (
                  <div className="bn-square bn-square--cover bn-detailImgBox">
                    <img
                      src={detailMedia.src}
                      alt={selectedValue}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="bn-detailBody bn-detailBody--learnOne">
                <div className="bn-typoTitle">
                  <span className="bn-typoTitle__accent">{selectedValue || "-"}</span>
                </div>

                <div className="bn-typoMeta">
                  <span className="bn-typoMeta__label">Provinsi:</span>{" "}
                  <span className="bn-typoMeta__value">{selected?.province || "-"}</span>
                  {selected?.capital ? (
                    <>
                      <span className="bn-typoMeta__dot">•</span>
                      <span className="bn-typoMeta__label">Ibu kota:</span>{" "}
                      <span className="bn-typoMeta__value">{selected.capital}</span>
                    </>
                  ) : null}
                </div>

                {funFact ? (
                  <div className="bn-funFactCard ui-card ui-card--pad">
                    <div className="bn-funFactText ui-muted">{funFact}</div>
                  </div>
                ) : null}

                <div className="bn-detailFooter bn-detailFooter--learnOne">
                  <button
                    type="button"
                    className="ui-btn"
                    disabled={selectedIndex === 0}
                    onClick={() => {
                      if (selectedIndex === 0) return;
                      Telemetry.trackClick();
                      setSelectedIndex((s) => s - 1);
                      scrollToDetail();
                    }}
                  >
                    Prev
                  </button>

                  <div className="bn-detailCounter ui-muted">
                    {selectedIndex + 1}/{items.length}
                  </div>

                  <button
                    type="button"
                    className="ui-btn ui-btn--primary"
                    disabled={selectedIndex >= items.length - 1}
                    onClick={() => {
                      if (selectedIndex >= items.length - 1) return;
                      Telemetry.trackClick();
                      setSelectedIndex((s) => s + 1);
                      scrollToDetail();
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {showGrid ? (
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
                    <div className="ui-media-card__img">
                      {media?.src ? (
                        <div className="bn-square bn-square--contain">
                          <img src={media.src} alt={v} onError={(e) => (e.currentTarget.style.display = "none")} />
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
      ) : null}

      {showPopup ? (
        <div
          className="bn-modal-backdrop"
          data-open="1"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              Telemetry.trackClick();
              closePopup();
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
                  Telemetry.trackClick();
                  closePopup();
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
                  
                  <div className="bn-detailPanel">
                    <div className="bn-detailRow">
                      <span className="bn-detailKey">Provinsi:</span>
                      <span className="bn-detailVal">{selected?.province || "-"}</span>
                    </div>

                    <div className="bn-detailRow">
                      <span className="bn-detailKey">Ibu kota:</span>
                      <span className="bn-detailVal">{selected?.capital || "-"}</span>
                    </div>

                    <div className="bn-detailRow">
                      <span className="bn-detailKey">Pulau:</span>
                      <span className="bn-detailVal">{selected?.island || "-"}</span>
                    </div>
                  </div>
                </div>
                
              ) : null}

              {/* ✅ funFact otomatis kosong pada mode complex */}
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
