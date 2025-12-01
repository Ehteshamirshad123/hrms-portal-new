// src/pages/LeaveStatusPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/LeavePage.css";
import { toast } from "react-toastify";

const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

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

const LeaveStatusPage = () => {
  const { user } = useAuth();

  const [myRequests, setMyRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [loading, setLoading] = useState(false);

  // edit modal state
  const [editingRequest, setEditingRequest] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // NEW: stats – total, annual, sick
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let declined = 0;

    myRequests.forEach((r) => {
      if (r.status === "PENDING") pending += 1;
      else if (r.status === "APPROVED") approved += 1;
      else if (r.status === "REJECTED") declined += 1;
    });

    let totalBalance = 0;
    let annualBalance = 0;
    let sickBalance = 0;

    balances.forEach((b) => {
      const available =
        num(b.opening_balance_days) +
        num(b.accrued_days) +
        num(b.carry_forward_days) -
        num(b.used_days);

      if (b.code === "AL") {
        annualBalance = Math.round(available * 100) / 100;
      } else if (b.code === "SL") {
        sickBalance = Math.round(available * 100) / 100;
      }

      if (!Number.isNaN(available)) {
        totalBalance += available;
      }
    });

    totalBalance = Math.round(totalBalance * 100) / 100;

    return {
      totalBalance: totalBalance || 0,
      annualBalance: annualBalance || 0,
      sickBalance: sickBalance || 0,
      pending,
      approved,
      declined,
    };
  }, [myRequests, balances]);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get("/api/leaves/types");
      setLeaveTypes(res.data || []);
    } catch (err) {
      console.error(err);
      // optional: toast.error("Error loading leave types");
    }
  };

  const fetchBalances = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/api/leaves/balance/${user.id}`);
      setBalances(res.data || []);
    } catch (err) {
      console.error(err);
      // optional: toast.error("Error loading leave balances");
    }
  };

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get("/api/leaves/requests", {
        params: { employee_id: user.id },
      });
      setMyRequests(res.data || []);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error fetching your leave requests";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchBalances();
    fetchMyRequests();
  }, [user]);

  const getLeaveTypeLabel = (r) => {
    const match = leaveTypes.find((lt) => lt.id === r.leave_type_id);
    if (match) return `${match.code} - ${match.name}`;
    return r.code || r.leave_type_name || r.leave_type_id;
  };

  // ---- Edit handlers ----
  const openEdit = (r) => {
    if (r.status !== "PENDING") return;
    setEditingRequest({
      id: r.id,
      leave_type_id: r.leave_type_id,
      start_date: r.start_date?.slice(0, 10) || "",
      end_date: r.end_date?.slice(0, 10) || "",
      is_half_day: !!r.is_half_day,
      half_day_session: r.half_day_session || "FIRST_HALF",
      reason: r.reason || "",
      contact_details_during_leave: r.contact_details_during_leave || "",
    });
  };

  const closeEdit = () => {
    setEditingRequest(null);
    setSavingEdit(false);
  };

  const handleEditChange = (e) => {
    if (!editingRequest) return;
    const { name, value, type, checked } = e.target;
    setEditingRequest((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;

    // sirf pending edit honi chahiye – safety check
    const original = myRequests.find((r) => r.id === editingRequest.id);
    if (!original || original.status !== "PENDING") {
      toast.error("Only pending requests can be edited.");
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/api/leaves/requests/${editingRequest.id}`, {
        leave_type_id: Number(editingRequest.leave_type_id),
        start_date: editingRequest.start_date,
        end_date: editingRequest.end_date,
        is_half_day: editingRequest.is_half_day,
        half_day_session: editingRequest.is_half_day
          ? editingRequest.half_day_session
          : null,
        reason: editingRequest.reason,
        contact_details_during_leave:
          editingRequest.contact_details_during_leave || null,
      });

      toast.success("Leave request updated");
      closeEdit();
      fetchMyRequests();
      fetchBalances();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error updating leave request";
      toast.error(msg);
      setSavingEdit(false);
    }
  };

  // ---- UI ----
  return (
    <div className="leave-page-root">
      {/* Header in blue strip */}
      <div className="leave-page-header">
        <h1>My Leave Status</h1>
      </div>

      {/* Main card */}
      <div className="leave-page-card">
        {/* Summary cards row */}
        <div className="leave-summary-grid">
          <div className="leave-summary-card leave-summary-card--balance">
            <div className="leave-summary-card-number">
              {stats.totalBalance || 0}
            </div>
            <div className="leave-summary-card-title">Total Leave</div>
            <div className="leave-summary-card-subtitle">
              Annual: {stats.annualBalance || 0} | Sick:{" "}
              {stats.sickBalance || 0}
            </div>
          </div>

          <div className="leave-summary-card leave-summary-card--pending">
            <div className="leave-summary-card-number">
              {stats.pending || 0}
            </div>
            <div className="leave-summary-card-title">Pending</div>
            <div className="leave-summary-card-subtitle">Requests</div>
          </div>

          <div className="leave-summary-card leave-summary-card--approved">
            <div className="leave-summary-card-number">
              {stats.approved || 0}
            </div>
            <div className="leave-summary-card-title">Approved</div>
            <div className="leave-summary-card-subtitle">Requests</div>
          </div>

          <div className="leave-summary-card leave-summary-card--declined">
            <div className="leave-summary-card-number">
              {stats.declined || 0}
            </div>
            <div className="leave-summary-card-title">Declined</div>
            <div className="leave-summary-card-subtitle">Requests</div>
          </div>
        </div>

        {/* My Leave Requests table */}
        <section className="leave-section">
          <h3 className="leave-section-title">My Leave Requests</h3>

          <div className="leave-table-wrapper">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="leave-table-empty">
                        No leave requests yet.
                      </td>
                    </tr>
                  ) : (
                    myRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{getLeaveTypeLabel(r)}</td>
                        <td>
                          {formatDate(r.start_date)} → {formatDate(r.end_date)}
                        </td>
                        <td>{r.total_days}</td>
                        <td>{r.status}</td>
                        <td>
                          {r.status === "PENDING" ? (
                            <button
                              className="leave-btn leave-btn--approve"
                              onClick={() => openEdit(r)}
                            >
                              Edit
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              Not editable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* EDIT MODAL – sirf jab editingRequest set ho */}
      {editingRequest && (
        <div className="leave-edit-backdrop" onClick={closeEdit}>
          <div
            className="leave-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="leave-edit-header">
              <h3>Edit Leave Request #{editingRequest.id}</h3>
              <button
                type="button"
                className="leave-edit-close"
                onClick={closeEdit}
              >
                ×
              </button>
            </div>

            <form className="leave-form-grid" onSubmit={handleEditSubmit}>
              {/* Leave type */}
              <div className="leave-form-field">
                <label>Leave Type</label>
                <select
                  name="leave_type_id"
                  value={editingRequest.leave_type_id}
                  onChange={handleEditChange}
                >
                  <option value="">Select</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.code} - {lt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start date */}
              <div className="leave-form-field">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={editingRequest.start_date}
                  onChange={handleEditChange}
                />
              </div>

              {/* End date */}
              <div className="leave-form-field">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={editingRequest.end_date}
                  onChange={handleEditChange}
                />
              </div>

              {/* Half day + session */}
              <div className="leave-form-field">
                <label className="leave-halfday-label">
                  <input
                    type="checkbox"
                    name="is_half_day"
                    checked={editingRequest.is_half_day}
                    onChange={handleEditChange}
                  />
                  Half Day
                </label>
                {editingRequest.is_half_day && (
                  <select
                    name="half_day_session"
                    value={editingRequest.half_day_session}
                    onChange={handleEditChange}
                  >
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                  </select>
                )}
              </div>

              {/* Contact details */}
              <div className="leave-form-field leave-form-field--fullwidth">
                <label>Contact details during leave (optional)</label>
                <input
                  type="text"
                  name="contact_details_during_leave"
                  value={editingRequest.contact_details_during_leave}
                  onChange={handleEditChange}
                />
              </div>

              {/* Reason */}
              <div className="leave-form-field leave-form-field--fullwidth">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={editingRequest.reason}
                  onChange={handleEditChange}
                  rows={3}
                />
              </div>

              <div className="leave-form-actions">
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveStatusPage;
