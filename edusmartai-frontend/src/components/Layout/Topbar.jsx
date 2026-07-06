// src/components/Layout/Topbar.jsx
import React, { useState, useCallback } from "react";
import useAuth from "../../hooks/useAuth";
import useNotifications from "../../hooks/useNotifications";
import NotificationDropdown from "./NotificationDropdown";

const Topbar = () => {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAllAsRead,
    markAsRead,
  } = useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const handleToggleNotifications = useCallback(() => {
    if (!user) return;
    setIsNotifOpen((prev) => !prev);
  }, [user]);

  const handleCloseNotifications = useCallback(() => {
    setIsNotifOpen(false);
  }, []);

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      setIsNotifOpen(false);
    },
    [markAsRead]
  );

  const showNotifications = user && user.role === "student";

  const roleLabel =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "lecturer"
      ? "Lecturer"
      : user?.role === "student"
      ? "Student"
      : "";

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
          ES
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-800 sm:text-base">
            Welcome{user ? `, ${user.name}` : ""} 👋
          </h1>
          {roleLabel && (
            <p className="text-[11px] text-slate-500">
              Logged in as{" "}
              <span className="font-medium lowercase">{roleLabel}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {showNotifications && (
          <div className="relative">
            <button
              onClick={handleToggleNotifications}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              loading={notificationsLoading}
              error={notificationsError}
              isOpen={isNotifOpen}
              onClose={handleCloseNotifications}
              onMarkAllRead={markAllAsRead}
              onItemClick={handleNotificationClick}
            />
          </div>
        )}

        {user && (
          <button
            onClick={logout}
            className="text-sm font-medium text-primary border border-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
