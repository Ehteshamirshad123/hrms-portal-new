// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";
import { toast } from "react-toastify";

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatShift(start, end) {
  if (!start || !end) return "-";
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hrs ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

// helper to get current GPS position (same style as AttendancePage)
const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      return reject(new Error("Geolocation not supported in this browser."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [checking, setChecking] = useState(false);

  // leave summary state (from /api/leaves/balance)
  const [leaveSummary, setLeaveSummary] = useState([]);
  const currentYear = new Date().getFullYear();

  // live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get("/api/dashboard/employee", {
        params: { employee_id: user.id },
      });
      setDashboard(res.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Error loading dashboard data"); // ✅ alert → toast
    } finally {
      setLoading(false);
    }
  };

  // fetch leave balance from new endpoint
  const fetchLeaveSummary = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/api/leaves/balance/${user.id}`, {
        params: { year: currentYear },
      });
      setLeaveSummary(res.data || []);
    } catch (err) {
      console.error("Error loading leave summary", err);
      // no toast here, silent fail
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchLeaveSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const attendanceToday = dashboard?.attendanceToday;
  const notifications = dashboard?.notifications || [];

  const shiftLabel = formatShift(
    dashboard?.employee?.shift_start_time,
    dashboard?.employee?.shift_end_time
  );

  const hasCheckedIn = !!attendanceToday?.clock_in_time;
  const hasCheckedOut = !!attendanceToday?.clock_out_time;

  // employee gender (for ML / PL visibility)
  const employeeGender = (dashboard?.employee?.gender || user?.gender || "")
    .toString()
    .toUpperCase();

  // --------- Leave summary (computed from /api/leaves/balance) ----------

  const filteredLeaveSummary = (leaveSummary || []).filter(
    (ls) => ls.code !== "WFH" // WFH row remove
  );

  let computedLeaveSummary = filteredLeaveSummary.map((ls) => {
    const opening = Number(ls.opening_balance_days) || 0;
    const carry = Number(ls.carry_forward_days) || 0;
    const used = Number(ls.used_days) || 0;
    const total = opening + carry;
    const balance = total - used;

    return {
      ...ls,
      total,
      used,
      balance,
    };
  });

  // Hamesha ML / PL rows ensure karna (agar backend se na aaye hon)
  const addIfMissing = (code, name) => {
    if (!computedLeaveSummary.some((ls) => ls.code === code)) {
      computedLeaveSummary.push({
        code,
        leave_type_name: name,
        total: 0,
        used: 0,
        balance: 0,
      });
    }
  };

  addIfMissing("ML", "Maternity Leave");
  addIfMissing("PL", "Paternity Leave");

  // Gender-based filtering:
  if (employeeGender === "FEMALE") {
    computedLeaveSummary = computedLeaveSummary.filter(
      (ls) => ls.code !== "PL"
    );
  } else if (employeeGender === "MALE") {
    computedLeaveSummary = computedLeaveSummary.filter(
      (ls) => ls.code !== "ML"
    );
  }

  const leaveTotals = computedLeaveSummary.reduce(
    (acc, ls) => {
      const total = Number(ls.total) || 0;
      const used = Number(ls.used) || 0;
      const balance = Number(ls.balance) || 0;

      acc.total += total;
      acc.used += used;
      acc.balance += balance;
      return acc;
    },
    { total: 0, used: 0, balance: 0 }
  );

  const totalBalance = leaveTotals.balance;
  const totalUsed = leaveTotals.used;
  const leaveTypesCount = computedLeaveSummary.length;

  // --------- Check-in / Check-out with geolocation ----------

  const handleCheckIn = async () => {
    if (!user?.id) return;
    setChecking(true);
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      const res = await api.post("/api/attendance/check-in", {
        employee_id: user.id,
        device_latitude: latitude,
        device_longitude: longitude,
      });

      setDashboard((prev) => ({
        ...(prev || {}),
        attendanceToday: res.data,
      }));
      toast.success("Checked in successfully"); // ✅ success toast
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error during check-in (location / geo-fence).";
      toast.error(msg); // ✅ alert → toast
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id) return;
    setChecking(true);
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      const res = await api.post("/api/attendance/check-out", {
        employee_id: user.id,
        device_latitude: latitude,
        device_longitude: longitude,
      });

      setDashboard((prev) => ({
        ...(prev || {}),
        attendanceToday: res.data,
      }));
      toast.success("Checked out successfully"); // ✅ success toast
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error during check-out (location / geo-fence).";
      toast.error(msg); // ✅ alert → toast
    } finally {
      setChecking(false);
    }
  };

  const primaryAttendanceText = (() => {
    if (!attendanceToday || !attendanceToday.clock_in_time)
      return "You haven't checked in yet.";
    if (!attendanceToday.clock_out_time)
      return `You checked in at ${new Date(
        attendanceToday.clock_in_time
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    return `You worked ${attendanceToday.total_hours || 0} hours today.`;
  })();

  const isLate = attendanceToday?.is_late;

  return (
    <div className="dashboard-root">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">HRMS Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.name}.</p>
        </div>
      </div>

      {loading && !dashboard ? (
        <p>Loading...</p>
      ) : (
        <div className="dashboard-grid">
          {/* LEFT COLUMN */}
          <div className="dashboard-left">
            {/* Attendance Card */}
            <section className="dash-card dash-card--attendance">
              <div className="dash-card-header">
                <div className="dash-card-title">Attendance</div>
                <div className="dash-card-subtitle">Shift: {shiftLabel}</div>
              </div>

              <div className="dashboard-clock">{formatTime(now)}</div>

              <p
                className={
                  "dashboard-attendance-text" +
                  (isLate ? " dashboard-attendance-text--late" : "")
                }
              >
                {primaryAttendanceText}
                {isLate ? " (Late check-in)" : ""}
              </p>

              <div className="dashboard-actions-row">
                <button
                  onClick={handleCheckIn}
                  disabled={checking || (hasCheckedIn && !hasCheckedOut)}
                  className="btn btn-primary"
                >
                  Check in
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/work-from-home")}
                >
                  WFH Request
                </button>

                <button
                  onClick={handleCheckOut}
                  disabled={checking}
                  className="btn btn-dark"
                >
                  Check out
                </button>
              </div>

              <button
                type="button"
                className="dash-link"
                onClick={() => navigate("/attendance")}
              >
                View attendance history
              </button>
            </section>

            {/* Leave Summary Card */}
            <section className="dash-card dash-card--leave">
              <div className="dash-card-header dash-card-header--leave">
                <div>
                  <div className="dash-card-title">Leave Summary</div>
                  <div className="dash-card-subtitle">
                    Overview of your available leaves
                  </div>
                </div>
                <div className="leave-asof-pill">As of {currentYear}</div>
              </div>

              {/* Top stats row */}
              <div className="leave-stat-row">
                <div className="leave-stat-card">
                  <div className="leave-stat-label">Total Balance</div>
                  <div className="leave-stat-value">{totalBalance}</div>
                </div>
                <div className="leave-stat-card">
                  <div className="leave-stat-label">Total Used</div>
                  <div className="leave-stat-value">{totalUsed}</div>
                </div>
                <div className="leave-stat-card">
                  <div className="leave-stat-label">Leave Types</div>
                  <div className="leave-stat-value">{leaveTypesCount}</div>
                </div>
              </div>

              {/* Table */}
              <div className="leave-table-wrapper">
                <table className="leave-table">
                  <thead>
                    <tr>
                      <th className="leave-type-col">Type</th>
                      <th className="leave-num-col">Total</th>
                      <th className="leave-num-col">Used</th>
                      <th className="leave-num-col">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedLeaveSummary.map((ls) => (
                      <tr
                        key={ls.leave_type_id || ls.code}
                        className="leave-row"
                      >
                        <td className="leave-type-cell">
                          {ls.leave_type_name || ls.code}
                        </td>
                        <td className="leave-num-col">{ls.total}</td>
                        <td className="leave-num-col">{ls.used}</td>
                        <td className="leave-num-col">
                          <span className="leave-pill leave-pill--green">
                            {ls.balance}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {computedLeaveSummary.length === 0 && (
                      <tr>
                        <td colSpan={4} className="dash-no-data">
                          No leave data available.
                        </td>
                      </tr>
                    )}

                    {/* Total row */}
                    {computedLeaveSummary.length > 0 && (
                      <tr className="leave-row leave-row-total">
                        <td className="leave-type-cell">
                          <span className="leave-total-icon">⟳</span>
                          <span>Total</span>
                        </td>
                        <td className="leave-num-col">{leaveTotals.total}</td>
                        <td className="leave-num-col">{leaveTotals.used}</td>
                        <td className="leave-num-col">
                          <span className="leave-pill leave-pill--red">
                            {leaveTotals.balance}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Notifications */}
          <aside className="dashboard-right">
            <section className="dash-card dash-card--notifications">
              <div className="dash-card-header">
                <div className="dash-card-title">Notifications</div>
                <span className="dash-card-subtitle">All</span>
              </div>

              {notifications.length === 0 ? (
                <p className="dash-no-data">No notifications.</p>
              ) : (
                <div className="notifications-list">
                  {notifications.map((n) => {
                    const colorMap = {
                      warning: "#f59e0b",
                      success: "#16a34a",
                      error: "#dc2626",
                    };
                    const bgMap = {
                      warning: "#fef3c7",
                      success: "#dcfce7",
                      error: "#fee2e2",
                    };
                    const iconColor = colorMap[n.type] || "#6b7280";
                    const bgColor = bgMap[n.type] || "#f3f4f6";

                    return (
                      <div
                        key={n.id}
                        className="notification-item"
                        style={{ background: bgColor }}
                      >
                        <div
                          className="notification-icon"
                          style={{ color: iconColor }}
                        >
                          {n.type === "success"
                            ? "✔"
                            : n.type === "error"
                            ? "✖"
                            : "!"}
                        </div>
                        <div className="notification-body">
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">
                            {n.message}
                          </div>
                          <div className="notification-time">
                            {formatTimeAgo(n.occurred_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
