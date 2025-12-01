// src/components/Layout/Navbar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false); // mobile toggle

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";
  const isHR = user.role === "HR";
  const isManager = user.role === "MANAGER";

  const roleLabelMap = {
    ADMIN: "Admin",
    HR: "HR",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const closeOnNavigate = () => {
    // mobile pe navigate ke baad menu band
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile toggle button (top-left) */}
      <button
        className="sidebar-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="sidebar-toggle__icon" />
      </button>

      {/* Backdrop for mobile */}
      <div
        className={
          isOpen
            ? "sidebar-backdrop sidebar-backdrop--visible"
            : "sidebar-backdrop"
        }
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-main">HRMS</div>
          <div className="sidebar__brand-sub">
            {isAdmin || isHR ? "Admin Panel" : "Employee Portal"}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "sidebar__link" + (isActive ? " sidebar__link--active" : "")
            }
            onClick={closeOnNavigate}
          >
            <span className="sidebar__link-icon">🏠</span>
            <span className="sidebar__link-text">Dashboard</span>
          </NavLink>

          {(isAdmin || isHR) && (
            <NavLink
              to="/employees"
              className={({ isActive }) =>
                "sidebar__link" + (isActive ? " sidebar__link--active" : "")
              }
              onClick={closeOnNavigate}
            >
              <span className="sidebar__link-icon">👥</span>
              <span className="sidebar__link-text">Employees</span>
            </NavLink>
          )}

          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              "sidebar__link" + (isActive ? " sidebar__link--active" : "")
            }
            onClick={closeOnNavigate}
          >
            <span className="sidebar__link-icon">🕒</span>
            <span className="sidebar__link-text">Attendance</span>
          </NavLink>

          <NavLink
            to="/leaves"
            className={({ isActive }) =>
              "sidebar__link" + (isActive ? " sidebar__link--active" : "")
            }
            onClick={closeOnNavigate}
          >
            <span className="sidebar__link-icon">📝</span>
            <span className="sidebar__link-text">Leaves</span>
          </NavLink>
        </nav>

        {/* Bottom user info + logout */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__user-name">{user.name}</div>
            <div className="sidebar__user-meta">
              {user.employee_code && (
                <span className="sidebar__user-code">{user.employee_code}</span>
              )}
              <span className="sidebar__role-badge">
                {roleLabelMap[user.role] || user.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar__logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
