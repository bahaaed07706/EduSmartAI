import React from "react";

/**
 * Status badge.
 *
 * Tones use the semantic tokens whose foreground/background pairs are verified
 * at >= 4.5:1. Status is never conveyed by colour alone — the label text always
 * states the meaning (WCAG 1.4.1 use of colour).
 */
const TONES = {
  neutral: "bg-slate-100 text-ink border-slate-200",
  success: "bg-success-bg text-success border-success/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  danger: "bg-danger-bg text-danger border-danger/30",
  info: "bg-info-bg text-info border-info/30",
  primary: "bg-primary-50 text-primary-700 border-primary-300",
};

const Badge = ({ tone = "neutral", children, className = "", ...rest }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
      TONES[tone] || TONES.neutral
    } ${className}`}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;
