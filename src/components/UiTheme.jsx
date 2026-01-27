// src/components/UiTheme.jsx
import React, { useEffect } from "react";
import useUiLevelFirestore from "../hooks/useUiLevelFirestore.js";

export default function UiTheme({ children }) {
  const { level } = useUiLevelFirestore();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // pasang atribut mode ke html & body biar selector CSS fleksibel
    html.dataset.ui = level;
    body.dataset.ui = level;

    // set URL motif dari public/ (aman untuk deploy subfolder)
    const base = import.meta.env.BASE_URL || "/";
    const motifMedium = `url("${base}images/pattern/motif-medium.png")`;
    const motifComplex = `url("${base}images/pattern/motif-complex.png")`;

    if (level === "medium") {
      html.style.setProperty("--app-motif", motifMedium);
    } else if (level === "complex") {
      html.style.setProperty("--app-motif", motifComplex);
    } else {
      html.style.setProperty("--app-motif", "none");
    }
  }, [level]);

  return children;
}
