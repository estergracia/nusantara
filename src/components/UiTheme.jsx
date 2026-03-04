// src/components/UiTheme.jsx
import React, { useEffect } from "react";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

export default function UiTheme({ children }) {
  const { level } = useUiLevelFirestore();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.dataset.ui = level;
    body.dataset.ui = level;

    const base = import.meta.env.BASE_URL || "/";
    const motifMedium = `url("${base}images/pattern/motif-medium.png")`;
    const motifComplex = `url("${base}images/pattern/motif-complex.png")`;

    if (level === "medium") {
      html.style.setProperty("--app-motif", motifMedium);
      html.style.setProperty("--app-motif-anim", "none"); // medium: no anim
    } else if (level === "complex") {
      html.style.setProperty("--app-motif", motifComplex);
      html.style.setProperty("--app-motif-anim", "motifFlow 22s linear infinite"); // complex: anim
    } else {
      html.style.setProperty("--app-motif", "none");
      html.style.setProperty("--app-motif-anim", "none");
    }
  }, [level]);

  return children;
}
