// src/api/axiosClient.js
import axios from "axios";

const apiBase = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const axiosClient = axios.create({
  baseURL: `${apiBase}/api/v1`,
});

// Attach Authorization header from localStorage
axiosClient.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("edusmart_auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch (e) {
      console.error("Failed to read auth token from storage", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response handling:
//  - On 401 (expired/invalid token), clear auth and send the user to /login.
//  - Network blips and expected 4xx are surfaced to the caller (which shows an
//    error state) without spamming console.error on every request.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      try {
        localStorage.removeItem("edusmart_auth");
      } catch (e) {
        /* ignore storage errors */
      }
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    } else if (status >= 500) {
      // Only log genuinely unexpected server errors.
      console.error(`API ${status} error on ${error.config?.url}`);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
