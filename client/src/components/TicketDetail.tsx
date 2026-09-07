import React, { useState, useEffect } from "react";
import {
  fetchTicketDetail,
  uploadAttachment,
  softRemoveAttachment,
  getAttachmentDownloadUrl,
  TicketDetail as TicketDetailType,
  Attachment,
  PriorityLevel,
  TicketStatus,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface TicketDetailProps {
  ticketId: string | number;
  onBack: () => void;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ACTIVE_ATTACHMENTS = 5;

export function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Soft Removal Modal State
  const [attachmentToRemove, setAttachmentToRemove] = useState<Attachment | null>(null);
  const [removeReason, setRemoveReason] = useState<string>("");
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Add Attachment Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const loadTicket = () => {
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
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId, currentRequester]);

  // Helper formatting
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // Badge Renderers
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

  // Attachment Actions
  const handleConfirmRemove = async () => {
    if (!attachmentToRemove || !currentRequester) return;

    setIsRemoving(true);
    setRemoveError(null);

    try {
      await softRemoveAttachment(
        attachmentToRemove.id,
        removeReason.trim(),
        currentRequester.id
      );
      setAttachmentToRemove(null);
      setRemoveReason("");
      loadTicket();
    } catch (err: any) {
      setRemoveError(err?.message || "Failed to remove attachment");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleFileSelectForUpload = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setUploadFile(null);
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Invalid file format "${file.name}". Allowed: JPG, PNG, WEBP, PDF.`);
      setUploadFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File "${file.name}" exceeds maximum allowed size of 5MB.`);
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !currentRequester || !ticket) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadAttachment(ticket.id, uploadFile, currentRequester.id);
      setShowUploadModal(false);
      setUploadFile(null);
      loadTicket();
    } catch (err: any) {
      setUploadError(err?.message || err?.data?.error || "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const activeAttachments = ticket?.attachments?.filter((a) => !a.isRemoved) || [];
  const removedAttachments = ticket?.attachments?.filter((a) => a.isRemoved) || [];

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
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between pb-3 mb-3 border-bottom gap-2">
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

          {/* Attachments Panel */}
          <div
            className="card shadow-sm border mb-4"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#D1D9D4", borderRadius: "8px" }}
          >
            <div className="card-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
              <h2 className="h6 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                Attachments ({activeAttachments.length} / {MAX_ACTIVE_ATTACHMENTS} Active)
              </h2>
              <button
                type="button"
                className="btn btn-sm text-white fw-semibold"
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                disabled={activeAttachments.length >= MAX_ACTIVE_ATTACHMENTS}
                onClick={() => setShowUploadModal(true)}
              >
                + Add Attachment
              </button>
            </div>

            <div className="card-body p-4">
              {/* Active Attachments Section */}
              <h3 className="h6 fw-semibold mb-3" style={{ color: "#1E2B24", fontSize: "14px" }}>
                Active Attachments
              </h3>

              {activeAttachments.length === 0 ? (
                <p className="text-muted small fst-italic mb-4">No active attachments on this ticket.</p>
              ) : (
                <div className="list-group mb-4">
                  {activeAttachments.map((att) => {
                    const downloadUrl = getAttachmentDownloadUrl(att.id, currentRequester?.id);
                    return (
                      <div
                        key={att.id}
                        className="list-group-item d-flex flex-column flex-sm-row align-items-sm-center justify-content-between py-2 px-3 mb-2 border rounded gap-2"
                        style={{ borderColor: "#D1D9D4" }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <span style={{ fontSize: "18px" }}>📄</span>
                          <div className="text-break">
                            <span className="fw-semibold text-dark me-2">{att.originalFileName}</span>
                            <span className="badge bg-secondary text-white small me-2">
                              {formatFileSize(att.fileSizeBytes)}
                            </span>
                            <span className="text-muted small">Uploaded {formatDate(att.createdAt)}</span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-success fw-semibold"
                            style={{ color: "#006B3C", borderColor: "#006B3C" }}
                            download={att.originalFileName}
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger fw-semibold"
                            style={{ color: "#B3261E", borderColor: "#B3261E" }}
                            onClick={() => {
                              setAttachmentToRemove(att);
                              setRemoveReason("");
                              setRemoveError(null);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Soft-Removed Attachments Audit Section */}
              {removedAttachments.length > 0 && (
                <div className="pt-3 border-top" style={{ borderColor: "#D1D9D4" }}>
                  <h3 className="h6 fw-semibold mb-3" style={{ color: "#556B60", fontSize: "14px" }}>
                    Removed Attachments History (Audit Record)
                  </h3>
                  <div className="list-group">
                    {removedAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="list-group-item d-flex flex-column flex-sm-row align-items-sm-center justify-content-between py-2 px-3 mb-2 border rounded gap-2"
                        style={{ backgroundColor: "#F5F7F6", borderColor: "#D1D9D4" }}
                      >
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          <span style={{ fontSize: "18px", opacity: 0.6 }}>🗑️</span>
                          <div className="text-break">
                            <span
                              className="fw-semibold text-muted text-decoration-line-through me-2"
                              style={{ color: "#556B60" }}
                            >
                              {att.originalFileName}
                            </span>
                            <span
                              className="badge px-2 py-1 me-2"
                              style={{ backgroundColor: "#F5F5F5", color: "#616161", border: "1px solid #E0E0E0" }}
                            >
                              Removed
                            </span>
                            <span className="text-muted small">
                              Removed {att.removedAt ? formatDate(att.removedAt) : "—"}
                            </span>
                            {att.removedReason && (
                              <div className="small text-muted fst-italic mt-1">
                                Reason: "{att.removedReason}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary disabled"
                            disabled
                            style={{ cursor: "not-allowed", opacity: 0.6 }}
                            title="Download access blocked for soft-removed files (HTTP 410 Gone)"
                          >
                            Unavailable
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Soft Removal Confirmation Modal */}
          {attachmentToRemove && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ borderRadius: "8px" }}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title text-danger fw-bold">Remove Attachment</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setAttachmentToRemove(null)}
                      disabled={isRemoving || !removeReason.trim()}
                      aria-label="Close"
                    ></button>
                  </div>
                  <div className="modal-body py-4">
                    <p className="mb-2 text-dark">
                      Are you sure you want to remove <strong>"{attachmentToRemove.originalFileName}"</strong>?
                    </p>
                    <p className="small text-muted mb-3">
                      This attachment will be soft-removed and will no longer be downloadable. Its audit metadata will remain in the ticket history.
                    </p>

                    {removeError && (
                      <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
                        {removeError}
                      </div>
                    )}

                    <div className="mb-3">
                      <label htmlFor="removalReason" className="form-label small fw-semibold text-dark">
                        Reason for removal <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="removalReason"
                        className="form-control"
                        placeholder="e.g. Uploaded incorrect file version"
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                        maxLength={255}
                      />
                    </div>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3"
                      onClick={() => setAttachmentToRemove(null)}
                      disabled={isRemoving || !removeReason.trim()}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger px-4 fw-semibold"
                      onClick={handleConfirmRemove}
                      disabled={isRemoving || !removeReason.trim()}
                      style={{ backgroundColor: "#B3261E", borderColor: "#B3261E" }}
                    >
                      {isRemoving ? "Removing…" : "Confirm Removal"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Attachment Modal */}
          {showUploadModal && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ borderRadius: "8px" }}>
                  <form onSubmit={handleUploadSubmit}>
                    <div className="modal-header border-bottom">
                      <h5 className="modal-title fw-bold" style={{ color: "#1E2B24" }}>
                        Add Attachment to Ticket
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => {
                          setShowUploadModal(false);
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        disabled={isUploading}
                        aria-label="Close"
                      ></button>
                    </div>

                    <div className="modal-body py-4">
                      {uploadError && (
                        <div className="alert alert-danger py-2 px-3 mb-3 small" role="alert">
                          {uploadError}
                        </div>
                      )}

                      <div className="mb-3">
                        <label htmlFor="modalFileInput" className="form-label small fw-semibold text-dark">
                          Select File <span className="text-danger">*</span>
                        </label>
                        <input
                          type="file"
                          id="modalFileInput"
                          className="form-control"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          onChange={(e) => handleFileSelectForUpload(e.target.files?.[0] || null)}
                        />
                        <div className="form-text small text-muted">
                          Allowed formats: JPG, PNG, WEBP, PDF (Max size: 5MB)
                        </div>
                      </div>

                      {uploadFile && (
                        <div className="p-3 bg-light rounded border d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <span>📄</span>
                            <span className="fw-semibold text-dark">{uploadFile.name}</span>
                          </div>
                          <span className="badge bg-secondary">{formatFileSize(uploadFile.size)}</span>
                        </div>
                      )}
                    </div>

                    <div className="modal-footer border-top bg-light">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-3"
                        onClick={() => {
                          setShowUploadModal(false);
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn text-white px-4 fw-semibold"
                        disabled={!uploadFile || isUploading}
                        style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                      >
                        {isUploading ? "Uploading…" : "Upload Attachment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TicketDetail;

