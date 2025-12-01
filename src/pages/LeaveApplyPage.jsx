// src/pages/LeaveApplyPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/LeavePage.css";
import { toast } from "react-toastify";

// --- Helpers ---
const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

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
      return "0.5*";
    }
    return 0.5;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = e.getTime() - s.getTime();
  if (diffMs < 0) return "";
  const diffDays = diffMs / msPerDay + 1; // inclusive
  return Math.round(diffDays * 2) / 2;
};

const LeaveApplyPage = () => {
  const { user } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    is_half_day: false,
    half_day_session: "FIRST_HALF",
    reason: "",
    contact_details_during_leave: "",
  });

  // ✅ field-level errors (red text under fields)
  const [errors, setErrors] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

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

  // -------- API calls --------
  const fetchLeaveTypes = async () => {
    try {
      const res = await api.get("/api/leaves/types");
      setLeaveTypes(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching leave types"); // ✅ alert → toast
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

  const fetchMyRequests = async () => {
    if (!user?.id) return;
    setLoadingSummary(true);
    try {
      const res = await api.get("/api/leaves/requests", {
        params: { employee_id: user.id },
      });
      setMyRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
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

  // -------- Handlers --------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // ✅ error clear karein jab user field mein type kare
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("User information not available"); // ✅ alert → toast
      return;
    }

    // ✅ Required fields validation
    const newErrors = {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    };

    if (!form.leave_type_id) {
      newErrors.leave_type_id = "Leave type is required";
    }
    if (!form.start_date) {
      newErrors.start_date = "Start date is required";
    }
    if (!form.end_date) {
      newErrors.end_date = "End date is required";
    }
    if (!form.reason.trim()) {
      newErrors.reason = "Reason is required";
    }

    const hasFieldErrors = Object.values(newErrors).some((v) => v);
    if (hasFieldErrors) {
      setErrors(newErrors);
      toast.error("Please fill all required fields."); // ✅ global toast
      return;
    }

    // ✅ WFH 3 days rule (still toast)
    if (
      selectedLeaveType?.code === "WFH" &&
      typeof computedDays === "number" &&
      computedDays > 3
    ) {
      toast.error("Work From Home max 3 days per request.");
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

      toast.success("Leave request submitted"); // ✅ success toast

      setForm({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        is_half_day: false,
        half_day_session: "FIRST_HALF",
        reason: "",
        contact_details_during_leave: "",
      });
      setErrors({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
      });

      fetchMyRequests();
      fetchBalances();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error submitting leave request";
      toast.error(msg); // ✅ alert → toast
    } finally {
      setLoadingSubmit(false);
    }
  };

  // -------- UI --------
  return (
    <div className="leave-page-root">
      {/* Header in blue strip */}
      <div className="leave-page-header">
        <h1>Apply Leave</h1>
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

        {/* Apply for Leave form only */}
        <section className="leave-section">
          <h3 className="leave-section-title">Apply for Leave</h3>

          {loadingSummary && (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Loading balances / stats...
            </p>
          )}

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
              <label>Leave Type *</label>
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
              {errors.leave_type_id && (
                <p className="error-text">{errors.leave_type_id}</p>
              )}
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
              <label>Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
              />
              {errors.start_date && (
                <p className="error-text">{errors.start_date}</p>
              )}
            </div>

            {/* End date */}
            <div className="leave-form-field">
              <label>End Date *</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
              />
              {errors.end_date && (
                <p className="error-text">{errors.end_date}</p>
              )}
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
              <label>Reason *</label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={3}
              />
              {errors.reason && <p className="error-text">{errors.reason}</p>}
            </div>

            {/* Submit button */}
            <div className="leave-form-actions">
              <button type="submit" disabled={loadingSubmit}>
                {loadingSubmit ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LeaveApplyPage;
