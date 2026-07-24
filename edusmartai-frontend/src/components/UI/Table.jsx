import React from "react";

/**
 * Accessible, responsive data table.
 *
 * - Wraps in a keyboard-focusable scroll container so wide tables scroll
 *   themselves instead of the page (WCAG 1.4.10 reflow), and keyboard users can
 *   reach the scroll area (tabIndex=0 + aria-label).
 * - Header cells use scope="col" so screen readers announce column context (1.3.1).
 * - `caption` is visually hidden but announced, naming the table (2.4.6).
 * - Numeric cells opt into tabular monospace figures via the `numeric` class so
 *   grade/score columns align digit-for-digit.
 */

export const Table = ({ caption, children, className = "" }) => (
  <div
    className="table-scroll rounded-lg border border-slate-200 bg-surface"
    tabIndex={0}
    role="region"
    aria-label={caption}
  >
    <table className={`w-full border-collapse text-sm ${className}`}>
      {caption && <caption className="sr-only">{caption}</caption>}
      {children}
    </table>
  </div>
);

export const THead = ({ children }) => (
  <thead className="bg-slate-50 text-left">{children}</thead>
);

export const TBody = ({ children }) => (
  <tbody className="divide-y divide-slate-100">{children}</tbody>
);

export const TR = ({ children, className = "", ...rest }) => (
  <tr className={`hover:bg-slate-50/70 ${className}`} {...rest}>
    {children}
  </tr>
);

export const TH = ({ children, numeric = false, className = "", ...rest }) => (
  <th
    scope="col"
    className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted ${
      numeric ? "numeric text-right" : "text-left"
    } ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export const TD = ({ children, numeric = false, className = "", ...rest }) => (
  <td
    className={`px-3 py-2 align-middle text-ink ${
      numeric ? "numeric text-right" : ""
    } ${className}`}
    {...rest}
  >
    {children}
  </td>
);

export default Table;
