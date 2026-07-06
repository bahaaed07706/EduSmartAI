// src/api/authApi.js
import axiosClient from "./axiosClient";

const authApi = {
  // Unified login using email and password
  login: async (email, password) => {
    const response = await axiosClient.post("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  logout: async () => {
    return { message: "Logged out" };
  },
};

export default authApi;
