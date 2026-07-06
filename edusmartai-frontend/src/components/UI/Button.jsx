import React from "react";

const baseClasses =
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2",
  lg: "px-5 py-2.5 text-sm",
};

const variantClasses = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/90 focus:ring-primary/50",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  subtle: "bg-slate-50 text-slate-700 hover:bg-slate-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
};

const Button = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const variantClass = variantClasses[variant] || variantClasses.primary;

  return (
    <button
      className={`${baseClasses} ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
