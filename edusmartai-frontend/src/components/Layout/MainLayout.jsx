// src/components/Layout/MainLayout.jsx
import React, { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav, { MobileNavToggle } from "./MobileNav";
import Topbar from "./Topbar";
import ChatbotWidget from "../Chatbot/ChatbotWidget";
import useAuth from "../../hooks/useAuth";

const MainLayout = () => {
  const { user } = useAuth();
  const role = user?.role || null;
  const [navOpen, setNavOpen] = useState(false);
  const toggleRef = useRef(null);

  // Stable identities: MobileNav's effect depends on onClose, so an inline
  // arrow would re-run that effect on every render of this component and pull
  // focus back into the drawer while the user is tabbing through it.
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  // Show chatbot for student and lecturer roles
  const showChatbot = role === "student" || role === "lecturer";

  return (
    <div className="relative flex h-screen bg-canvas text-ink">
      {/* WCAG 2.4.1 — let keyboard users jump past the navigation. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar />
      <MobileNav
        open={navOpen}
        onClose={closeNav}
        role={role || "student"}
        triggerRef={toggleRef}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only nav trigger; the desktop rail covers md and up. */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <MobileNavToggle
            open={navOpen}
            onToggle={toggleNav}
            buttonRef={toggleRef}
          />
          <span className="text-sm font-semibold text-ink">EduSmartAI</span>
        </div>

        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-canvas px-4 py-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>

      {/* Floating / fullscreen chatbot */}
      {showChatbot && <ChatbotWidget />}
    </div>
  );
};

export default MainLayout;
