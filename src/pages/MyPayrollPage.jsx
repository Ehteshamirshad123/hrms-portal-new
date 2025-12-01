// src/pages/MyPayrollPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/MyPayrollPage.css";
import { toast } from "react-toastify";

const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const formatCurrency = (val) => {
  if (val == null) return "-";
  const num = Number(val);
  if (Number.isNaN(num)) return val;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const labelForDayType = (type) => {
  switch (type) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
    case "ABSENT_NO_RECORD":
      return "Absent";
    case "PAID_LEAVE":
      return "Paid leave";
    case "UNPAID_LEAVE":
      return "Unpaid leave";
    case "HOLIDAY":
      return "Public holiday";
    case "WEEKEND":
      return "Weekend";
    default:
      return type || "-";
  }
};

const MyPayrollPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    year: "ALL",
    month: "ALL",
  });

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/payroll/me");
        console.log("Raw API Response:", res.data); // ← ADD THIS
        setItems(res.data || []);
      } catch (err) {
        console.error("Error loading payroll history", err);
        const msg =
          err.response?.data?.error || "Error loading payroll history";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ year: "ALL", month: "ALL" });
  };

  const filteredItems = items.filter((it) => {
    const matchYear =
      filters.year === "ALL" || String(it.year) === filters.year;
    const matchMonth =
      filters.month === "ALL" || String(it.month) === filters.month;
    return matchYear && matchMonth;
  });

  const openDetails = (item) => {
    setSelectedItem(item);
  };

  const closeDetails = () => setSelectedItem(null);

  const getDetailsFromItem = (item) => {
    if (!item?.meta_json) return [];
    try {
      const meta = JSON.parse(item.meta_json);
      return meta?.details || [];
    } catch (e) {
      console.warn("Failed to parse meta_json", e);
      return [];
    }
  };

  const uniqueYears = Array.from(new Set(items.map((i) => i.year))).sort(
    (a, b) => b - a
  );

  return (
    <div className="mpay-page">
      {/* HEADER */}
      <div className="mpay-header">
        <div>
          <h1 className="mpay-title">My Payroll History</h1>
          <p className="mpay-subtitle">
            View your finalized monthly payroll based on attendance &amp; leave
            data.
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="mpay-card">
        <section className="mpay-section">
          <div className="mpay-section-header">
            <h2>Payroll summaries</h2>
            <span className="mpay-section-note">
              Only finalized payroll runs are shown here.
            </span>
          </div>

          {/* Filters */}
          <div className="mpay-filters">
            <div className="mpay-filter-group">
              <label>Year</label>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                className="mpay-filter-select"
              >
                <option value="ALL">All</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="mpay-filter-group">
              <label>Month</label>
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                className="mpay-filter-select"
              >
                <option value="ALL">All</option>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>
                    {monthNames[idx + 1]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="mpay-btn mpay-btn-light"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="mpay-table-wrapper">
              <table className="mpay-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Month</th>
                    <th>Run date</th>
                    <th>Working days</th>
                    <th>Unpaid days</th>
                    <th>Gross salary</th>
                    <th>Deduction</th>
                    <th>Net salary</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="mpay-no-data">
                        No payroll records found yet.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it) => (
                      <tr key={it.id}>
                        <td>{it.year}</td>
                        <td>{monthNames[it.month] || it.month}</td>
                        <td>{formatDate(it.run_date)}</td>
                        <td>{it.total_working_days ?? "-"}</td>
                        <td>{it.total_unpaid_days ?? "-"}</td>
                        <td>{formatCurrency(it.gross_salary)}</td>
                        <td>{formatCurrency(it.unpaid_deduction_amount)}</td>
                        <td>{formatCurrency(it.net_salary)}</td>
                        <td>
                          <button
                            type="button"
                            className="mpay-btn mpay-btn-outline"
                            onClick={() => openDetails(it)}
                          >
                            View details
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

      {/* DETAILS MODAL */}
      {selectedItem && (
        <div className="mpay-modal-backdrop" onClick={closeDetails}>
          <div className="mpay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mpay-modal-header">
              <h3>
                {monthNames[selectedItem.month] || selectedItem.month}{" "}
                {selectedItem.year} – details
              </h3>
              <button
                type="button"
                className="mpay-modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <p className="mpay-modal-summary">
              <strong>Net salary:</strong>{" "}
              {formatCurrency(selectedItem.net_salary)} &nbsp;|&nbsp;{" "}
              <strong>Gross:</strong>{" "}
              {formatCurrency(selectedItem.gross_salary)} &nbsp;|&nbsp;{" "}
              <strong>Unpaid days:</strong>{" "}
              {selectedItem.total_unpaid_days ?? "-"}
            </p>

            <div className="mpay-table-wrapper">
              <table className="mpay-table mpay-details-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Info</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailsFromItem(selectedItem).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="mpay-no-data">
                        No day-level details stored.
                      </td>
                    </tr>
                  ) : (
                    getDetailsFromItem(selectedItem).map((d) => (
                      <tr key={d.date + d.type + (d.leave_code || "")}>
                        <td>{d.date}</td>
                        <td>{labelForDayType(d.type)}</td>
                        <td>
                          {d.leave_name
                            ? `${d.leave_name} (${d.leave_code})`
                            : d.attendance_status || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mpay-form-actions">
              <button
                type="button"
                className="mpay-btn mpay-btn-primary"
                onClick={closeDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPayrollPage;
