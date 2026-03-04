import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

const SLIDES = [
  { title: "Belajar", desc: "Baca materi singkat budaya Nusantara.", icon: "📚" },
  { title: "Kuis", desc: "Uji pemahaman lewat pertanyaan cepat.", icon: "🧠" },
  { title: "Badges", desc: "Kumpulkan badge dari progress-mu.", icon: "🏅" },
];

const AUTOPLAY_MS = 2500;

export default function Splash() {
  const navigate = useNavigate();
  const location = useLocation();
  const { is } = useUiLevelFirestore();
  const [step, setStep] = useState(0);

  const goLogin = () =>
    navigate({ pathname: "/login", search: location.search });
  const goRegister = () =>
    navigate({ pathname: "/register", search: location.search });

  const slide = useMemo(() => SLIDES[step] || SLIDES[0], [step]);

  // autoplay hanya untuk mode complex (karena simple & medium return lebih dulu)
  useEffect(() => {
    if (is.simple || is.medium) return;

    const id = setInterval(() => {
      setStep((s) => (s + 1) % SLIDES.length);
    }, AUTOPLAY_MS);

    return () => clearInterval(id);
  }, [is.simple, is.medium]);

  if (is.simple) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <section className="ui-card ui-card--pattern p-6 text-center">
            <div className="ui-title text-3xl font-extrabold mt-2">
              Belajar Nusantara
            </div>
            <button
              type="button"
              onClick={goLogin}
              className="ui-btn ui-btn--primary mt-6 w-full"
            >
              Mulai / Masuk
            </button>
          </section>
        </div>
      </div>
    );
  }

  if (is.medium) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-4">
          <section className="ui-card ui-card--pattern p-7">
            <div className="text-center">
              <div className="ui-title text-3xl font-extrabold mt-2">
                Belajar Nusantara
              </div>
              <div className="mt-2 text-sm ui-muted">
                Belajar budaya Nusantara lewat materi singkat dan kuis cepat.
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={goLogin}
                className="ui-btn ui-btn--primary w-full"
              >
                Masuk
              </button>
              <button type="button" onClick={goRegister} className="ui-btn w-full">
                Daftar
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // COMPLEX (default)
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md sm:max-w-xl space-y-4">
        <section className="ui-card ui-card--pattern p-5 sm:p-7">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl">{slide.icon}</div>
            <div className="ui-title text-2xl sm:text-3xl font-extrabold mt-2">
              {slide.title}
            </div>
            <div className="mt-2 text-sm ui-muted">{slide.desc}</div>
          </div>

          {/* DOTS (mobile): fix agar tidak memanjang */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`step ${i + 1}`}
                // reset styling biar tidak kebawa ui-btn / button global
                className={[
                  "inline-flex flex-none items-center justify-center",
                  "appearance-none border-0 bg-transparent p-0",
                  "!w-2 !h-2 sm:!w-2.5 sm:!h-2.5",
                  "!rounded-full !min-w-0 !min-h-0",
                  "transition-all",
                  i === step ? "!bg-black scale-110" : "!bg-black/25",
                ].join(" ")}
                // fallback paling kuat kalau masih ada yang override
                style={{ width: 8, height: 8 }}
              />
            ))}
          </div>

          {/* CTA saja (tanpa Back/Next) */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={goLogin}
              className="ui-btn ui-btn--primary w-full"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={goRegister}
              className="ui-btn w-full"
            >
              Daftar
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}