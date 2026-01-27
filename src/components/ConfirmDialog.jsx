import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "OK",
  cancelText = "Batal",
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="ui-dialog-overlay" role="dialog" aria-modal="true">
      <div className="ui-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ui-dialog__title">{title}</div>
        <div className="ui-dialog__msg">{message}</div>

        <div className="ui-dialog__actions">
          <button type="button" className="ui-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
