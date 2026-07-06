// src/utils/fileUrl.js

// Base URL of your backend (where FastAPI runs)
// Example: REACT_APP_API_BASE_URL=http://localhost:8000
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

/**
 * Build a full URL to a file served by the backend.
 *
 * Accepts:
 *  - absolute URLs (http..., https...) -> returned as is
 *  - relative paths like "/uploads/abc.pdf"
 *  - legacy paths like "/api/v1/uploads/abc.pdf"
 */
export const buildFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return "";

  // If it's already an absolute URL, just return it
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  // Normalize legacy "/api/v1/uploads/..." to "/uploads/..."
  const normalized = pathOrUrl.replace(/^\/api\/v1\/uploads\//, "/uploads/");

  // Join with backend base URL
  return `${API_BASE_URL}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
};
