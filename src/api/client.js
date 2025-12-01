// src/api/client.js
import axios from "axios";

const api = axios.create({
  baseURL: " https://snaggy-kylan-lily.ngrok-free.dev",
  // baseURL: 'http://192.168.1.10:4000',  // example for LAN
});

// 🔹 Request interceptor – har request ke saath JWT token bhejna
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Response interceptor – agar token expire / invalid ho to auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // JWT invalid / expired
      localStorage.removeItem("hrms_token");
      localStorage.removeItem("hrms_user");

      // optional: sirf agar already login page pe nahi ho
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
