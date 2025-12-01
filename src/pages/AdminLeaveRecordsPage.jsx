// src/pages/AdminLeaveRecordPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminLeaveRecordsPage.css";

const currentYear = new Date().getFullYear();

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

const AdminLeaveRecordPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [year, setYear] = useState(currentYear);

  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // =====================================================
  // Load employees (HR / Admin / Manager ke liye dropdown)
  // =====================================================
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await api.get("/api/employees");
        setEmployees(res.data || []);
      } catch (err) {
        console.error(err);
        setError("Error loading employees");
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department_name) set.add(e.department_name);
    });
    return Array.from(set);
  }, [employees]);

  // Search + department filter
  const filteredEmployees = useMemo(() => {
    const txt = searchText.toLowerCase();
    return employees.filter((e) => {
      const depOk = !departmentFilter || e.department_name === departmentFilter;

      const label = `${e.employee_code || ""} ${e.first_name || ""} ${
        e.last_name || ""
      }`.toLowerCase();

      const matchText = !txt || label.includes(txt);

      return depOk && matchText;
    });
  }, [employees, searchText, departmentFilter]);

  // =====================================================
  // Load leave balance + history for selected employee
  // =====================================================
  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadData = async () => {
      setLoadingData(true);
      setError("");
      try {
        const [balRes, reqRes] = await Promise.all([
          api.get(`/api/leaves/balance/${selectedEmployeeId}`, {
            params: { year },
          }),
          api.get("/api/leaves/requests", {
            params: { employee_id: selectedEmployeeId },
          }),
        ]);

        setBalances(balRes.data || []);
        setRequests(reqRes.data || []);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.error || "Error loading leave data for employee"
        );
        setBalances([]);
        setRequests([]);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [selectedEmployeeId, year]);

  // =====================================================
  // Derived stats for summary cards
  // =====================================================
  const annual = balances.find((b) => b.code === "AL");
  const sick = balances.find((b) => b.code === "SL");

  const totalAnnualEntitled =
    (annual?.opening_balance_days || 0) + (annual?.carry_forward_days || 0);
  const totalSickEntitled =
    (sick?.opening_balance_days || 0) + (sick?.carry_forward_days || 0);

  const totalEntitled = totalAnnualEntitled + totalSickEntitled;
  const totalUsed = (annual?.used_days || 0) + (sick?.used_days || 0) + 0;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const declinedCount = requests.filter(
    (r) => r.status === "REJECTED" || r.status === "CANCELLED"
  ).length;

  const selectedEmployee =
    employees.find((e) => String(e.id) === String(selectedEmployeeId)) || null;

  // ====================== UI ======================
  return (
    <div className="lrec-page">
      {/* HEADER – same style as other leave pages */}
      <div className="lrec-header">
        <div>
          <h1 className="lrec-title">Employee Leave Records</h1>
          <p className="lrec-subtitle">
            View leave balance and full leave history for any employee.
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="lrec-card">
        {/* SECTION: Filters + top cards */}
        <section className="lrec-section">
          <div className="lrec-section-header">
            <h2>Search employee</h2>
            <span className="lrec-section-note">
              Filter employees by name, code or department and then view their
              leave balance.
            </span>
          </div>

          {/* Filters row – same chip style as other pages */}
          <div className="lrec-filters">
            <div className="lrec-filter-group">
              <label>Search employee</label>
              <input
                type="text"
                className="lrec-filter-input"
                placeholder="Search by code or name (HR002, Rida …)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="lrec-filter-group">
              <label>Department</label>
              <select
                className="lrec-filter-input"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="lrec-filter-group">
              <label>Employee</label>
              <select
                className="lrec-filter-input"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={loadingEmployees || filteredEmployees.length === 0}
              >
                <option value="">
                  {loadingEmployees
                    ? "Loading employees..."
                    : filteredEmployees.length === 0
                    ? "No employees found"
                    : "Select employee"}
                </option>
                {filteredEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employee_code} • {e.first_name} {e.last_name}{" "}
                    {e.department_name ? `(${e.department_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="lrec-filter-group lrec-filter-group--year">
              <label>Year</label>
              <select
                className="lrec-filter-input"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || currentYear)}
              >
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear - 2}>{currentYear - 2}</option>
              </select>
            </div>
          </div>

          {error && <div className="lrec-error">{error}</div>}

          {/* Selected employee chip */}
          {selectedEmployee && (
            <div className="lrec-emp-banner">
              <div>
                <div className="lrec-emp-name">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </div>
                <div className="lrec-emp-meta">
                  <span>{selectedEmployee.employee_code}</span>
                  {selectedEmployee.department_name && (
                    <span>{selectedEmployee.department_name}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Top 4 cards – same style as Apply Leave screenshot */}
          {selectedEmployee && (
            <div className="lrec-summary-row">
              <div className="lrec-summary-card lrec-summary-card--green">
                <div className="lrec-summary-value">
                  {totalEntitled ? totalEntitled.toFixed(1) : "0"}
                </div>
                <div className="lrec-summary-title">Total Leave</div>
                <div className="lrec-summary-sub">
                  Annual: {totalAnnualEntitled.toFixed(1)} | Sick:{" "}
                  {totalSickEntitled.toFixed(1)}
                </div>
              </div>

              <div className="lrec-summary-card lrec-summary-card--blue">
                <div className="lrec-summary-value">{pendingCount}</div>
                <div className="lrec-summary-title">Pending</div>
                <div className="lrec-summary-sub">Requests</div>
              </div>

              <div className="lrec-summary-card lrec-summary-card--teal">
                <div className="lrec-summary-value">{approvedCount}</div>
                <div className="lrec-summary-title">Approved</div>
                <div className="lrec-summary-sub">Requests</div>
              </div>

              <div className="lrec-summary-card lrec-summary-card--red">
                <div className="lrec-summary-value">{declinedCount}</div>
                <div className="lrec-summary-title">Declined</div>
                <div className="lrec-summary-sub">Requests</div>
              </div>
            </div>
          )}

          {!selectedEmployeeId && (
            <div className="lrec-empty">
              Please select an employee to see leave balance and history.
            </div>
          )}
        </section>

        {/* SECTION: Leave balance table */}
        {selectedEmployee && (
          <section className="lrec-section">
            <div className="lrec-section-header">
              <h2>Leave balance</h2>
              <span className="lrec-section-note">
                Opening, used, pending and remaining balance ({year}) for this
                employee.
              </span>
            </div>

            {loadingData && (
              <div className="lrec-loading">Loading leave balance…</div>
            )}

            {!loadingData && balances.length === 0 && (
              <div className="lrec-empty">No leave balance records found.</div>
            )}

            {!loadingData && balances.length > 0 && (
              <div className="lrec-table-wrapper">
                <table className="lrec-table">
                  <thead>
                    <tr>
                      <th>Leave type</th>
                      <th>Opening</th>
                      <th>Carry forward</th>
                      <th>Entitled</th>
                      <th>Used</th>
                      <th>Pending</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => {
                      const entitled =
                        (b.opening_balance_days || 0) +
                        (b.carry_forward_days || 0);
                      const remaining = entitled - (b.used_days || 0);
                      return (
                        <tr key={b.code}>
                          <td>
                            <strong>{b.leave_type_name}</strong>{" "}
                            <span className="lrec-pill">{b.code}</span>
                          </td>
                          <td>{b.opening_balance_days?.toFixed(1) || "0"}</td>
                          <td>{b.carry_forward_days?.toFixed(1) || "0"}</td>
                          <td>{entitled.toFixed(1)}</td>
                          <td>{b.used_days?.toFixed(1) || "0"}</td>
                          <td>{b.pending_approval_days?.toFixed(1) || "0"}</td>
                          <td>{remaining.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* SECTION: Leave history table */}
        {selectedEmployee && (
          <section className="lrec-section">
            <div className="lrec-section-header">
              <h2>Leave requests history</h2>
              <span className="lrec-section-note">
                All leave applications for this employee.
              </span>
            </div>

            {loadingData && (
              <div className="lrec-loading">Loading request history…</div>
            )}

            {!loadingData && requests.length === 0 && (
              <div className="lrec-empty">No leave requests found.</div>
            )}

            {!loadingData && requests.length > 0 && (
              <div className="lrec-table-wrapper">
                <table className="lrec-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Leave type</th>
                      <th>Period</th>
                      <th>Total days</th>
                      <th>Status</th>
                      <th>Applied on</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r, idx) => (
                      <tr key={r.id}>
                        <td>{idx + 1}</td>
                        <td>
                          {r.leave_type_name}{" "}
                          <span className="lrec-pill">{r.code}</span>
                        </td>
                        <td>
                          {formatDate(r.start_date)} – {formatDate(r.end_date)}
                        </td>
                        <td>{r.total_days}</td>
                        <td>
                          <span
                            className={
                              "lrec-status lrec-status--" +
                              (r.status || "PENDING").toLowerCase()
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminLeaveRecordPage;
