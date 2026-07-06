// src/context/AuthContext.jsx
import React, { createContext, useCallback, useEffect, useState } from "react";
import authApi from "../api/authApi";

export const AuthContext = createContext(null);

const STORAGE_KEY = "edusmart_auth";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { id, name, email, role }
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setToken(parsed.token || null);
        setUser(parsed.user || null);
      }
    } catch (e) {
      console.error("Failed to parse auth storage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAuth = useCallback((token, user) => {
    setToken(token);
    setUser(user);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token,
        user,
      })
    );
  }, []);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Main login function - uses email and password
  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      // backend returns: { access_token, token_type, user }
      saveAuth(data.access_token, data.user);
      return data.user;
    },
    [saveAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
