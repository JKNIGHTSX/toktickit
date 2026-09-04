import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";

export interface RequesterSelectProps {
  onContinue?: () => void;
}

export const RequesterSelect: React.FC<RequesterSelectProps> = ({ onContinue }) => {
  const { requesters, isLoading, error, selectRequester, refreshRequesters } = useRequester();
  const [selectedId, setSelectedId] = useState<string>("");

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const idNum = parseInt(selectedId, 10);
    selectRequester(idNum);
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5 px-3" style={{ minHeight: "80vh" }}>
      <div
        className="card shadow-sm border"
        style={{
          maxWidth: "520px",
          width: "100%",
          borderRadius: "8px",
          borderColor: "#D1D9D4",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-4 p-md-5">
          {/* Header & Icon */}
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#EAF6EF",
                color: "#006B3C",
                fontSize: "24px",
              }}
              aria-hidden="true"
            >
              👤
            </div>
            <h1 className="h4 fw-bold" style={{ color: "#1E2B24" }}>
              Select Development Requester
            </h1>
            <p className="text-muted small mb-0">
              Choose a development requester to simulate the current requester context for Lab 2.
              <br />
              <strong className="text-secondary">This is for testing only and is not a login screen.</strong>
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-4 text-muted" role="status">
              <div className="spinner-border spinner-border-sm text-success me-2" role="status" aria-hidden="true" />
              <span>Loading development requesters…</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="alert alert-danger d-flex align-items-center justify-content-between mb-4" role="alert">
              <div>
                <strong>Error:</strong> {error}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={() => refreshRequesters()}
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && requesters.length === 0 && (
            <div className="alert alert-warning mb-4" role="alert">
              <strong>No active requesters:</strong> No active development requesters found in the database. Please ensure seed data is loaded.
            </div>
          )}

          {/* Form */}
          {!isLoading && !error && requesters.length > 0 && (
            <form onSubmit={handleContinue}>
              <div className="mb-3">
                <label htmlFor="dev-requester-select" className="form-label fw-semibold" style={{ color: "#1E2B24" }}>
                  Development Requester <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <select
                  id="dev-requester-select"
                  className="form-select form-select-lg"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{
                    borderColor: "#D1D9D4",
                    fontSize: "15px",
                  }}
                  required
                >
                  <option value="">-- Choose an active requester --</option>
                  {requesters.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name} {req.department ? `(${req.department})` : ""}
                    </option>
                  ))}
                </select>
                <div className="form-text mt-1 text-muted" style={{ fontSize: "12px" }}>
                  ℹ️ Only active development requesters are shown.
                </div>
              </div>

              {/* Lab 3 roadmap notice */}
              <div
                className="p-3 mb-4 rounded border"
                style={{
                  backgroundColor: "#EAF6EF",
                  borderColor: "#A3D9B8",
                  color: "#006B3C",
                  fontSize: "13px",
                }}
              >
                <strong>🔒 Authentication coming in Lab 3:</strong>
                <p className="mb-0 mt-1" style={{ fontSize: "12px", color: "#1E2B24" }}>
                  In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
                </p>
              </div>

              {/* Actions */}
              <div className="d-grid">
                <button
                  type="submit"
                  className="btn btn-lg fw-semibold text-white"
                  disabled={!selectedId}
                  style={{
                    backgroundColor: selectedId ? "#006B3C" : "#A3C2B3",
                    borderColor: selectedId ? "#006B3C" : "#A3C2B3",
                    cursor: selectedId ? "pointer" : "not-allowed",
                  }}
                >
                  Continue →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
