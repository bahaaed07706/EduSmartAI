// src/components/Layout/NotificationDropdown.jsx
import React from "react";

const formatTime = (iso) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return date.toLocaleString();
  } catch {
    return "";
  }
};

const NotificationDropdown = ({
  notifications,
  unreadCount,
  loading,
  error,
  isOpen,
  onClose,
  onMarkAllRead,
  onItemClick,
}) => {
  if (!isOpen) return null;

  const list = Array.isArray(notifications) ? notifications : [];
  const hasNotifications = !loading && !error && list.length > 0;

  return (
    <div className="absolute right-4 top-16 z-50 w-96 max-w-[90vw]">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/95 shadow-xl shadow-slate-200/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 backdrop-blur">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <span className="mt-0.5 text-xs text-slate-500">
              {unreadCount > 0
                ? "You have unread notifications"
                : "You're all caught up 🎉"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3 p-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-primary/60" />
              <span>Loading notifications...</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 animate-pulse"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-slate-200" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                    <div className="flex gap-2">
                      <div className="h-3 w-16 rounded bg-slate-100" />
                      <div className="h-3 w-24 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="px-4 py-6 text-sm text-rose-600">
            {error || "Failed to load notifications."}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && list.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg">
              🔕
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                When something important happens in your courses, it will show
                up here.
              </p>
            </div>
          </div>
        )}

        {/* List */}
        {hasNotifications && (
          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {list.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    !n.is_read
                      ? "bg-slate-50/70 hover:bg-slate-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mt-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        !n.is_read
                          ? "bg-primary/10 text-primary"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      🔔
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {n.title || "Notification"}
                      </p>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                      {n.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {n.course_id && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          <span className="text-[10px]">📘</span>
                          <span>Course #{n.course_id}</span>
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-slate-400">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
