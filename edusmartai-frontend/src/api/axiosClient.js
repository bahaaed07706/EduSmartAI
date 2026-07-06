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

// Simple error logger
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error);
    return Promise.reject(error);
  }
);

export default axiosClient;
