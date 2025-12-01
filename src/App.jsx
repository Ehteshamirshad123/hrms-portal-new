// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SidebarLayout from "./components/Layout/SidebarLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import LeavePage from "./pages/LeavePage";
import LeaveApplyPage from "./pages/LeaveApplyPage";
import LeaveStatusPage from "./pages/LeaveStatusPage";
import AdminLeaveRequestsPage from "./pages/AdminLeaveRequestsPage";
import AttendanceRegularizationPage from "./pages/AttendanceRegularizationPage";
import AttendanceRegularizationStatusPage from "./pages/AttendanceRegularizationStatusPage";
import WorkFromHomeRequestPage from "./pages/WorkFromHomeRequestPage";
import AdminWFHRequestsPage from "./pages/AdminWFHRequestsPage";
import WorkFromHomeStatusPage from "./pages/WorkFromHomeStatusPage";
import HolidaysCalendarPage from "./pages/HolidaysCalendarPage";
import AdminAttendanceRegularizationsPage from "./pages/AdminAttendanceRegularizationsPage";
import PayrollPage from "./pages/PayrollPage"; // ✅ admin payroll
import MyPayrollPage from "./pages/MyPayrollPage"; // ✅ employee payroll history
import AdminLeaveRecordsPage from "./pages/AdminLeaveRecordsPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <Routes>
        {/* Login page without sidebar */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected layout with sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/" element={<DashboardPage />} />

          {/* Employees */}
          <Route path="/employees" element={<EmployeesPage />} />

          {/* Attendance */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/attendance-regularization"
            element={<AttendanceRegularizationPage />}
          />
          <Route
            path="/attendance-regularization/status"
            element={<AttendanceRegularizationStatusPage />}
          />
          <Route path="/work-from-home" element={<WorkFromHomeRequestPage />} />
          <Route
            path="/admin/wfh-requests"
            element={<AdminWFHRequestsPage />}
          />
          <Route path="/wfh/status" element={<WorkFromHomeStatusPage />} />

          {/* Leaves */}
          <Route path="/leaves" element={<LeavePage />} />
          <Route path="/leaves/apply" element={<LeaveApplyPage />} />
          <Route path="/leaves/status" element={<LeaveStatusPage />} />
          <Route
            path="/admin/leave-requests"
            element={<AdminLeaveRequestsPage />}
          />
          <Route
            path="/admin/leave-records"
            element={<AdminLeaveRecordsPage />}
          />

          {/* Holidays – path ko /holidays rakha hai, sidebar ke saath match */}
          <Route path="/holidays" element={<HolidaysCalendarPage />} />

          {/* Admin side Attendance Regularizations list */}
          <Route
            path="/admin/attendance-regularizations"
            element={<AdminAttendanceRegularizationsPage />}
          />

          {/* ✅ Admin Payroll main page */}
          <Route path="/payroll" element={<PayrollPage />} />

          {/* ✅ Employee My Payroll history page */}
          <Route path="/my-payroll" element={<MyPayrollPage />} />
        </Route>
      </Routes>

      {/* ✅ Global toast container – design ko affect nahi karega */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        pauseOnHover
        newestOnTop
        closeOnClick
      />
    </div>
  );
};

export default App;
