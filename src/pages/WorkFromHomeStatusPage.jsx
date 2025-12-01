// src/pages/WorkFromHomeStatusPage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import "../styles/WorkFromHomeRequestPage.css";
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

const WorkFromHomeStatusPage = () => {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMyRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.get("/api/wfh/my-requests");
      setMyRequests(res.data || []);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Error loading WFH requests";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="wfh-root">
      {/* PAGE HEADER */}
      <div className="wfh-header">
        <h1>Work From Home Status</h1>
        <p>Track the status of all your Work From Home requests.</p>
      </div>

      {/* MAIN CARD */}
      <div className="wfh-card">
        <div className="wfh-section-header wfh-section-header--sub">
          <h3>My Work From Home Requests</h3>
          <p>Below is the history of your submitted WFH requests.</p>
        </div>

        <div className="wfh-table-wrapper">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="wfh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Admin Remark</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="wfh-no-data">
                      No requests yet.
                    </td>
                  </tr>
                ) : (
                  myRequests.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.request_date)}</td>
                      <td>
                        <span className={`wfh-status-pill status-${r.status}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div className="wfh-admin-reason" title={r.reason}>
                          {r.reason}
                        </div>
                      </td>
                      <td>{r.admin_comment || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkFromHomeStatusPage;
