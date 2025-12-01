// src/pages/AttendancePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/AttendancePage.css";
import { toast } from "react-toastify";

const formatDate = (str) => {
  if (!str) return "-";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (str) => {
  if (!str) return "-";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// CSV helper – value ko safely escape karega
const toCsvValue = (val) => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const AttendancePage = () => {
  const { user } = useAuth();
  const employeeId = user?.id;

  const [attendance, setAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const [filters, setFilters] = useState({
    employee_code: "",
    employee_name: "",
    date_from: "",
    date_to: "",
  });

  // helper: kaun kaun filters dekh sakta hai?
  const canSeeEmployeeFilters = [
    "SUPER_ADMIN",
    "ADMIN",
    "HR",
    "MANAGER",
  ].includes((user?.role || "").toUpperCase());

  // ---------- Fetch Data ----------
  const fetchToday = async () => {
    if (!employeeId) return;
    try {
      const res = await api.get("/api/attendance/today", {
        params: { employee_id: employeeId },
      });
      setTodayRecord(res.data);
    } catch (err) {
      console.error(err);
      // optional: toast.error("Error fetching today's attendance");
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/attendance", {
        params: {
          employee_code: filters.employee_code || undefined,
          employee_name: filters.employee_name || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        },
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Filters ----------
  const handleFilterChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAttendance();
  };

  // ---------- Helper: get current position ----------
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

  // ---------- Check-in / Check-out ----------
  const handleCheckIn = async () => {
    if (!employeeId) {
      toast.error("User ID missing");
      return;
    }

    setChecking(true);
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      const res = await api.post("/api/attendance/check-in", {
        employee_id: employeeId,
        device_latitude: latitude,
        device_longitude: longitude,
      });

      setTodayRecord(res.data);
      fetchAttendance();

      if (res.data?.status === "ABSENT") {
        toast.error(
          "You have been marked ABSENT due to repeated late check-ins this month."
        );
      } else if (res.data?.is_late) {
        toast.warn("Checked in (LATE).");
      } else {
        toast.success("Checked in successfully");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error checking in (location / geo-fence).";
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) {
      toast.error("User ID missing");
      return;
    }

    setChecking(true);
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      const res = await api.post("/api/attendance/check-out", {
        employee_id: employeeId,
        device_latitude: latitude,
        device_longitude: longitude,
      });

      setTodayRecord(res.data);
      fetchAttendance();
      toast.success("Checked out successfully");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Error checking out (location / geo-fence).";
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const canCheckIn = !todayRecord || !todayRecord.clock_in_time;
  const canCheckOut =
    todayRecord && todayRecord.clock_in_time && !todayRecord.clock_out_time;

  // ---------- Summary cards ----------
  const summary = useMemo(() => {
    let present = 0,
      absent = 0,
      late = 0,
      wfh = 0;

    attendance.forEach((a) => {
      if (a.status === "PRESENT") present++;
      if (a.status === "ABSENT") absent++;
      if (a.is_late) late++;
      if (a.work_location === "REMOTE") wfh++;
    });

    return { present, absent, late, wfh };
  }, [attendance]);

  const todayStatusText = (() => {
    if (!todayRecord) return "Not checked in yet";

    if (todayRecord.status === "ABSENT") {
      if (todayRecord.clock_in_time) {
        return "Marked ABSENT due to repeated late check-ins.";
      }
      return "Marked ABSENT (no check-in).";
    }

    if (!todayRecord.clock_in_time) return "Not checked in";
    if (!todayRecord.clock_out_time)
      return `Checked in at ${formatTime(todayRecord.clock_in_time)}`;
    return `Worked ${todayRecord.total_hours || 0} hours today`;
  })();

  // ---------- CSV DOWNLOAD ----------
  const handleDownloadCsv = () => {
    if (!attendance || attendance.length === 0) {
      toast.info("No attendance data to export. Please apply filter first.");
      return;
    }

    const headers = [
      "Date",
      "Employee Name",
      "Employee Code",
      "Status",
      "Location",
      "Late",
      "Check-In Time",
      "Check-Out Time",
      "Total Hours",
    ];

    const rows = attendance.map((a) => {
      const date = formatDate(a.attendance_date);
      const name = `${a.first_name || ""} ${a.last_name || ""}`.trim();
      const code = a.employee_code || "";
      const status = a.status || "";
      const location = a.work_location || "";
      const lateLabel = a.is_late ? "Late" : "On time";
      const checkIn = a.clock_in_time ? formatTime(a.clock_in_time) : "";
      const checkOut = a.clock_out_time ? formatTime(a.clock_out_time) : "";
      const totalHours =
        a.total_hours === null || a.total_hours === undefined
          ? ""
          : a.total_hours;

      return [
        date,
        name,
        code,
        status,
        location,
        lateLabel,
        checkIn,
        checkOut,
        totalHours,
      ]
        .map(toCsvValue)
        .join(",");
    });

    const csvContent = [headers.map(toCsvValue).join(","), ...rows].join("\n");

    const empLabel =
      filters.employee_code ||
      filters.employee_name ||
      user?.employee_code ||
      "all_employees";

    const fileName = `attendance_${empLabel}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------- UI ----------
  return (
    <div className="attendance-root">
      {/* HEADER */}
      <div className="attendance-header">
        <h1>Attendance</h1>
        <p>Track your daily working hours &amp; attendance history.</p>
      </div>

      {/* MAIN CARD */}
      <div className="attendance-card">
        {/* SUMMARY CARDS */}
        <div className="attendance-summary-grid">
          <div className="summary-card green">
            <div className="num">{summary.present}</div>
            <div className="title">Present</div>
            <div className="sub">Days</div>
          </div>

          <div className="summary-card orange">
            <div className="num">{summary.absent}</div>
            <div className="title">Absent</div>
            <div className="sub">Days</div>
          </div>

          <div className="summary-card red">
            <div className="num">{summary.late}</div>
            <div className="title">Late</div>
            <div className="sub">Days</div>
          </div>

          <div className="summary-card blue">
            <div className="num">{summary.wfh}</div>
            <div className="title">WFH</div>
            <div className="sub">Days</div>
          </div>
        </div>

        {/* ACTION BAR: CHECK-IN/OUT */}
        <div className="attendance-actions">
          <div className="actions-left">
            <button
              type="button"
              className="btn dark"
              disabled={!canCheckIn || checking}
              onClick={handleCheckIn}
            >
              {checking && canCheckIn ? "Checking location..." : "Check-In"}
            </button>

            <button
              type="button"
              className="btn gray"
              disabled={!canCheckOut || checking}
              onClick={handleCheckOut}
            >
              {checking && canCheckOut ? "Checking location..." : "Check-Out"}
            </button>
          </div>

          <div className="actions-status">
            <span className="status-label">Today:</span>{" "}
            <span className="status-text">{todayStatusText}</span>
          </div>
        </div>

        {/* DAILY REPORT + FILTERS */}
        <div className="report-box">
          <div className="report-header">
            <h3>Daily Attendance Report</h3>
          </div>

          {/* Filters */}
          <form className="report-filters" onSubmit={handleSearch}>
            <div className="filter-field">
              <label>From Date</label>
              <input
                type="date"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>

            <div className="filter-field">
              <label>To Date</label>
              <input
                type="date"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>

            {canSeeEmployeeFilters && (
              <>
                <div className="filter-field">
                  <label>Employee Code</label>
                  <input
                    type="text"
                    name="employee_code"
                    value={filters.employee_code}
                    onChange={handleFilterChange}
                  />
                </div>

                <div className="filter-field">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    name="employee_name"
                    value={filters.employee_name}
                    onChange={handleFilterChange}
                    placeholder="e.g. Ali or Ali Khan"
                  />
                </div>
              </>
            )}

            <div className="filter-actions">
              <button type="submit" className="btn dark">
                Apply Filter
              </button>
              <button
                type="button"
                className="btn gray"
                onClick={handleDownloadCsv}
                style={{ marginLeft: "8px" }}
              >
                Download CSV
              </button>
            </div>
          </form>

          {/* TABLE */}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Late</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="no-data">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id}>
                        <td>{formatDate(a.attendance_date)}</td>
                        <td>
                          {a.first_name} {a.last_name}
                        </td>
                        <td>{a.employee_code}</td>
                        <td>{a.status}</td>
                        <td>{a.work_location || "-"}</td>
                        <td className={a.is_late ? "late" : "ontime"}>
                          {a.is_late ? "Late" : "On time"}
                        </td>
                        <td>
                          {a.clock_in_time ? formatTime(a.clock_in_time) : "-"}
                        </td>
                        <td>
                          {a.clock_out_time
                            ? formatTime(a.clock_out_time)
                            : "-"}
                        </td>
                        <td>{a.total_hours ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
