import React from "react";
import { useToast } from "../hooks/useToast.jsx";

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed left-0 right-0 bottom-3 z-40 flex flex-col items-center gap-2 px-3 sm:bottom-5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto w-full max-w-md rounded-3xl border border-gray-200 px-4 py-3 shadow-lg bg-white"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-xl">{t.icon || "🔔"}</div>
            <div className="flex-1">
              <div className="text-sm font-extrabold">{t.title || "Notice"}</div>
              <div className="mt-0.5 text-sm text-gray-700">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="rounded-2xl px-2 py-1 text-sm font-bold ui-muted hover:bg-gray-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
