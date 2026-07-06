// src/hooks/useNotifications.js
import { useCallback, useEffect, useMemo, useState } from "react";
import notificationApi from "../api/notificationApi";
import useAuth from "./useAuth";

const POLL_INTERVAL_MS = 60_000; // 60s

const useNotifications = () => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    // Only students fetch notifications (backend is student-only)
    if (!user || user.role !== "student") {
      setNotifications([]);
      setError("");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await notificationApi.getMyNotifications({ limit: 50 });
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // If not a student, do not start polling
    if (!user || user.role !== "student") {
      setNotifications([]);
      setError("");
      setLoading(false);
      return;
    }

    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    // No-op if not a student
    if (!user || user.role !== "student") return;

    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  }, [user]);

  const markAsRead = useCallback(
    async (id) => {
      // No-op if not a student
      if (!user || user.role !== "student") return;

      try {
        const updated = await notificationApi.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    },
    [user]
  );

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAllAsRead,
    markAsRead,
  };
};

export default useNotifications;
