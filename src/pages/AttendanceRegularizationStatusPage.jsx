// src/pages/AttendanceRegularizationStatusPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/AttendanceRegularizationPage.css";
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

const AttendanceRegularizationStatusPage = () => {
  const { user } = useAuth();
  const employeeId = user?.id;

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  /* ---------- FILTERS: My correction requests ---------- */
  const [reqFilters, setReqFilters] = useState({
    date_from: "",
    date_to: "",
    status: "ALL",
  });

  const handleReqFilterChange = (e) => {
    const { name, value } = e.target;
    setReqFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReqFilterClear = () => {
    const next = {
      date_from: "",
      date_to: "",
      status: "ALL",
    };
    setReqFilters(next);
    loadRequests(next);
  };

  const handleReqFilterSubmit = (e) => {
    e.preventDefault();
    loadRequests(reqFilters);
  };

  const loadRequests = async (overrideFilters) => {
    if (!employeeId) return;
    setLoadingRequests(true);
    try {
      const f = overrideFilters || reqFilters;

      const params = {
        date_from: f.date_from || undefined,
        date_to: f.date_to || undefined,
        status: f.status !== "ALL" ? f.status : undefined,
      };

      const res = await api.get("/api/attendance/regularizations", { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error(
        "❌ loadRequests error",
        err.response?.status,
        err.response?.data || err.message
      );
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        `Error loading requests (status ${err.response?.status || "?"})`;
      toast.error(msg); // ✅ alert → toast
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!employeeId) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  return (
    <div className="areg-page">
      <div className="areg-header">
        <div>
          <h1 className="areg-title">Attendance Correction Status</h1>
          <p className="areg-subtitle">
            View the status of all your attendance correction requests.
          </p>
        </div>
      </div>

      <div className="areg-card">
        <section className="areg-section">
          <div className="areg-section-header">
            <h2>My correction requests</h2>
          </div>

          {/* Filters for requests */}
          <form className="areg-filters" onSubmit={handleReqFilterSubmit}>
            <div className="areg-filter-group">
              <label>From Date</label>
              <input
                type="date"
                name="date_from"
                value={reqFilters.date_from}
                onChange={handleReqFilterChange}
                className="areg-filter-input"
              />
            </div>

            <div className="areg-filter-group">
              <label>To Date</label>
              <input
                type="date"
                name="date_to"
                value={reqFilters.date_to}
                onChange={handleReqFilterChange}
                className="areg-filter-input"
              />
            </div>

            <div className="areg-filter-group">
              <label>Status</label>
              <select
                name="status"
                value={reqFilters.status}
                onChange={handleReqFilterChange}
                className="areg-filter-select"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="areg-filter-actions">
              <button type="submit" className="areg-btn areg-btn-primary">
                Apply Filter
              </button>
              <button
                type="button"
                className="areg-btn areg-btn-light areg-filter-clear"
                onClick={handleReqFilterClear}
              >
                Clear
              </button>
            </div>
          </form>

          {loadingRequests ? (
            <p>Loading requests...</p>
          ) : (
            <div className="areg-table-wrapper">
              <table className="areg-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Original In</th>
                    <th>Original Out</th>
                    <th>Requested In</th>
                    <th>Requested Out</th>
                    <th>Status</th>
                    <th>Manager Comment</th>
                    <th>HR Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="areg-no-data">
                        No correction requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.attendance_date
                            ? formatDate(r.attendance_date)
                            : r.original_clock_in
                            ? formatDate(r.original_clock_in)
                            : "-"}
                        </td>
                        <td>
                          {r.original_clock_in
                            ? formatTime(r.original_clock_in)
                            : "-"}
                        </td>
                        <td>
                          {r.original_clock_out
                            ? formatTime(r.original_clock_out)
                            : "-"}
                        </td>
                        <td>
                          {r.requested_clock_in
                            ? formatTime(r.requested_clock_in)
                            : "-"}
                        </td>
                        <td>
                          {r.requested_clock_out
                            ? formatTime(r.requested_clock_out)
                            : "-"}
                        </td>
                        <td className={`areg-status areg-status-${r.status}`}>
                          {r.status || "PENDING"}
                        </td>
                        <td>{r.manager_comment || "-"}</td>
                        <td>{r.hr_comment || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AttendanceRegularizationStatusPage;
