import React, { useState, useEffect } from "react";
import { fetchTicketDetail, TicketDetail as TicketDetailType, PriorityLevel, TicketStatus } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface TicketDetailProps {
  ticketId: string | number;
  onBack: () => void;
}

export function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRequester) return;

    setLoading(true);
    setError(null);

    fetchTicketDetail(ticketId, currentRequester.id)
      .then(setTicket)
      .catch((err: any) => {
        setError(err?.message || "Ticket not found or access denied");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticketId, currentRequester]);

  // Helper Badge Renderers
  const renderPriorityBadge = (priority: PriorityLevel | null) => {
    if (!priority) return <span className="text-muted small">Unassigned</span>;

    const styles: Record<PriorityLevel, React.CSSProperties> = {
      LOW: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      MEDIUM: { backgroundColor: "#FFF8E1", color: "#B78103", border: "1px solid #FFE082" },
      HIGH: { backgroundColor: "#FBE9E7", color: "#D84315", border: "1px solid #FFCCBC" },
      URGENT: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    return (
      <span className="badge font-monospace fw-semibold px-2 py-1" style={{ fontSize: "12px", ...styles[priority] }}>
        {priority}
      </span>
    );
  };

  const renderStatusBadge = (statusVal: TicketStatus) => {
    const styles: Record<TicketStatus, React.CSSProperties> = {
      NEW: { backgroundColor: "#EAF6EF", color: "#006B3C", border: "1px solid #A3D9B8" },
      OPEN: { backgroundColor: "#E3F2FD", color: "#1565C0", border: "1px solid #BBDEFB" },
      IN_PROGRESS: { backgroundColor: "#E8F5E9", color: "#2E7D32", border: "1px solid #C8E6C9" },
      RESOLVED: { backgroundColor: "#ECEFF1", color: "#455A64", border: "1px solid #CFD8DC" },
      CLOSED: { backgroundColor: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" },
      CANCELLED: { backgroundColor: "#FFEBEE", color: "#C62828", border: "1px solid #FFCDD2" },
    };

    const labels: Record<TicketStatus, string> = {
      NEW: "NEW",
      OPEN: "OPEN",
      IN_PROGRESS: "IN PROGRESS",
      RESOLVED: "RESOLVED",
      CLOSED: "CLOSED",
      CANCELLED: "CANCELLED",
    };

    return (
      <span className="badge font-monospace fw-semibold px-2 py-1" style={{ fontSize: "12px", ...styles[statusVal] }}>
        {labels[statusVal] || statusVal}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="container p-0 mx-auto" style={{ maxWidth: "860px" }}>
      {/* Top Header & Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0 small">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                onClick={onBack}
                style={{ color: "#006B3C", fontSize: "14px" }}
              >
                My Tickets
              </button>
            </li>
            <li className="breadcrumb-item active" aria-current="page" style={{ color: "#556B60" }}>
              Ticket Details
            </li>
          </ol>
        </nav>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary fw-semibold"
          onClick={onBack}
          style={{ fontSize: "13px" }}
        >
          &larr; Back to My Tickets
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card shadow-sm border p-5 text-center my-3" style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4" }}>
          <div className="spinner-border text-success mx-auto mb-2" role="status" style={{ color: "#006B3C" }}>
            <span className="visually-hidden">Loading ticket details…</span>
          </div>
          <p className="text-muted mb-0 small">Loading ticket details…</p>
        </div>
      )}

      {/* Error / Unauthorized State */}
      {!loading && error && (
        <div
          className="card shadow-sm border text-center p-5 my-3"
          style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
        >
          <div className="display-4 mb-3 text-danger" aria-hidden="true">🔒</div>
          <h2 className="h5 fw-bold mb-2" style={{ color: "#1E2B24" }}>
            Ticket Not Found or Access Denied
          </h2>
          <p className="text-muted small mx-auto mb-4" style={{ maxWidth: "420px" }}>
            {error || "The requested ticket does not exist or you do not have permission to view it."}
          </p>
          <div>
            <button
              type="button"
              className="btn text-white fw-semibold px-4 py-2"
              onClick={onBack}
              style={{ backgroundColor: "#006B3C" }}
            >
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {/* Read-Only Ticket Details Card */}
      {!loading && !error && ticket && (
        <>
          <div
            className="card shadow-sm border mb-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
                <div>
                  <h1 className="h4 fw-bold mb-1 font-monospace" style={{ color: "#006B3C" }}>
                    {ticket.ticketNumber}
                  </h1>
                  <span className="text-muted small">Submitted on {formatDate(ticket.createdAt)}</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small me-1">Status:</span>
                  {renderStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Classification Grid (Read-Only) */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Category</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.category?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Related System</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.relatedSystem?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Requester</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.requester?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Requested Priority</label>
                  <div
                    className="p-2 border rounded d-flex align-items-center"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", height: "38px" }}
                  >
                    {renderPriorityBadge(ticket.requestedPriority)}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">IT Priority</label>
                  <div
                    className="p-2 border rounded d-flex align-items-center"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", height: "38px" }}
                  >
                    {renderPriorityBadge(ticket.itPriority)}
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label text-muted small fw-semibold mb-1">Assigned IT Owner</label>
                  <div
                    className="p-2 border rounded text-dark"
                    style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", fontSize: "14px", cursor: "default" }}
                  >
                    {ticket.ticketOwnerName || "Unassigned"}
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="mb-4">
                <label className="form-label text-muted small fw-semibold mb-1">Ticket Summary</label>
                <div
                  className="p-3 border rounded fw-semibold"
                  style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", color: "#1E2B24", fontSize: "15px" }}
                >
                  {ticket.summary}
                </div>
              </div>

              {/* Description Section */}
              <div className="mb-4">
                <label className="form-label text-muted small fw-semibold mb-1">Description</label>
                <div
                  className="p-3 border rounded text-wrap"
                  style={{
                    backgroundColor: "#F0F4F1",
                    borderColor: "#D1D9D4",
                    color: "#1E2B24",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                    minHeight: "100px",
                  }}
                >
                  {ticket.description}
                </div>
              </div>

              {/* Resolution Summary Section */}
              <div>
                <label className="form-label text-muted small fw-semibold mb-1">Resolution Summary</label>
                <div
                  className="p-3 border rounded fst-italic"
                  style={{ backgroundColor: "#F0F4F1", borderColor: "#D1D9D4", color: "#556B60", fontSize: "14px" }}
                >
                  {ticket.resolutionSummary || "No resolution summary available yet."}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section Placeholder */}
          <div
            className="card shadow-sm border mb-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
          >
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h2 className="h6 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                Attachments (0)
              </h2>
            </div>
            <div className="card-body p-4 text-center text-muted small">
              No attachments associated with this ticket.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TicketDetail;
