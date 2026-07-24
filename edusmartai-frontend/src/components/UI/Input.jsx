import React, { useId } from "react";

/**
 * Accessible text input.
 *
 * WCAG: the label is programmatically associated with the control (1.3.1 / 3.3.2),
 * validation errors are announced via aria-describedby + role="alert" (3.3.1),
 * and invalid state is exposed with aria-invalid (4.1.2). Focus styling is
 * inherited from the global :focus-visible ring so it is consistent app-wide.
 */
const Input = ({ label, error, helperText, className = "", id, ...props }) => {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);
  const describedBy = hasError ? errorId : helperText ? helperId : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-md border bg-slate-50/60 px-3 py-2 text-sm shadow-inner focus:bg-white ${
          hasError
            ? "border-danger"
            : "border-slate-200 focus:border-primary"
        } ${className}`}
        {...props}
      />
      {helperText && !hasError && (
        <p id={helperId} className="text-[11px] text-muted">
          {helperText}
        </p>
      )}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-danger bg-danger-bg border border-danger/30 rounded px-2 py-1"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
