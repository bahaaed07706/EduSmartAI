// src/components/Layout/MainLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatbotWidget from "../Chatbot/ChatbotWidget";
import useAuth from "../../hooks/useAuth";

const MainLayout = () => {
  const { user } = useAuth();
  const role = user?.role || null;

  // Show chatbot for student and lecturer roles
  const showChatbot = role === "student" || role === "lecturer";

  return (
    <div className="relative flex h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Floating / fullscreen chatbot */}
      {showChatbot && <ChatbotWidget />}
    </div>
  );
};

export default MainLayout;
