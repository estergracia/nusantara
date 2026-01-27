// src/components/UiModeLoader.jsx
import React, { useEffect, useState } from "react";

function applyBodyUi(ui) {
  // set attribute untuk CSS: body[data-ui="..."]
  document.body.dataset.ui = ui;

  // set CSS var untuk background motif (aman saat deploy subfolder)
  const base = import.meta.env.BASE_URL || "/";
  const mediumUrl = `url("${base}images/pattern/motif-medium.png")`;
  const complexUrl = `url("${base}images/pattern/motif-complex.png")`;

  if (ui === "medium") {
    document.body.style.setProperty("--app-motif", mediumUrl);
  } else if (ui === "complex") {
    document.body.style.setProperty("--app-motif", complexUrl);
  } else {
    document.body.style.setProperty("--app-motif", "none");
  }
}

export default function UiModeLoader() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Mengubah tampilan...");

  useEffect(() => {
    const initialUi = document.body?.dataset?.ui || "simple";
    applyBodyUi(initialUi);
  }, []);

  useEffect(() => {
    const onStart = (e) => {
      const lv = e?.detail?.level || "simple";
      const txt =
        lv === "simple"
          ? "Mengubah ke Simple..."
          : lv === "medium"
          ? "Mengubah ke Medium..."
          : lv === "complex"
          ? "Mengubah ke Complex..."
          : "Mengubah tampilan...";

      applyBodyUi(lv);
      setLabel(txt);
      setOpen(true);
    };

    const onEnd = () => setOpen(false);

    window.addEventListener("ui:mode-switch-start", onStart);
    window.addEventListener("ui:mode-switch-end", onEnd);
    return () => {
      window.removeEventListener("ui:mode-switch-start", onStart);
      window.removeEventListener("ui:mode-switch-end", onEnd);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="ui-mode-loader"
      role="alert"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ui-mode-loader__overlay" />
      <div className="ui-mode-loader__card">
        <div className="ui-mode-loader__row">
          <div className="ui-mode-loader__spinner" aria-hidden="true" />
          <div className="ui-mode-loader__text">
            <div className="ui-mode-loader__title">Loading</div>
            <div className="ui-mode-loader__label">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
