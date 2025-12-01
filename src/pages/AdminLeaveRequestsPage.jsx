// src/pages/AdminLeaveRequestsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/LeavePage.css";
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

const AdminLeaveRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");

  const role = (user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isHR = role === "HR";
  const isManager = role === "MANAGER";

  // Admin + HR → final HR action, Manager → manager action
  const myRoleForAction = isHR || isAdmin ? "HR" : "MANAGER";

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState({
    open: false,
    id: null,
    action: null,
    label: "",
  });

  // Details modal state (full application)
  const [detailRequest, setDetailRequest] = useState(null);

  const loadRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = {};

      if (isHR) {
        params.view = "hr";
      } else if (isManager) {
        params.view = "manager";
        params.approver_id = user.id;
      } else if (isAdmin) {
        // admin ke liye hr view (worldwide, backend filter karega)
        params.view = "hr";
      }

      const res = await api.get("/api/leaves/requests", { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error loading leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Actual API action – yahan window.confirm nahi
  const handleAction = async (id, action) => {
    try {
      await api.put(`/api/leaves/requests/${id}/action`, {
        role: myRoleForAction, // 'MANAGER' or 'HR'
        approver_id: user.id,
        action, // 'APPROVE' | 'REJECT'
        comment: comment || null,
      });

      setComment("");

      const actionText = action === "APPROVE" ? "approved" : "rejected";
      toast.success(`Request ${actionText} successfully.`);
      loadRequests();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error updating request";
      toast.error(msg);
    }
  };

  // Confirm modal open kare
  const openConfirm = (row, action) => {
    const employeeLabel = `${row.employee_code || ""} ${row.first_name || ""} ${
      row.last_name || ""
    }`.trim();

    const datesLabel = `${formatDate(row.start_date)} → ${formatDate(
      row.end_date
    )}`;

    const label = `${action === "APPROVE" ? "Approve" : "Reject"}: ${
      employeeLabel || "Employee"
    } (${datesLabel})`;

    setConfirmState({
      open: true,
      id: row.id,
      action,
      label,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      id: null,
      action: null,
      label: "",
    });
  };

  const handleConfirmYes = async () => {
    if (!confirmState.id || !confirmState.action) {
      closeConfirm();
      return;
    }
    await handleAction(confirmState.id, confirmState.action);
    closeConfirm();
  };

  return (
    <div className="leave-page-root">
      {/* Header in blue strip */}
      <div className="leave-page-header">
        <h1>Leave Requests</h1>
        <p>
          Review &amp; manage employee leave requests. Logged in as{" "}
          <strong>{user?.employee_code}</strong> ({user?.role}).
        </p>
      </div>

      {/* Main card */}
      <div className="leave-page-card">
        <section className="leave-section">
          <h3 className="leave-section-title">Pending Leave Requests</h3>
          <p className="leave-section-help">
            Comment optional hai – agar aap koi note / reason add karna chahte
            hain to yahan likhein, next action pe use ho jayega.
          </p>

          <div className="leave-comment-box">
            <label>Comment (optional)</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="leave-table-wrapper">
            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Application</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="leave-table-empty">
                        No pending requests.
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
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
                            type="button"
                            onClick={() => setDetailRequest(r)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#2563eb",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 12,
                              textDecoration: "underline",
                            }}
                          >
                            View application
                          </button>
                        </td>
                        <td>
                          <button
                            className="leave-btn leave-btn--approve"
                            onClick={() => openConfirm(r, "APPROVE")}
                          >
                            Approve
                          </button>
                          <button
                            className="leave-btn leave-btn--reject"
                            onClick={() => openConfirm(r, "REJECT")}
                          >
                            Reject
                          </button>
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

      {/* Confirmation modal */}
      {confirmState.open && (
        <div className="leave-confirm-backdrop">
          <div className="leave-confirm-modal">
            <h3>Are you sure?</h3>
            <p>{confirmState.label}</p>
            <p className="leave-confirm-note">
              This action will update the request status.
            </p>
            <div className="leave-confirm-actions">
              <button
                type="button"
                className="leave-confirm-btn leave-confirm-btn--secondary"
                onClick={closeConfirm}
              >
                No, cancel
              </button>
              <button
                type="button"
                className="leave-confirm-btn leave-confirm-btn--primary"
                onClick={handleConfirmYes}
              >
                Yes, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal – full application */}
      {detailRequest && (
        <div
          className="leave-confirm-backdrop"
          onClick={() => setDetailRequest(null)}
        >
          <div
            className="leave-confirm-modal"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Leave Application</h3>

            <p style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>
                {detailRequest.employee_code} {detailRequest.first_name}{" "}
                {detailRequest.last_name}
              </strong>{" "}
              •{" "}
              {detailRequest.code ||
                detailRequest.leave_type_name ||
                detailRequest.leave_type_id}{" "}
              • {formatDate(detailRequest.start_date)} →{" "}
              {formatDate(detailRequest.end_date)} ({detailRequest.total_days}{" "}
              days)
            </p>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: 10,
                marginTop: 4,
                fontSize: 13,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <strong>Employee Reason</strong>
                <p style={{ marginTop: 4, whiteSpace: "pre-line" }}>
                  {detailRequest.reason || "-"}
                </p>
              </div>

              {detailRequest.contact_details_during_leave && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Contact during leave</strong>
                  <p style={{ marginTop: 4 }}>
                    {detailRequest.contact_details_during_leave}
                  </p>
                </div>
              )}

              {detailRequest.manager_comment && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Manager Comment</strong>
                  <p style={{ marginTop: 4 }}>
                    {detailRequest.manager_comment}
                  </p>
                </div>
              )}

              {detailRequest.hr_comment && (
                <div style={{ marginBottom: 8 }}>
                  <strong>HR Comment</strong>
                  <p style={{ marginTop: 4 }}>{detailRequest.hr_comment}</p>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                textAlign: "right",
              }}
            >
              <button
                type="button"
                className="leave-confirm-btn leave-confirm-btn--secondary"
                onClick={() => setDetailRequest(null)}
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

export default AdminLeaveRequestsPage;
