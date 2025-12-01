// src/pages/AdminWFHRequestsPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminWFHRequestsPage.css";
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

// simple inline styles for overlay modal
const backdropStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: 14,
  padding: 20,
  maxWidth: 520,
  width: "92%",
  boxShadow: "0 18px 45px rgba(15,23,42,0.5)",
  fontSize: 14,
};

const footerStyle = {
  marginTop: 16,
  textAlign: "right",
};

const closeBtnStyle = {
  padding: "6px 14px",
  borderRadius: 999,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  fontSize: 13,
  cursor: "pointer",
};

const linkButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  cursor: "pointer",
  padding: 0,
  fontSize: 12,
  textDecoration: "underline",
};

const AdminWFHRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // full-application modal state
  const [detailRequest, setDetailRequest] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/wfh");
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error loading WFH requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id, action) => {
    try {
      let admin_comment = "Approved";

      if (action === "REJECTED") {
        // default text agar user blank chhor de
        const input = window.prompt("Enter reason for rejection:");
        admin_comment = input && input.trim() ? input.trim() : "Rejected";
      }

      await api.put(`/api/wfh/${id}/action`, {
        status: action,
        admin_comment,
        approved_by: user.id,
      });

      const actionText = action === "APPROVED" ? "approved" : "rejected";
      toast.success(`Request ${actionText} successfully`);
      loadRequests();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Action failed";
      toast.error(msg);
    }
  };

  return (
    <div className="wfh-admin-root">
      {/* HEADER (same style as Attendance header) */}
      <div className="wfh-admin-header">
        <h1>Work From Home Requests</h1>
        <p>Review &amp; manage employee Work From Home submissions.</p>
      </div>

      {/* MAIN WHITE CARD */}
      <div className="wfh-admin-card">
        <div className="wfh-admin-list-header">
          <h3>WFH Request List</h3>
          <span className="wfh-admin-total">Total: {requests.length}</span>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="wfh-admin-table-wrapper">
            <table className="wfh-admin-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Admin Comment</th>
                  <th>Application</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="wfh-admin-empty">
                      No WFH requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {/* agar future mein employee_code / name aaye to use kar sakte ho */}
                        {r.employee_code
                          ? `${r.employee_code} ${r.first_name || ""} ${
                              r.last_name || ""
                            }`
                          : r.employee_id}
                      </td>
                      <td>{formatDate(r.request_date)}</td>
                      <td>
                        <span
                          className={`wfh-admin-status-pill status-${r.status}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td>{r.admin_comment || "-"}</td>
                      <td>
                        <button
                          type="button"
                          style={linkButtonStyle}
                          onClick={() => setDetailRequest(r)}
                        >
                          View application
                        </button>
                      </td>
                      <td>
                        {r.status === "PENDING" ? (
                          <div className="wfh-admin-actions">
                            <button
                              className="wfh-admin-btn wfh-admin-btn-approve"
                              onClick={() => handleAction(r.id, "APPROVED")}
                            >
                              Approve
                            </button>
                            <button
                              className="wfh-admin-btn wfh-admin-btn-reject"
                              onClick={() => handleAction(r.id, "REJECTED")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="wfh-admin-done">Completed</span>
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

      {/* FULL APPLICATION MODAL */}
      {detailRequest && (
        <div style={backdropStyle} onClick={() => setDetailRequest(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>WFH Application</h3>

            <p style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>
                {detailRequest.employee_code
                  ? `${detailRequest.employee_code} ${
                      detailRequest.first_name || ""
                    } ${detailRequest.last_name || ""}`
                  : detailRequest.employee_id}
              </strong>{" "}
              • {formatDate(detailRequest.request_date)}
            </p>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: 10,
                fontSize: 13,
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <strong>Reason</strong>
                <p style={{ marginTop: 4, whiteSpace: "pre-line" }}>
                  {detailRequest.reason || "-"}
                </p>
              </div>

              {detailRequest.admin_comment && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Admin Comment</strong>
                  <p style={{ marginTop: 4 }}>{detailRequest.admin_comment}</p>
                </div>
              )}
            </div>

            <div style={footerStyle}>
              <button
                type="button"
                style={closeBtnStyle}
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

export default AdminWFHRequestsPage;
