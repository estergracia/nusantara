import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

const SLIDES = [
  { title: "Belajar", desc: "Baca materi singkat budaya Nusantara.", icon: "📚" },
  { title: "Kuis", desc: "Uji pemahaman lewat pertanyaan cepat.", icon: "🧠" },
  { title: "Badges", desc: "Kumpulkan badge dari progress-mu.", icon: "🏅" }
];

export default function Splash() {
  const navigate = useNavigate();
  const location = useLocation();
  const { is } = useUiLevelFirestore();
  const [step, setStep] = useState(0);

  const goLogin = () => navigate({ pathname: "/login", search: location.search });
  const goRegister = () => navigate({ pathname: "/register", search: location.search });

  const slide = useMemo(() => SLIDES[step] || SLIDES[0], [step]);

  if (is.simple) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <section className="ui-card ui-card--pattern p-6 text-center">
            <div className="ui-title text-3xl font-extrabold mt-2">Belajar Nusantara</div>
            <button type="button" onClick={goLogin} className="ui-btn ui-btn--primary mt-6 w-full">
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
              <div className="ui-title text-3xl font-extrabold mt-2">Belajar Nusantara</div>
              <div className="mt-2 text-sm ui-muted">
                Belajar budaya Nusantara lewat materi singkat dan kuis cepat.
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={goLogin} className="ui-btn ui-btn--primary w-full">
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl space-y-4">
        <section className="ui-card ui-card--pattern p-7">
          <div className="text-center">
            <div className="text-5xl">{slide.icon}</div>
            <div className="ui-title text-3xl font-extrabold mt-2">{slide.title}</div>
            <div className="mt-2 text-sm ui-muted">{slide.desc}</div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={["h-2.5 w-2.5 rounded-full", i === step ? "bg-black" : "bg-black/20"].join(" ")}
                aria-label={`step ${i + 1}`}
              />
            ))}
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="ui-btn w-full" disabled={step === 0}>
              Back
            </button>
            <button type="button" onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))} className="ui-btn ui-btn--primary w-full" disabled={step === SLIDES.length - 1}>
              Next
            </button>
            <button type="button" onClick={goLogin} className="ui-btn w-full">
              Skip
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={goLogin} className="ui-btn ui-btn--primary w-full">
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
