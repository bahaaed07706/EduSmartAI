// src/api/notificationApi.js
import axiosClient from "./axiosClient";

const notificationApi = {
  getMyNotifications: ({ unreadOnly = false, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append("unread_only", "true");
    if (limit) params.append("limit", String(limit));

    const queryString = params.toString();
    const url = `/notifications/me${queryString ? `?${queryString}` : ""}`;

    return axiosClient.get(url).then((res) => res.data);
  },

  markAsRead: (notificationId) => {
    return axiosClient
      .patch(`/notifications/${notificationId}/read`)
      .then((res) => res.data);
  },

  markAllAsRead: () => {
    return axiosClient
      .patch("/notifications/mark-all-read")
      .then((res) => res.data);
  },
};

export default notificationApi;
