// src/pages/WorkFromHomeRequestPage.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import "../styles/WorkFromHomeRequestPage.css";
import { toast } from "react-toastify";

const todayStr = () => new Date().toISOString().slice(0, 10);

const WorkFromHomeRequestPage = () => {
  const { user } = useAuth();

  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!reason.trim()) {
      toast.error("Please enter a reason for Work From Home.");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select both start and end date.");
      return;
    }

    const s = new Date(startDate);
    const eDate = new Date(endDate);

    if (Number.isNaN(s.getTime()) || Number.isNaN(eDate.getTime())) {
      toast.error("Invalid start or end date.");
      return;
    }

    if (eDate < s) {
      toast.error("End date cannot be before start date.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/wfh/request", {
        employee_id: user.id,
        // backward-compatible field (old API)
        request_date: startDate,
        // new range fields
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });

      toast.success("Work From Home request submitted to admin.");
      setReason("");
      setStartDate(todayStr());
      setEndDate(todayStr());
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Error submitting Work From Home request.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Simple total days info (inclusive)
  let totalDaysLabel = "";
  if (startDate && endDate) {
    const s = new Date(startDate);
    const eDate = new Date(endDate);
    if (
      !Number.isNaN(s.getTime()) &&
      !Number.isNaN(eDate.getTime()) &&
      eDate >= s
    ) {
      const diffMs = eDate.getTime() - s.getTime();
      const days = diffMs / (1000 * 60 * 60 * 24) + 1;
      totalDaysLabel = `${days} day${days > 1 ? "s" : ""}`;
    }
  }

  return (
    <div className="wfh-root">
      {/* PAGE HEADER */}
      <div className="wfh-header">
        <h1>Work From Home Request</h1>
        <p>
          Request approval to work remotely. Admin approval is required before
          you can check in from outside the office.
        </p>
      </div>

      {/* MAIN WHITE CARD */}
      <div className="wfh-card">
        <div className="wfh-section-header">
          <h3>Submit Request</h3>
          <p>
            Select start &amp; end date and provide a reason for working from
            home.
          </p>
        </div>

        <form className="wfh-form" onSubmit={handleSubmit}>
          <div className="wfh-form-row">
            <div className="wfh-form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="wfh-form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {totalDaysLabel && (
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
              Requested duration: <strong>{totalDaysLabel}</strong>
            </p>
          )}

          <div className="wfh-form-group wfh-form-group--full">
            <label>Reason *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need to work from home..."
            />
          </div>

          <div className="wfh-form-actions">
            <button type="submit" disabled={submitting} className="wfh-submit">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>

        <div className="wfh-divider" />

        <p className="wfh-note">
          You can view the status of your previous WFH requests on the{" "}
          <strong>WFH Status</strong> page.
        </p>
      </div>
    </div>
  );
};

export default WorkFromHomeRequestPage;
