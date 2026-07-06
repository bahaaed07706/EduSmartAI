// src/components/UI/GradeDialog.jsx
import React, { useEffect, useState } from "react";
import Button from "./Button";

const GradeDialog = ({
  open,
  title,
  initialMarks = "",
  initialFeedback = "",
  saving = false,
  onSave,
  onCancel,
}) => {
  const [marks, setMarks] = useState(initialMarks ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMarks(initialMarks ?? "");
      setFeedback(initialFeedback ?? "");
      setError("");
    }
  }, [open, initialMarks, initialFeedback]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (!saving && onCancel) onCancel();
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(marks);
    if (marks === "" || Number.isNaN(value)) {
      setError("Please enter a valid numeric mark.");
      return;
    }

    if (onSave) {
      onSave({ marks: value, feedback: feedback.trim() || null });
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl border border-slate-100 bg-white/95 p-5 shadow-2xl shadow-slate-900/10"
        onClick={stopPropagation}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Enter the marks and optional feedback for this student.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Marks
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              min={0}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Feedback (optional)
            </label>
            <textarea
              className="w-full min-h-[90px] rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner resize-y focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save grade"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeDialog;
