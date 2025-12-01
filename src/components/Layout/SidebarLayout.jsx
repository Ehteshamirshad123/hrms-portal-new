// src/components/Layout/SidebarLayout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./SidebarLayout.css";

const SidebarLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Sidebar open/close
  const [isOpen, setIsOpen] = useState(true);

  // Dropdowns (by default closed)
  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const [leavesMenuOpen, setLeavesMenuOpen] = useState(false);

  const role = (user.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isHR = role === "HR";
  const isManager = role === "MANAGER";
  const isPayroll = role === "PAYROLL";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const roleLabelMap = {
    ADMIN: "Admin",
    HR: "HR",
    MANAGER: "Manager",
    EMPLOYEE: "Employee",
    PAYROLL: "Payroll",
    SUPER_ADMIN: "Super Admin",
  };

  // Current path ke basis pe correct group open rakho
  useEffect(() => {
    const path = location.pathname || "";

    if (
      path.startsWith("/attendance") ||
      path.startsWith("/attendance-regularization") ||
      path.startsWith("/admin/attendance-regularizations") ||
      path.startsWith("/wfh") ||
      path.startsWith("/admin/wfh-requests")
    ) {
      setAttendanceMenuOpen(true);
    }

    if (
      path.startsWith("/leaves") ||
      path.startsWith("/admin/leave-requests")
    ) {
      setLeavesMenuOpen(true);
    }
  }, [location.pathname]);

  const handleAttendanceHeaderClick = () => {
    setAttendanceMenuOpen((prev) => !prev);
  };

  const handleLeavesHeaderClick = () => {
    setLeavesMenuOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <div className={`app-shell ${isOpen ? "app-shell--sidebar-open" : ""}`}>
      {/* SIDEBAR */}
      <aside
        className={`app-sidebar ${
          isOpen ? "app-sidebar--open" : "app-sidebar--closed"
        }`}
      >
        <div className="app-sidebar__header">
          <div className="app-sidebar__brand">
            <div className="app-sidebar__brand-main">HRMS</div>
            <div className="app-sidebar__brand-sub">
              {isAdmin || isHR || isPayroll || isSuperAdmin
                ? "Admin Panel"
                : "Employee Portal"}
            </div>
          </div>
        </div>

        <nav className="app-sidebar__nav">
          {/* Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              "app-sidebar__link" +
              (isActive ? " app-sidebar__link--active" : "")
            }
            onClick={closeSidebar}
          >
            <span className="app-sidebar__icon">🏠</span>
            <span className="app-sidebar__label">Dashboard</span>
          </NavLink>

          {/* Employees – only Admin / HR */}
          {(isAdmin || isHR || isSuperAdmin) && (
            <NavLink
              to="/employees"
              className={({ isActive }) =>
                "app-sidebar__link" +
                (isActive ? " app-sidebar__link--active" : "")
              }
              onClick={closeSidebar}
            >
              <span className="app-sidebar__icon">👥</span>
              <span className="app-sidebar__label">Employees</span>
            </NavLink>
          )}

          {/* Attendance group with dropdown */}
          <div className="app-sidebar__group">
            {/* Header row */}
            <button
              type="button"
              className="app-sidebar__link app-sidebar__link--button"
              onClick={handleAttendanceHeaderClick}
            >
              <span className="app-sidebar__icon">🕒</span>
              <span className="app-sidebar__label">Attendance</span>
              <span className="app-sidebar__chevron">
                {attendanceMenuOpen ? "▾" : "▸"}
              </span>
            </button>

            {/* Children links */}
            {attendanceMenuOpen && (
              <div className="app-sidebar__submenu">
                <NavLink
                  to="/attendance"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  Attendance Record
                </NavLink>

                <NavLink
                  to="/attendance-regularization"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  Attendance Regularization
                </NavLink>

                <NavLink
                  to="/attendance-regularization/status"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  Attendance Regularization Status
                </NavLink>

                {/* Admin / HR / Manager / Super Admin → Correction Requests page */}
                {(isAdmin || isHR || isManager || isSuperAdmin) && (
                  <NavLink
                    to="/admin/attendance-regularizations"
                    className={({ isActive }) =>
                      "app-sidebar__sublink" +
                      (isActive ? " app-sidebar__sublink--active" : "")
                    }
                    onClick={closeSidebar}
                  >
                    Attendance Correction Requests
                  </NavLink>
                )}

                {/* WFH Requests – sirf Admin/HR/Manager/Super Admin */}
                {(isAdmin || isHR || isManager || isSuperAdmin) && (
                  <NavLink
                    to="/admin/wfh-requests"
                    className={({ isActive }) =>
                      "app-sidebar__sublink" +
                      (isActive ? " app-sidebar__sublink--active" : "")
                    }
                    onClick={closeSidebar}
                  >
                    WFH Requests
                  </NavLink>
                )}

                {/* WFH Status – sab roles ke liye visible */}
                <NavLink
                  to="/wfh/status"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  WFH Status
                </NavLink>
              </div>
            )}
          </div>

          {/* Leaves group with dropdown */}
          <div className="app-sidebar__group">
            <button
              type="button"
              className="app-sidebar__link app-sidebar__link--button"
              onClick={handleLeavesHeaderClick}
            >
              <span className="app-sidebar__icon">📝</span>
              <span className="app-sidebar__label">Leaves</span>
              <span className="app-sidebar__chevron">
                {leavesMenuOpen ? "▾" : "▸"}
              </span>
            </button>

            {leavesMenuOpen && (
              <div className="app-sidebar__submenu">
                <NavLink
                  to="/leaves/apply"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  Apply Leave
                </NavLink>

                <NavLink
                  to="/leaves/status"
                  className={({ isActive }) =>
                    "app-sidebar__sublink" +
                    (isActive ? " app-sidebar__sublink--active" : "")
                  }
                  onClick={closeSidebar}
                >
                  Leave Status
                </NavLink>

                {(isAdmin || isHR || isSuperAdmin) && (
                  <NavLink
                    to="/admin/leave-requests"
                    className={({ isActive }) =>
                      "app-sidebar__sublink" +
                      (isActive ? " app-sidebar__sublink--active" : "")
                    }
                    onClick={closeSidebar}
                  >
                    Leave Requests
                  </NavLink>
                )}
                {(isAdmin || isHR || isManager) && (
                  <NavLink
                    to="/admin/leave-records"
                    className={({ isActive }) =>
                      "app-sidebar__sublink" +
                      (isActive ? " app-sidebar__sublink--active" : "")
                    }
                    onClick={closeSidebar}
                  >
                    Leave Records
                  </NavLink>
                )}
              </div>
            )}
          </div>

          {/* Holidays Calendar (all roles) */}
          <NavLink
            to="/holidays"
            className={({ isActive }) =>
              "app-sidebar__link" +
              (isActive ? " app-sidebar__link--active" : "")
            }
            onClick={closeSidebar}
          >
            <span className="app-sidebar__icon">📅</span>
            <span className="app-sidebar__label">Holidays Calendar</span>
          </NavLink>

          {/* My Payroll – sab users ke liye */}
          <NavLink
            to="/my-payroll"
            className={({ isActive }) =>
              "app-sidebar__link" +
              (isActive ? " app-sidebar__link--active" : "")
            }
            onClick={closeSidebar}
          >
            <span className="app-sidebar__icon">📄</span>
            <span className="app-sidebar__label">My Payroll</span>
          </NavLink>

          {/* Admin Payroll – sirf specific roles */}
          {["ADMIN", "HR", "PAYROLL", "SUPER_ADMIN"].includes(role) && (
            <NavLink
              to="/payroll"
              className={({ isActive }) =>
                "app-sidebar__link" +
                (isActive ? " app-sidebar__link--active" : "")
              }
              onClick={closeSidebar}
            >
              <span className="app-sidebar__icon">💰</span>
              <span className="app-sidebar__label">Payroll</span>
            </NavLink>
          )}
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">
            <div className="app-sidebar__user-name">
              {user.name ||
                `${user.first_name || ""} ${user.last_name || ""}`.trim()}
            </div>
            <div className="app-sidebar__user-meta">
              {user.employee_code && (
                <span className="app-sidebar__user-code">
                  {user.employee_code}
                </span>
              )}
              <span className="app-sidebar__role-badge">
                {roleLabelMap[role] || user.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="app-sidebar__logout"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE */}
      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="app-topbar__toggle"
            onClick={() => setIsOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="app-topbar__title">
            {isAdmin || isHR || isPayroll || isSuperAdmin
              ? "HRMS Admin Panel"
              : "HRMS Employee Portal"}
          </div>
        </header>

        <main className="app-main__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
