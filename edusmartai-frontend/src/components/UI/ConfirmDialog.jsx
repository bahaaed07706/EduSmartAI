// src/components/UI/ConfirmDialog.jsx
import React from "react";
import Button from "./Button";

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const handleBackdropClick = () => {
    if (onCancel) onCancel();
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-2xl shadow-slate-900/10"
        onClick={stopPropagation}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
