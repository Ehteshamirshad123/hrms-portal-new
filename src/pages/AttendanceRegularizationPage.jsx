// src/pages/AttendanceRegularizationPage.jsx
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

const AttendanceRegularizationPage = () => {
  const { user } = useAuth();
  const employeeId = user?.id;

  const [recentAttendance, setRecentAttendance] = useState([]);

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState({
    requested_clock_in: "",
    requested_clock_out: "",
    reason: "",
  });

  // ✅ field-level errors (reason required)
  const [errors, setErrors] = useState({
    reason: "",
  });

  /* ---------- FILTERS: Last 30 days attendance ---------- */
  const [attFilters, setAttFilters] = useState({
    date_from: "",
    date_to: "",
  });

  const handleAttFilterChange = (e) => {
    const { name, value } = e.target;
    setAttFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttFilterSubmit = (e) => {
    e.preventDefault();
    loadRecentAttendance(attFilters);
  };

  const handleAttFilterClear = () => {
    const { from, to } = getDefaultRange30();
    const next = { date_from: from, date_to: to };
    setAttFilters(next);
    loadRecentAttendance(next);
  };

  // ---------- Helpers ----------
  const toDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDefaultRange30 = () => {
    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - 30);
    return { from: toDateString(from), to: toDateString(today) };
  };

  // ---------- Load attendance ----------
  const loadRecentAttendance = async (overrideFilters) => {
    if (!employeeId) return;
    setLoadingAttendance(true);
    try {
      const f = overrideFilters || attFilters;
      let { date_from, date_to } = f;

      if (!date_from || !date_to) {
        const def = getDefaultRange30();
        date_from = def.from;
        date_to = def.to;
      }

      const params = { date_from, date_to };

      const res = await api.get("/api/attendance", { params });
      setRecentAttendance(res.data || []);
    } catch (err) {
      console.error(
        "❌ loadRecentAttendance error",
        err.response?.status,
        err.response?.data || err.message
      );
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        `Error loading attendance (status ${err.response?.status || "?"})`;
      toast.error(msg); // ✅ alert → toast
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (!employeeId) return;
    const def = getDefaultRange30();
    const nextAtt = { date_from: def.from, date_to: def.to };
    setAttFilters(nextAtt);
    loadRecentAttendance(nextAtt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // ---------- Modal handling ----------
  const openModal = (record) => {
    let inTime = "";
    let outTime = "";

    if (record.clock_in_time) {
      const dt = new Date(record.clock_in_time);
      if (!Number.isNaN(dt.getTime())) {
        inTime = dt.toTimeString().slice(0, 5);
      }
    }

    if (record.clock_out_time) {
      const dt = new Date(record.clock_out_time);
      if (!Number.isNaN(dt.getTime())) {
        outTime = dt.toTimeString().slice(0, 5);
      }
    }

    setSelectedRecord(record);
    setForm({
      requested_clock_in: inTime,
      requested_clock_out: outTime,
      reason: "",
    });
    setErrors({ reason: "" }); // clear old errors
  };

  const closeModal = () => {
    setSelectedRecord(null);
    setForm({
      requested_clock_in: "",
      requested_clock_out: "",
      reason: "",
    });
    setErrors({ reason: "" });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // ✅ clear error when user types
    if (name === "reason" && value.trim()) {
      setErrors((prev) => ({ ...prev, reason: "" }));
    }
  };

  // ---------- Submit regularization ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !employeeId) return;

    // ✅ validation: reason required, show under field (no alert)
    if (!form.reason.trim()) {
      setErrors((prev) => ({
        ...prev,
        reason: "Reason is required",
      }));
      return;
    }

    let dateStr =
      (selectedRecord.attendance_date &&
        selectedRecord.attendance_date.toString().slice(0, 10)) ||
      (selectedRecord.attendance_date &&
        selectedRecord.attendance_date.slice?.(0, 10)) ||
      null;

    if (!dateStr && selectedRecord.clock_in_time) {
      dateStr = selectedRecord.clock_in_time.toString().slice(0, 10);
    }

    const requested_clock_in =
      form.requested_clock_in && dateStr
        ? `${dateStr}T${form.requested_clock_in}:00`
        : null;

    const requested_clock_out =
      form.requested_clock_out && dateStr
        ? `${dateStr}T${form.requested_clock_out}:00`
        : null;

    const payload = {
      employee_id: employeeId,
      attendance_record_id: selectedRecord.id,
      original_clock_in: selectedRecord.clock_in_time || null,
      original_clock_out: selectedRecord.clock_out_time || null,
      requested_clock_in,
      requested_clock_out,
      reason: form.reason.trim(),
    };

    setSaving(true);
    try {
      await api.post("/api/attendance/regularization", payload);
      toast.success("Correction request submitted."); // ✅ alert → toast
      closeModal();
      // Status list ab alag page par hai, isliye yahan se reload nahi karna
    } catch (err) {
      console.error(
        "❌ submit regularization error",
        err.response?.status,
        err.response?.data || err.message
      );
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error submitting request";
      toast.error(msg); // ✅ alert → toast
    } finally {
      setSaving(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="areg-page">
      {/* HEADER */}
      <div className="areg-header">
        <div>
          <h1 className="areg-title">Attendance Correction</h1>
          <p className="areg-subtitle">
            Request a correction if your check-in or check-out time was recorded
            incorrectly.
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="areg-card">
        {/* SECTION: Last 30 days attendance */}
        <section className="areg-section">
          <div className="areg-section-header">
            <h2>Last 30 days attendance</h2>
            <span className="areg-section-note">
              Check your recent attendance. You can change the date range below.
            </span>
          </div>

          {/* Filters */}
          <form
            className="areg-filters areg-filters--compact"
            onSubmit={handleAttFilterSubmit}
          >
            <div className="areg-filter-group">
              <label>From Date</label>
              <input
                type="date"
                name="date_from"
                value={attFilters.date_from}
                onChange={handleAttFilterChange}
                className="areg-filter-input"
              />
            </div>

            <div className="areg-filter-group">
              <label>To Date</label>
              <input
                type="date"
                name="date_to"
                value={attFilters.date_to}
                onChange={handleAttFilterChange}
                className="areg-filter-input"
              />
            </div>

            <div className="areg-filter-actions">
              <button type="submit" className="areg-btn areg-btn-primary">
                Apply Filter
              </button>
              <button
                type="button"
                className="areg-btn areg-btn-light areg-filter-clear"
                onClick={handleAttFilterClear}
              >
                Last 30 Days
              </button>
            </div>
          </form>

          {loadingAttendance ? (
            <p>Loading attendance...</p>
          ) : (
            <div className="areg-table-wrapper">
              <table className="areg-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Total Hours</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="areg-no-data">
                        No attendance records found.
                      </td>
                    </tr>
                  ) : (
                    recentAttendance.map((a) => (
                      <tr key={a.id}>
                        <td>{formatDate(a.attendance_date)}</td>
                        <td>{a.status}</td>
                        <td>{a.work_location || "-"}</td>
                        <td>
                          {a.clock_in_time ? formatTime(a.clock_in_time) : "-"}
                        </td>
                        <td>
                          {a.clock_out_time
                            ? formatTime(a.clock_out_time)
                            : "-"}
                        </td>
                        <td>{a.total_hours ?? "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="areg-btn areg-btn-outline"
                            onClick={() => openModal(a)}
                          >
                            Request Correction
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: Request Correction */}
      {selectedRecord && (
        <div className="areg-modal-backdrop" onClick={closeModal}>
          <div className="areg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="areg-modal-header">
              <h3>Request Correction</h3>
              <button
                type="button"
                className="areg-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <p className="areg-modal-summary">
              <strong>{formatDate(selectedRecord.attendance_date)}</strong> –{" "}
              current:{" "}
              <strong>
                {selectedRecord.clock_in_time
                  ? formatTime(selectedRecord.clock_in_time)
                  : "—"}{" "}
                /{" "}
                {selectedRecord.clock_out_time
                  ? formatTime(selectedRecord.clock_out_time)
                  : "—"}
              </strong>
            </p>

            <form className="areg-form" onSubmit={handleSubmit}>
              <div className="areg-form-group">
                <label>Requested Check-in</label>
                <input
                  type="time"
                  name="requested_clock_in"
                  value={form.requested_clock_in}
                  onChange={handleFormChange}
                />
              </div>
              <div className="areg-form-group">
                <label>Requested Check-out</label>
                <input
                  type="time"
                  name="requested_clock_out"
                  value={form.requested_clock_out}
                  onChange={handleFormChange}
                />
              </div>

              <div className="areg-form-group areg-form-group--full">
                <label>Reason for correction *</label>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Briefly describe why you need this correction..."
                  value={form.reason}
                  onChange={handleFormChange}
                />
                {/* ✅ error message directly under field */}
                {errors.reason && <p className="error-text">{errors.reason}</p>}
              </div>

              <div className="areg-form-actions">
                <button
                  type="button"
                  className="areg-btn areg-btn-light"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="areg-btn areg-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceRegularizationPage;
