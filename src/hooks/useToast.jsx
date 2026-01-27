import React, { createContext, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  };

  const pushToast = (toast) => {
    const id = toast.id || makeId();
    const item = {
      id,
      title: toast.title || "Info",
      message: toast.message || "",
      icon: toast.icon || "🔔",
      ttl: typeof toast.ttl === "number" ? toast.ttl : 3500,
    };

    setToasts((prev) => [item, ...prev].slice(0, 4));

    const tm = setTimeout(() => dismissToast(id), item.ttl);
    timers.current.set(id, tm);

    return id;
  };

  const value = useMemo(() => ({ toasts, pushToast, dismissToast }), [toasts]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* ✅ renderer toast selalu ada */}
      <ToastViewport />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}

/* =========================
   Toast UI (Renderer)
   ========================= */

function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (!toasts?.length) return null;

  return (
    <div className="ui-toastHost" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="ui-toast"
          role="status"
          aria-live="polite"
          onClick={() => dismissToast(t.id)}
          title="Klik untuk menutup"
        >
          <div className="ui-toast__icon" aria-hidden="true">
            {t.icon}
          </div>

          <div className="ui-toast__body">
            <div className="ui-toast__title">{t.title}</div>
            {t.message ? <div className="ui-toast__msg">{t.message}</div> : null}
          </div>

          <button
            type="button"
            className="ui-toast__close"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(t.id);
            }}
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
