// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/LoginPage.css";

import logo from "../assets/logo-hrms.png";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    // jis field mein type karein uska error clear
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = {};

    if (!form.username.trim()) {
      errors.username = "Username is required";
    }
    if (!form.password.trim()) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const response = await login({
      username: form.username,
      password: form.password,
    });

    if (response.success) {
      navigate("/");
    } else {
      setError(response.message || "Invalid username or password");
    }
  };

  return (
    <div className="login-page">
      {/* Logo / brand top-left */}
      <div className="login-brand">
        <img src={logo} alt="CRIIGROUP HRMS" className="login-brand__logo" />
      </div>

      {/* Center card */}
      <div className="login-panel">
        <h1 className="login-panel__title">Log in</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Username */}
          <label className="login-label">Username / Employee Code</label>
          <input
            type="text"
            name="username"
            className="login-input"
            placeholder="Enter your username"
            value={form.username}
            onChange={handleChange}
          />
          {fieldErrors.username && (
            <p className="login-field-error">{fieldErrors.username}</p>
          )}

          {/* Password */}
          <label className="login-label">Password</label>
          <input
            type="password"
            name="password"
            className="login-input"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
          />
          {fieldErrors.password && (
            <p className="login-field-error">{fieldErrors.password}</p>
          )}

          <div className="login-row">
            <label className="login-remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="login-link-button"
              onClick={() => {}}
            >
              Forgot password?
            </button>
          </div>

          {/* Backend / auth error */}
          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button">
            Log in
          </button>

          <p className="login-footnote">
            © {new Date().getFullYear()} CRI GROUP HRMS
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
