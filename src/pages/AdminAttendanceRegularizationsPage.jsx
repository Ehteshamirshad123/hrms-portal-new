// src/pages/AdminAttendanceRegularizationsPage.jsx
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

const AdminAttendanceRegularizationsPage = () => {
  const { user } = useAuth();

  const role = (user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isHR = role === "HR";
  const isManager = role === "MANAGER";

  // Sirf Admin / HR / Manager ko access
  if (!isAdmin && !isHR && !isManager) {
    return (
      <div className="areg-page">
        <div className="areg-header">
          <h1 className="areg-title">Attendance Corrections</h1>
          <p className="areg-subtitle">
            You are not authorized to view this page.
          </p>
        </div>
      </div>
    );
  }

  // Admin + HR → HR role, Manager → MANAGER role
  const myRoleForAction = isManager ? "MANAGER" : "HR";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [comment, setComment] = useState("");

  // Confirm modal state
  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null,
    status: null,
    label: "",
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/api/attendance/regularizations", { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error("❌ load regularizations", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error loading correction requests";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, user?.id]);

  // Actual API call (approve / reject)
  const handleAction = async (id, newStatus) => {
    try {
      await api.put(`/api/attendance/regularization/${id}/action`, {
        role: myRoleForAction, // 'MANAGER' or 'HR'
        approver_id: user.id,
        status: newStatus, // 'APPROVED' | 'REJECTED'
        comment: comment || null,
      });

      setComment("");
      toast.success(
        `Request ${newStatus === "APPROVED" ? "approved" : "rejected"}`
      );
      loadRequests();
    } catch (err) {
      console.error("❌ action regularization", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error updating request";
      toast.error(msg);
    }
  };

  const openConfirm = (row, newStatus) => {
    const employeeLabel = `${row.employee_code || ""} ${row.first_name || ""} ${
      row.last_name || ""
    }`.trim();
    const dateLabel = row.attendance_date
      ? formatDate(row.attendance_date)
      : "-";

    const label = `${
      newStatus === "APPROVED" ? "Approve" : "Reject"
    } correction for ${employeeLabel || "Employee"} on ${dateLabel}?`;

    setConfirmState({
      open: true,
      id: row.id,
      status: newStatus,
      label,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      id: null,
      status: null,
      label: "",
    });
  };

  const handleConfirmYes = async () => {
    if (!confirmState.id || !confirmState.status) {
      closeConfirm();
      return;
    }
    await handleAction(confirmState.id, confirmState.status);
    closeConfirm();
  };

  return (
    <div className="areg-page">
      {/* HEADER */}
      <div className="areg-header">
        <div>
          <h1 className="areg-title">Attendance Corrections</h1>
          <p className="areg-subtitle">
            Review and approve attendance correction requests from employees.
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="areg-card">
        <section className="areg-section">
          <div className="areg-section-header">
            <h2>Correction Requests</h2>
            <span className="areg-section-note">
              Only requests allowed by your role &amp; location are listed.
            </span>
          </div>

          {/* Filters row (status + comment) */}
          <div className="areg-admin-filters-row">
            <div className="areg-filter-group">
              <label>Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="areg-filter-input"
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="">All</option>
              </select>
            </div>

            <div className="areg-filter-group areg-filter-group--grow">
              <label>Comment (optional, used for next action)</label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="areg-comment-input"
                placeholder="Add a note for approve/reject (optional)..."
              />
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <p>Loading requests...</p>
          ) : (
            <div className="areg-table-wrapper">
              <table className="areg-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Location</th>
                    <th>Current Time</th>
                    <th>Requested Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="areg-no-data">
                        No correction requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => {
                      const employeeName = `${r.first_name || ""} ${
                        r.last_name || ""
                      }`.trim();
                      const currentTimeLabel = `${
                        r.clock_in_time ? formatTime(r.clock_in_time) : "—"
                      } / ${
                        r.clock_out_time ? formatTime(r.clock_out_time) : "—"
                      }`;

                      const requestedTimeLabel = `${
                        r.requested_clock_in
                          ? formatTime(r.requested_clock_in)
                          : "—"
                      } / ${
                        r.requested_clock_out
                          ? formatTime(r.requested_clock_out)
                          : "—"
                      }`;

                      return (
                        <tr key={r.id}>
                          <td>{formatDate(r.attendance_date)}</td>
                          <td>
                            <div className="areg-emp-cell">
                              <div className="areg-emp-name">
                                {employeeName || "-"}
                              </div>
                              <div className="areg-emp-code">
                                {r.employee_code || ""}
                              </div>
                            </div>
                          </td>
                          <td>{r.location_country || "-"}</td>
                          <td>{currentTimeLabel}</td>
                          <td>{requestedTimeLabel}</td>
                          <td>
                            <div
                              className="areg-reason-cell"
                              title={r.reason || ""}
                            >
                              {r.reason || "-"}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`areg-status-pill status-${(
                                r.status || ""
                              ).toLowerCase()}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === "PENDING" ? (
                              <div className="areg-actions">
                                <button
                                  type="button"
                                  className="areg-btn areg-btn-primary areg-btn-sm"
                                  onClick={() => openConfirm(r, "APPROVED")}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="areg-btn areg-btn-danger areg-btn-sm"
                                  onClick={() => openConfirm(r, "REJECTED")}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="areg-status-small">
                                {r.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation modal */}
      {confirmState.open && (
        <div className="areg-modal-backdrop" onClick={closeConfirm}>
          <div
            className="areg-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="areg-modal-header">
              <h3>Are you sure?</h3>
              <button
                type="button"
                className="areg-modal-close"
                onClick={closeConfirm}
              >
                ×
              </button>
            </div>
            <p>{confirmState.label}</p>
            <p className="areg-confirm-note">
              This will set the request status to{" "}
              <strong>{confirmState.status}</strong>
              {confirmState.status === "APPROVED"
                ? " and update attendance accordingly."
                : "."}
            </p>
            <div className="areg-form-actions">
              <button
                type="button"
                className="areg-btn areg-btn-light"
                onClick={closeConfirm}
              >
                No, cancel
              </button>
              <button
                type="button"
                className="areg-btn areg-btn-primary"
                onClick={handleConfirmYes}
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceRegularizationsPage;
