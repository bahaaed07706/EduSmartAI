import React from "react";
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";

import Button from "./Button";

/**
 * Canonical Loading / Error / Empty / Success states.
 *
 * Every data surface should render one of these instead of ad-hoc text, so the
 * three role areas behave identically. Loading uses role="status" (polite) and
 * Error uses role="alert" (assertive) so screen readers announce correctly.
 */

const TONES = {
  loading: { icon: Loader2, color: "text-primary-600", bg: "bg-primary-50" },
  empty: { icon: Inbox, color: "text-muted", bg: "bg-slate-50" },
  error: { icon: AlertCircle, color: "text-danger", bg: "bg-danger-bg" },
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success-bg" },
};

export const StateBlock = ({
  variant = "empty",
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}) => {
  const tone = TONES[variant] || TONES.empty;
  const Icon = tone.icon;
  const isLoading = variant === "loading";
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-busy={isLoading || undefined}
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center ${tone.bg} ${className}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/70 ${tone.color}`}>
        <Icon className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
      </span>
      {title && <p className="text-sm font-semibold text-ink">{title}</p>}
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState = (props) => (
  <StateBlock variant="loading" title={props.title || "Loading…"} {...props} />
);
export const EmptyState = (props) => <StateBlock variant="empty" {...props} />;
export const ErrorState = ({ onRetry, ...props }) => (
  <StateBlock
    variant="error"
    title={props.title || "Something went wrong"}
    actionLabel={onRetry ? "Try again" : undefined}
    onAction={onRetry}
    {...props}
  />
);
export const SuccessState = (props) => <StateBlock variant="success" {...props} />;

export default StateBlock;
