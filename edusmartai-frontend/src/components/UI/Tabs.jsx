import React from "react";

/**
 * Fancy tabs with pill-style active state.
 * Supports:
 *  - tabs: ["Overview", "Grades"]
 *  - tabs: [{ id: "overview", label: "Overview" }, ...]
 */
const Tabs = ({ tabs, active, onChange }) => {
  const normalizedTabs = (tabs || []).map((tab) => {
    if (typeof tab === "string") {
      return { id: tab, label: tab };
    }
    return {
      id: tab.id ?? tab.value ?? tab.label,
      label: tab.label ?? String(tab.id ?? tab.value ?? ""),
    };
  });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-slate-100/70 p-1">
        {normalizedTabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange && onChange(tab.id)}
              className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
