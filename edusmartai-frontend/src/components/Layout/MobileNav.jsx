// src/components/Layout/MobileNav.jsx
import React, { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";

import { NavLinks, SidebarBrand } from "./Sidebar";

/**
 * Mobile navigation drawer (below the `md` breakpoint).
 *
 * Without this the app had NO navigation at all under 768px — the desktop rail
 * is `hidden md:flex`, so phone users could not move between sections.
 *
 * Accessibility:
 * - Trigger exposes aria-expanded / aria-controls (4.1.2).
 * - Drawer is role="dialog" aria-modal with an accessible name (4.1.2).
 * - Escape closes it and focus returns to the trigger (2.1.2 no keyboard trap).
 * - Focus moves into the drawer on open.
 * - Background scroll is locked while open.
 */

export const MobileNavToggle = ({ open, onToggle, buttonRef }) => (
  <button
    ref={buttonRef}
    type="button"
    onClick={onToggle}
    aria-expanded={open}
    aria-controls="mobile-nav"
    aria-label={open ? "Close navigation menu" : "Open navigation menu"}
    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-ink md:hidden"
  >
    {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
  </button>
);

const MobileNav = ({ open, onClose, role, triggerRef }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      // Focus trap (WCAG 2.4.3): aria-modal hides the background from screen
      // readers but does nothing for Tab, so without this the keyboard walks
      // straight out of the drawer into the page behind the backdrop.
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the drawer so keyboard/screen-reader users land there.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop is decorative; the dialog owns the semantics. */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id="mobile-nav"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        tabIndex={-1}
        className="absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col bg-white px-4 py-4 shadow-overlay"
      >
        <div className="flex items-start justify-between">
          <SidebarBrand role={role} />
          <button
            type="button"
            onClick={() => {
              onClose();
              triggerRef?.current?.focus();
            }}
            aria-label="Close navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <NavLinks role={role} onNavigate={onClose} />
      </div>
    </div>
  );
};

export default MobileNav;
