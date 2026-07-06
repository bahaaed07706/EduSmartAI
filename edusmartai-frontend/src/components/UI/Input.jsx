import React from "react";

const Input = ({ label, error, helperText, className = "", ...props }) => {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-lg border bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:bg-white focus:outline-none focus:ring-1 ${
          hasError
            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-300/70"
            : "border-slate-200 focus:border-primary focus:ring-primary/40"
        } ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      )}
      {hasError && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
