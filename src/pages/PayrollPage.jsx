// src/pages/PayrollPage.jsx
import React, { useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/PayrollPage.css";
import { toast } from "react-toastify";

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const PayrollPage = () => {
  const { user } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1–12

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingFinalize, setLoadingFinalize] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const canFinalize = ["ADMIN", "SUPER_ADMIN", "HR", "PAYROLL"].includes(
    (user?.role || "").toUpperCase()
  );

  const handlePreview = async () => {
    setError("");
    setItems([]);
    setLoadingPreview(true);
    try {
      const res = await api.get("/api/payroll/preview", {
        params: { year, month },
      });

      const data = res.data?.items || [];
      if (!data.length) {
        setItems([]);
        setError("No employees / salary data found for this month.");
      } else {
        setItems(data);
      }
    } catch (err) {
      console.error("previewPayroll error", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to load payroll preview.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFinalize = async () => {
    if (!items.length) {
      toast.warn("Please load preview before finalizing payroll.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to finalize payroll for this month?"
      )
    ) {
      return;
    }

    setLoadingFinalize(true);
    try {
      const res = await api.post("/api/payroll/finalize", {
        year,
        month,
        notes: `Payroll run for ${year}-${String(month).padStart(2, "0")}`,
      });

      toast.success(
        `Payroll finalized successfully. Employees: ${
          res.data?.total_employees ?? items.length
        }`
      );
    } catch (err) {
      console.error("finalizePayroll error", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to finalize payroll.";
      toast.error(msg);
    } finally {
      setLoadingFinalize(false);
    }
  };

  // aggregates for summary
  const totals = items.reduce(
    (acc, it) => {
      acc.gross += Number(it.monthly_salary || 0);
      acc.net += Number(it.net_salary || 0);
      acc.unpaid += Number(it.unpaid_deduction_amount || 0);
      return acc;
    },
    { gross: 0, net: 0, unpaid: 0 }
  );

  return (
    <div className="pr-page">
      {/* HEADER */}
      <div className="pr-header">
        <h1 className="pr-title">Payroll Processing</h1>
        <p className="pr-subtitle">
          Generate monthly payroll from attendance and leave data.
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="pr-card">
        {/* SECTION: controls */}
        <section className="pr-section">
          <div className="pr-section-header">
            <h2>Payroll Month</h2>
            <span className="pr-section-note">
              Select year and month, then preview payroll before finalizing.
            </span>
          </div>

          <div className="pr-filters">
            <div className="pr-filter-group">
              <label>Year</label>
              <input
                type="number"
                min="2000"
                max="2100"
                className="pr-filter-input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || "")}
              />
            </div>

            <div className="pr-filter-group">
              <label>Month</label>
              <select
                className="pr-filter-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pr-filter-actions">
              <button
                type="button"
                className="pr-btn pr-btn-primary"
                onClick={handlePreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? "Loading..." : "Preview Payroll"}
              </button>

              <button
                type="button"
                className="pr-btn pr-btn-secondary"
                onClick={handleFinalize}
                disabled={loadingFinalize || !items.length || !canFinalize}
                title={
                  !canFinalize
                    ? "You are not allowed to finalize payroll"
                    : undefined
                }
              >
                {loadingFinalize ? "Finalizing..." : "Finalize Payroll"}
              </button>
            </div>
          </div>

          {error && <div className="pr-error">{error}</div>}

          {!error && !items.length && !loadingPreview && (
            <p className="pr-empty">
              No payroll preview loaded yet. Select year/month and click{" "}
              <strong>Preview Payroll</strong>.
            </p>
          )}
        </section>

        {/* SECTION: summary + table */}
        {!error && items.length > 0 && (
          <section className="pr-section">
            <div className="pr-section-header">
              <h2>Payroll Summary</h2>
              <span className="pr-section-note">
                Review employee-wise net salary and unpaid deductions before
                finalizing.
              </span>
            </div>

            <div className="pr-summary">
              <div>
                <span className="pr-summary-label">Employees</span>
                <span className="pr-summary-value">{items.length}</span>
              </div>
              <div>
                <span className="pr-summary-label">Total Gross</span>
                <span className="pr-summary-value">
                  {totals.gross.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="pr-summary-label">Total Deductions</span>
                <span className="pr-summary-value">
                  {totals.unpaid.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="pr-summary-label">Total Net</span>
                <span className="pr-summary-value">
                  {totals.net.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pr-table-wrapper">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Working Days</th>
                    <th>Unpaid Leave</th>
                    <th>Absents</th>
                    <th>Total Unpaid</th>
                    <th>Daily Rate</th>
                    <th>Deduction</th>
                    <th>Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.employee_id}>
                      <td>{it.employee_code}</td>
                      <td>{it.employee_name}</td>
                      <td>{it.total_working_days}</td>
                      <td>{it.unpaid_leave_days}</td>
                      <td>{it.absent_days}</td>
                      <td>{it.total_unpaid_days}</td>
                      <td>{Number(it.daily_rate || 0).toFixed(2)}</td>
                      <td>
                        {Number(it.unpaid_deduction_amount || 0).toFixed(2)}
                      </td>
                      <td>{Number(it.net_salary || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
