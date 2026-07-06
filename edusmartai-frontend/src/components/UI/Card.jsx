// src/components/UI/Card.jsx
import React from "react";

/**
 * Simple reusable Card component.
 * Forwards all extra props (like onClick, id, data-*, etc.) to the root <div>.
 */
const Card = ({ children, className = "", ...rest }) => {
  return (
    <div
      {...rest}
      className={`rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm transition-shadow ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
