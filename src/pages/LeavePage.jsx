// src/pages/LeavePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/LeavePage.css";

// --- Helpers ---
const calcTotalDays = (startDate, endDate, isHalfDay) => {
  if (!startDate || !endDate) return "";
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";

  if (isHalfDay) {
    if (
      s.getFullYear() !== e.getFullYear() ||
      s.getMonth() !== e.getMonth() ||
      s.getDate() !== e.getDate()
    ) {
      return "0.5*"; // user ko idea, backend phir bhi reject karega
    }
    return 0.5;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return "";
  const diffDays = diffMs / msPerDay + 1; // inclusive
  return Math.round(diffDays * 2) / 2;
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

const LeavePage = () => {
  const { user } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [managerPending, setManagerPending] = useState([]);
  const [hrPending, setHrPending] = useState([]);
  const [balances, setBalances] = useState([]);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    is_half_day: false,
    half_day_session: "FIRST_HALF",
    reason: "",
    contact_details_during_leave: "",
  });

  const [comment, setComment] = useState("");

  // -------- Derived values --------
  const computedDays = useMemo(
    () => calcTotalDays(form.start_date, form.end_date, form.is_half_day),
    [form.start_date, form.end_date, form.is_half_day]
  );

  const selectedLeaveType = useMemo(
    () =>
      leaveTypes.find((lt) => String(lt.id) === String(form.leave_type_id)) ||
      null,
    [leaveTypes, form.leave_type_id]
  );

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
    balances.forEach((b) => {
      const available =
        (b.opening_balance_days || 0) +
        (b.accrued_days || 0) +
        (b.carry_forward_days || 0) -
        (b.used_days || 0);
      totalBalance += available;
    });

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      pending,
      approved,
      declined,
    };
  }, [myRequests, balances]);

  // -------- API calls --------
  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get("/api/leaves/types");
      setLeaveTypes(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching leave types");
    }
  };

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoadingTables(true);
    try {
      const res = await api.get("/api/leaves/requests", {
        params: { employee_id: user.id },
      });
      setMyRequests(res.data);
    } catch (err) {
      console.error("fetchMyRequests error:", err);
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Error fetching your leave requests"
      );
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchManagerPending = async () => {
    if (!user?.id) return;
    if (!(user.role === "MANAGER" || user.role === "ADMIN")) return;
    try {
      const res = await api.get("/api/leaves/requests", {
        params: { view: "manager", approver_id: user.id },
      });
      setManagerPending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHrPending = async () => {
    if (!(user?.role === "HR" || user?.role === "ADMIN")) return;
    try {
      const res = await api.get("/api/leaves/requests", {
        params: { view: "hr" },
      });
      setHrPending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBalances = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/api/leaves/balance/${user.id}`);
      setBalances(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMyRequests();
    fetchManagerPending();
    fetchHrPending();
    fetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // -------- Handlers --------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      alert("User information not available");
      return;
    }

    if (
      selectedLeaveType?.code === "WFH" &&
      typeof computedDays === "number" &&
      computedDays > 3
    ) {
      alert("Work From Home can be requested for maximum 3 days per request.");
      return;
    }

    if (
      !form.leave_type_id ||
      !form.start_date ||
      !form.end_date ||
      !form.reason
    ) {
      alert("Please fill all required fields.");
      return;
    }

    setLoadingSubmit(true);
    try {
      await api.post("/api/leaves/requests", {
        employee_id: user.id,
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        is_half_day: form.is_half_day,
        half_day_session: form.is_half_day ? form.half_day_session : null,
        reason: form.reason,
        contact_details_during_leave: form.contact_details_during_leave || null,
      });

      alert("Leave request submitted");
      setForm({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        is_half_day: false,
        half_day_session: "FIRST_HALF",
        reason: "",
        contact_details_during_leave: "",
      });
      setComment("");
      await fetchMyRequests();
      await fetchManagerPending();
      await fetchHrPending();
      await fetchBalances();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Error submitting leave request"
      );
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleAction = async (id, role, actionType) => {
    if (
      !window.confirm(
        `Are you sure you want to ${actionType.toLowerCase()} this request?`
      )
    ) {
      return;
    }
    try {
      await api.put(`/api/leaves/requests/${id}/action`, {
        role, // 'MANAGER' or 'HR'
        approver_id: user.id,
        action: actionType, // 'APPROVE' | 'REJECT'
        comment: comment || null,
      });
      setComment("");
      await fetchMyRequests();
      await fetchManagerPending();
      await fetchHrPending();
      await fetchBalances();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Error updating request"
      );
    }
  };

  // -------- UI --------
  return (
    <div className="leave-page-root">
      {/* Header in blue strip */}
      <div className="leave-page-header">
        <h1>Leaves</h1>
        <p>
          Apply for leave and track approvals. Logged in as{" "}
          <strong>{user?.employee_code}</strong> ({user?.role}).
        </p>
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
            <div className="leave-summary-card-subtitle">Balance (days)</div>
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

        {/* Apply for Leave */}
        <section className="leave-section">
          <h3 className="leave-section-title">Apply for Leave</h3>

          <form className="leave-form-grid" onSubmit={handleSubmit}>
            {/* Employee readonly */}
            <div className="leave-form-field">
              <label>Employee</label>
              <input
                type="text"
                value={
                  user
                    ? `${user.employee_code || ""} ${user.name || ""}`.trim()
                    : ""
                }
                readOnly
              />
            </div>

            {/* Leave type */}
            <div className="leave-form-field">
              <label>Leave Type</label>
              <select
                name="leave_type_id"
                value={form.leave_type_id}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.code} - {lt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Days (auto) */}
            <div className="leave-form-field">
              <label>Total Days (auto)</label>
              <input
                type="text"
                value={computedDays === "" ? "" : computedDays}
                placeholder="Auto"
                readOnly
              />
            </div>

            {/* Start date */}
            <div className="leave-form-field">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
            </div>

            {/* End date */}
            <div className="leave-form-field">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
            </div>

            {/* Half day + session */}
            <div className="leave-form-field">
              <label className="leave-halfday-label">
                <input
                  type="checkbox"
                  name="is_half_day"
                  checked={form.is_half_day}
                  onChange={handleChange}
                />
                Half Day
              </label>
              {form.is_half_day && (
                <select
                  name="half_day_session"
                  value={form.half_day_session}
                  onChange={handleChange}
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
                value={form.contact_details_during_leave}
                onChange={handleChange}
              />
            </div>

            {/* Reason */}
            <div className="leave-form-field leave-form-field--fullwidth">
              <label>Reason</label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Submit button */}
            <div className="leave-form-actions">
              <button type="submit" disabled={loadingSubmit}>
                {loadingSubmit ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        </section>

        {/* My Leave Requests */}
        <section className="leave-section">
          <h3 className="leave-section-title">My Leave Requests</h3>

          <div className="leave-table-wrapper">
            {loadingTables ? (
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
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="leave-table-empty">
                        No leave requests yet.
                      </td>
                    </tr>
                  ) : (
                    myRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>
                          {r.code || r.leave_type_name || r.leave_type_id}
                        </td>
                        <td>
                          {formatDate(r.start_date)} → {formatDate(r.end_date)}
                        </td>
                        <td>{r.total_days}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Manager approvals */}
        {(user?.role === "MANAGER" || user?.role === "ADMIN") && (
          <section className="leave-section">
            <h3 className="leave-section-title">Manager Approvals</h3>
            <p className="leave-section-help">
              Requests from your team members.
            </p>

            <div className="leave-table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {managerPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="leave-table-empty">
                        No pending requests for manager.
                      </td>
                    </tr>
                  ) : (
                    managerPending.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>
                          {r.employee_code} {r.first_name} {r.last_name}
                        </td>
                        <td>
                          {r.code || r.leave_type_name || r.leave_type_id}
                        </td>
                        <td>
                          {formatDate(r.start_date)} → {formatDate(r.end_date)}
                        </td>
                        <td>{r.total_days}</td>
                        <td>{r.status}</td>
                        <td>
                          <button
                            className="leave-btn leave-btn--approve"
                            onClick={() =>
                              handleAction(r.id, "MANAGER", "APPROVE")
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="leave-btn leave-btn--reject"
                            onClick={() =>
                              handleAction(r.id, "MANAGER", "REJECT")
                            }
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* HR approvals */}
        {(user?.role === "HR" || user?.role === "ADMIN") && (
          <section className="leave-section">
            <h3 className="leave-section-title">HR Approvals</h3>
            <p className="leave-section-help">
              Requests escalated to HR for final decision.
            </p>

            <div className="leave-comment-box">
              <label>Comment (optional, used for next action)</label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="leave-table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hrPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="leave-table-empty">
                        No pending requests for HR.
                      </td>
                    </tr>
                  ) : (
                    hrPending.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>
                          {r.employee_code} {r.first_name} {r.last_name}
                        </td>
                        <td>
                          {r.code || r.leave_type_name || r.leave_type_id}
                        </td>
                        <td>
                          {formatDate(r.start_date)} → {formatDate(r.end_date)}
                        </td>
                        <td>{r.total_days}</td>
                        <td>{r.status}</td>
                        <td>
                          <button
                            className="leave-btn leave-btn--approve"
                            onClick={() => handleAction(r.id, "HR", "APPROVE")}
                          >
                            Approve
                          </button>
                          <button
                            className="leave-btn leave-btn--reject"
                            onClick={() => handleAction(r.id, "HR", "REJECT")}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default LeavePage;
