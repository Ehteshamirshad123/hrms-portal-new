// src/pages/EmployeesPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeesPage.css";
import { toast } from "react-toastify";

const initialForm = {
  // Basic
  employee_code: "",
  first_name: "",
  last_name: "",
  date_of_birth: "",
  date_of_joining: "",
  nationality: "",
  religion: "",
  gender: "",
  marital_status: "",
  personal_phone_number: "",
  emergency_phone_number: "",
  email: "",
  password: "",

  // IDs / docs
  passport_number: "",
  visa_details: "",
  national_id: "",

  // Job / org
  department_id: "",
  designation_id: "",
  location_id: "",
  reporting_manager_id: "",
  shift_start_time: "",
  shift_end_time: "",
  employee_type: "",
  employment_status: "ACTIVE",
  role: "EMPLOYEE",

  // Salary / bank
  monthly_salary: "", // 🆕 for payroll
  base_salary: "",
  bank_name: "",
  bank_account_number: "",

  // Allowances
  allowance_housing: "",
  allowance_transport: "",
  allowance_medical: "",

  // Other
  insurance_details: "",
  highest_qualification: "",
  certifications: "",
  professional_memberships: "",
};

const EmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);

  // Add / Edit form (modal)
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // View details modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    department_id: "ALL",
    location_id: "ALL",
    role: "ALL",
  });

  const isAdmin = user?.role === "ADMIN";
  const isHR = user?.role === "HR";
  const isManager = user?.role === "MANAGER";
  const canEdit = isAdmin || isHR || isManager;

  const numberOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const decimalOrNull = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
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

  // --------- API calls ----------
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        `Error fetching employees (status ${err.response?.status || "?"})`;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [deptRes, desgRes, locRes] = await Promise.all([
        api.get("/api/master/departments"),
        api.get("/api/master/designations"),
        api.get("/api/master/locations"),
      ]);
      setDepartments(deptRes.data || []);
      setDesignations(desgRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) {
      console.error("Error fetching master data", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchMasters();
  }, []);

  // Load employee into form for edit
  const startEdit = async (id) => {
    try {
      const res = await api.get(`/api/employees/${id}`);
      const e = res.data;
      setEditingId(id);
      setForm({
        employee_code: e.employee_code || "",
        first_name: e.first_name || "",
        last_name: e.last_name || "",
        date_of_birth: e.date_of_birth ? e.date_of_birth.slice(0, 10) : "",
        date_of_joining: e.date_of_joining
          ? e.date_of_joining.slice(0, 10)
          : "",
        nationality: e.nationality || "",
        religion: e.religion || "",
        gender: e.gender || "",
        marital_status: e.marital_status || "",
        personal_phone_number: e.personal_phone_number || "",
        emergency_phone_number: e.emergency_phone_number || "",
        email: e.email || "",
        password: "",

        passport_number: e.passport_number || "",
        visa_details: e.visa_details || "",
        national_id: e.national_id || "",

        department_id: e.department_id || "",
        designation_id: e.designation_id || "",
        location_id: e.location_id || "",
        reporting_manager_id: e.reporting_manager_id || "",
        shift_start_time: e.shift_start_time || "",
        shift_end_time: e.shift_end_time || "",
        employee_type: e.employee_type || "",
        employment_status: e.employment_status || "ACTIVE",
        role: e.role || "EMPLOYEE",

        monthly_salary: e.monthly_salary ?? "",
        base_salary: e.base_salary ?? "",
        bank_name: e.bank_name || "",
        bank_account_number: e.bank_account_number || "",

        allowance_housing: e.allowance_housing ?? "",
        allowance_transport: e.allowance_transport ?? "",
        allowance_medical: e.allowance_medical ?? "",

        insurance_details: e.insurance_details || "",
        highest_qualification: e.highest_qualification || "",
        certifications: e.certifications || "",
        professional_memberships: e.professional_memberships || "",
      });
      setShowFormModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Error loading employee details");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const openAddModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Filters
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      department_id: "ALL",
      location_id: "ALL",
      role: "ALL",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingId && !form.password.trim()) {
      toast.error("Please enter a password for the new employee.");
      return;
    }

    setSaving(true);
    try {
      // monthly_salary: agar khaali hai to base_salary ko use kar lo
      const monthlyToSend =
        form.monthly_salary !== "" && form.monthly_salary != null
          ? form.monthly_salary
          : form.base_salary;

      const payload = {
        employee_code: form.employee_code,
        first_name: form.first_name,
        last_name: form.last_name || null,
        date_of_birth: form.date_of_birth || null,
        date_of_joining: form.date_of_joining || null,
        nationality: form.nationality || null,
        religion: form.religion || null,
        gender: form.gender || null,
        marital_status: form.marital_status || null,
        personal_phone_number: form.personal_phone_number,
        emergency_phone_number: form.emergency_phone_number,
        email: form.email || null,

        passport_number: form.passport_number || null,
        visa_details: form.visa_details || null,
        national_id: form.national_id || null,

        department_id: numberOrNull(form.department_id),
        designation_id: numberOrNull(form.designation_id),
        location_id: numberOrNull(form.location_id),
        reporting_manager_id: numberOrNull(form.reporting_manager_id),
        shift_start_time: form.shift_start_time || null,
        shift_end_time: form.shift_end_time || null,
        employee_type: form.employee_type || null,
        employment_status: form.employment_status || "ACTIVE",
        role: form.role || "EMPLOYEE",

        monthly_salary: decimalOrNull(monthlyToSend),
        base_salary: decimalOrNull(form.base_salary),
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,

        allowance_housing: decimalOrNull(form.allowance_housing),
        allowance_transport: decimalOrNull(form.allowance_transport),
        allowance_medical: decimalOrNull(form.allowance_medical),

        insurance_details: form.insurance_details || null,
        highest_qualification: form.highest_qualification || null,
        certifications: form.certifications || null,
        professional_memberships: form.professional_memberships || null,
      };

      if (!editingId) {
        payload.password = form.password;
      } else if (form.password && form.password.trim()) {
        payload.password = form.password;
      }

      if (editingId) {
        await api.put(`/api/employees/${editingId}`, payload);
        toast.success("Employee updated successfully");
      } else {
        await api.post("/api/employees", payload);
        toast.success("Employee created successfully");
      }

      closeFormModal();
      fetchEmployees();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error saving employee";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (id) => {
    try {
      const res = await api.get(`/api/employees/${id}`);
      setSelectedEmployee(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading details");
    }
  };

  const closeDetails = () => setSelectedEmployee(null);

  // filtered list
  const filteredEmployees = employees.filter((e) => {
    const term = filters.search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      e.employee_code?.toLowerCase().includes(term) ||
      `${e.first_name || ""} ${e.last_name || ""}`.toLowerCase().includes(term);

    const matchesDept =
      filters.department_id === "ALL" ||
      String(e.department_id) === filters.department_id;

    const matchesLocation =
      filters.location_id === "ALL" ||
      String(e.location_id) === filters.location_id;

    const matchesRole =
      filters.role === "ALL" || (e.role || "").toUpperCase() === filters.role;

    return matchesSearch && matchesDept && matchesLocation && matchesRole;
  });

  // ---------------- UI ----------------
  return (
    <div className="employees-page">
      {/* PAGE HEADER */}
      <div className="employees-header">
        <div>
          <h1 className="employees-title">Employees</h1>
          <p className="employees-subtitle">
            View, add &amp; update employee information.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openAddModal}
            className="employees-add-btn"
          >
            + Add New Employee
          </button>
        )}
      </div>

      {/* MAIN CARD */}
      <div className="employees-card">
        <div>
          <div className="employees-list-header">
            <h3 className="employees-list-title">Employee List</h3>
            <span className="employees-list-total">
              Total: {employees.length}
            </span>
          </div>

          {/* FILTER ROW */}
          <div className="employees-filters">
            <div className="employees-filter-group">
              <label>Code / Name</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by code or name"
                className="employees-filter-input"
              />
            </div>

            <div className="employees-filter-group">
              <label>Department</label>
              <select
                name="department_id"
                value={filters.department_id}
                onChange={handleFilterChange}
                className="employees-filter-select"
              >
                <option value="ALL">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="employees-filter-group">
              <label>Location</label>
              <select
                name="location_id"
                value={filters.location_id}
                onChange={handleFilterChange}
                className="employees-filter-select"
              >
                <option value="ALL">All</option>
                {locations.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.country || l.name || `Location #${l.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="employees-filter-group">
              <label>Role</label>
              <select
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="employees-filter-select"
              >
                <option value="ALL">All</option>
                <option value="ADMIN">Admin</option>
                <option value="HR">HR</option>
                <option value="MANAGER">Manager</option>
                <option value="PAYROLL">Payroll</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="employees-filter-clear"
            >
              Clear
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="employees-table-wrapper">
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="employees-table-empty">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((e) => (
                      <tr key={e.id}>
                        <td>{e.employee_code}</td>
                        <td>
                          {e.first_name} {e.last_name}
                        </td>
                        <td>{e.department_name || "-"}</td>
                        <td>{e.location_name || "-"}</td>
                        <td>{e.personal_phone_number}</td>
                        <td>{e.role}</td>
                        <td>
                          <button
                            onClick={() => openDetails(e.id)}
                            className="employees-action-btn employees-action-btn--outline"
                          >
                            View Details
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => startEdit(e.id)}
                              className="employees-action-btn employees-action-btn--primary"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedEmployee && (
        <div className="employees-modal-backdrop" onClick={closeDetails}>
          <div className="employees-modal" onClick={(e) => e.stopPropagation()}>
            <div className="employees-modal-header">
              <h3>Employee Details</h3>
              <button onClick={closeDetails} className="employees-modal-close">
                ×
              </button>
            </div>

            <p className="employees-modal-summary">
              <strong>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </strong>{" "}
              ({selectedEmployee.employee_code}) –{" "}
              {selectedEmployee.designation_name || "-"} in{" "}
              {selectedEmployee.department_name || "-"}
            </p>

            <div className="employees-detail-grid">
              {/* Personal */}
              <div className="emp-detail-card">
                <div className="emp-detail-title">Personal Info</div>
                <p>
                  <strong>DOB:</strong>{" "}
                  {formatDate(selectedEmployee.date_of_birth)}
                </p>
                <p>
                  <strong>Nationality:</strong>{" "}
                  {selectedEmployee.nationality || "-"}
                </p>
                <p>
                  <strong>Religion:</strong> {selectedEmployee.religion || "-"}
                </p>
                <p>
                  <strong>Gender:</strong> {selectedEmployee.gender || "-"}
                </p>
                <p>
                  <strong>Marital:</strong>{" "}
                  {selectedEmployee.marital_status || "-"}
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  {selectedEmployee.personal_phone_number}
                </p>
                <p>
                  <strong>Emergency Phone:</strong>{" "}
                  {selectedEmployee.emergency_phone_number}
                </p>
                <p>
                  <strong>Email:</strong> {selectedEmployee.email || "-"}
                </p>
              </div>

              {/* Job */}
              <div className="emp-detail-card">
                <div className="emp-detail-title">Job Details</div>
                <p>
                  <strong>Department:</strong>{" "}
                  {selectedEmployee.department_name || "-"}
                </p>
                <p>
                  <strong>Designation:</strong>{" "}
                  {selectedEmployee.designation_name || "-"}
                </p>
                <p>
                  <strong>Location:</strong>{" "}
                  {selectedEmployee.location_name || "-"}
                </p>
                <p>
                  <strong>Date of Joining:</strong>{" "}
                  {formatDate(selectedEmployee.date_of_joining)}
                </p>
                <p>
                  <strong>Shift:</strong>{" "}
                  {selectedEmployee.shift_start_time &&
                  selectedEmployee.shift_end_time
                    ? `${selectedEmployee.shift_start_time?.slice(
                        0,
                        5
                      )}–${selectedEmployee.shift_end_time?.slice(0, 5)}`
                    : "-"}
                </p>
                <p>
                  <strong>Employee Type:</strong>{" "}
                  {selectedEmployee.employee_type || "-"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {selectedEmployee.employment_status || "-"}
                </p>
                <p>
                  <strong>Role:</strong> {selectedEmployee.role || "-"}
                </p>
              </div>

              {/* Salary */}
              <div className="emp-detail-card">
                <div className="emp-detail-title">Salary &amp; Bank</div>
                <p>
                  <strong>Monthly Salary:</strong>{" "}
                  {selectedEmployee.monthly_salary ?? "-"}
                </p>
                <p>
                  <strong>Base Salary:</strong>{" "}
                  {selectedEmployee.base_salary ?? "-"}
                </p>
                <p>
                  <strong>Housing Allowance:</strong>{" "}
                  {selectedEmployee.allowance_housing ?? "-"}
                </p>
                <p>
                  <strong>Transport Allowance:</strong>{" "}
                  {selectedEmployee.allowance_transport ?? "-"}
                </p>
                <p>
                  <strong>Medical Allowance:</strong>{" "}
                  {selectedEmployee.allowance_medical ?? "-"}
                </p>
                <p>
                  <strong>Bank:</strong> {selectedEmployee.bank_name || "-"}
                </p>
                <p>
                  <strong>Account:</strong>{" "}
                  {selectedEmployee.bank_account_number || "-"}
                </p>
              </div>

              {/* Other */}
              <div className="emp-detail-card">
                <div className="emp-detail-title">Other</div>
                <p>
                  <strong>Passport:</strong>{" "}
                  {selectedEmployee.passport_number || "-"}
                </p>
                <p>
                  <strong>Visa:</strong> {selectedEmployee.visa_details || "-"}
                </p>
                <p>
                  <strong>National ID:</strong>{" "}
                  {selectedEmployee.national_id || "-"}
                </p>
                <p>
                  <strong>Insurance:</strong>{" "}
                  {selectedEmployee.insurance_details || "-"}
                </p>
                <p>
                  <strong>Qualification:</strong>{" "}
                  {selectedEmployee.highest_qualification || "-"}
                </p>
                <p>
                  <strong>Certifications:</strong>{" "}
                  {selectedEmployee.certifications || "-"}
                </p>
                <p>
                  <strong>Professional Memberships:</strong>{" "}
                  {selectedEmployee.professional_memberships || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FORM MODAL */}
      {showFormModal && canEdit && (
        <div className="employees-modal-backdrop" onClick={closeFormModal}>
          <div
            className="employees-modal employees-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employees-modal-header">
              <h3>{editingId ? "Edit Employee" : "Add New Employee"}</h3>
              <button
                onClick={closeFormModal}
                className="employees-modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="employee-form">
              {/* BASIC INFO */}
              <div className="employee-form-group">
                <label>Employee Code (auto)</label>
                <input
                  type="text"
                  name="employee_code"
                  value={editingId ? form.employee_code : ""}
                  onChange={handleChange}
                  readOnly
                  disabled
                  placeholder={editingId ? "" : "Auto generated after saving"}
                />
              </div>

              <div className="employee-form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="employee-form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Date of Joining</label>
                <input
                  type="date"
                  name="date_of_joining"
                  value={form.date_of_joining}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Religion</label>
                <input
                  type="text"
                  name="religion"
                  value={form.religion}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="employee-form-group">
                <label>Marital Status</label>
                <select
                  name="marital_status"
                  value={form.marital_status}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>

              <div className="employee-form-group">
                <label>Personal Phone *</label>
                <input
                  type="text"
                  name="personal_phone_number"
                  value={form.personal_phone_number}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="employee-form-group">
                <label>Emergency Phone *</label>
                <input
                  type="text"
                  name="emergency_phone_number"
                  value={form.emergency_phone_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="employee-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>
                  Password {editingId ? "(leave blank to keep same)" : "*"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required={!editingId}
                />
              </div>

              {/* IDs */}
              <div className="employee-form-group">
                <label>Passport No.</label>
                <input
                  type="text"
                  name="passport_number"
                  value={form.passport_number}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Visa Details</label>
                <input
                  type="text"
                  name="visa_details"
                  value={form.visa_details}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>National ID</label>
                <input
                  type="text"
                  name="national_id"
                  value={form.national_id}
                  onChange={handleChange}
                />
              </div>

              {/* ORG / JOB */}
              <div className="employee-form-group">
                <label>Department</label>
                <select
                  name="department_id"
                  value={form.department_id}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="employee-form-group">
                <label>Designation</label>
                <select
                  name="designation_id"
                  value={form.designation_id}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="employee-form-group">
                <label>Location</label>
                <select
                  name="location_id"
                  value={form.location_id}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.country || l.name || `Location #${l.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="employee-form-group">
                <label>Reporting Manager (Employee ID)</label>
                <input
                  type="number"
                  name="reporting_manager_id"
                  value={form.reporting_manager_id}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Shift Start (HH:MM)</label>
                <input
                  type="time"
                  name="shift_start_time"
                  value={form.shift_start_time}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Shift End (HH:MM)</label>
                <input
                  type="time"
                  name="shift_end_time"
                  value={form.shift_end_time}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Employee Type</label>
                <select
                  name="employee_type"
                  value={form.employee_type}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="PERMANENT">Permanent</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
              <div className="employee-form-group">
                <label>Employment Status</label>
                <select
                  name="employment_status"
                  value={form.employment_status}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
              <div className="employee-form-group">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* SALARY / BANK */}
              <div className="employee-form-group">
                <label>Monthly Salary (for payroll)</label>
                <input
                  type="number"
                  step="0.01"
                  name="monthly_salary"
                  value={form.monthly_salary}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Base Salary</label>
                <input
                  type="number"
                  step="0.01"
                  name="base_salary"
                  value={form.base_salary}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={form.bank_name}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Bank Account No.</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={form.bank_account_number}
                  onChange={handleChange}
                />
              </div>

              <div className="employee-form-group">
                <label>Housing Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  name="allowance_housing"
                  value={form.allowance_housing}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Transport Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  name="allowance_transport"
                  value={form.allowance_transport}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group">
                <label>Medical Allowance</label>
                <input
                  type="number"
                  step="0.01"
                  name="allowance_medical"
                  value={form.allowance_medical}
                  onChange={handleChange}
                />
              </div>

              {/* OTHER */}
              <div className="employee-form-group employee-form-group--full">
                <label>Insurance Details</label>
                <input
                  type="text"
                  name="insurance_details"
                  value={form.insurance_details}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group employee-form-group--full">
                <label>Highest Qualification</label>
                <input
                  type="text"
                  name="highest_qualification"
                  value={form.highest_qualification}
                  onChange={handleChange}
                />
              </div>
              <div className="employee-form-group employee-form-group--full">
                <label>Certifications</label>
                <textarea
                  name="certifications"
                  value={form.certifications}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              <div className="employee-form-group employee-form-group--full">
                <label>Professional Memberships</label>
                <textarea
                  name="professional_memberships"
                  value={form.professional_memberships}
                  onChange={handleChange}
                  rows={2}
                />
              </div>

              <div className="employee-form-actions">
                <button
                  type="submit"
                  disabled={saving}
                  className="employees-save-btn"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Employee"
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
