import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export const ChangePassword: React.FC = () => {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Live password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumberAndSpecial = /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match");
      return;
    }

    if (!hasMinLength || !hasUpperAndLower || !hasNumberAndSpecial) {
      setErrorMessage("New password does not meet all security policy requirements");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to change password. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "75vh" }}
    >
      <div className="w-100" style={{ maxWidth: "460px" }}>
        <div
          className="card shadow-sm border"
          style={{
            borderRadius: "12px",
            borderColor: "#D1D9D4",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="card-body p-4">
            {/* Header */}
            <div className="mb-3 text-start">
              <h1 className="h5 fw-bold mb-1" style={{ color: "#1E2B24" }}>
                Change Your Password
              </h1>
              <p className="text-muted small mb-0">
                You must change your password to continue.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                className="alert alert-danger py-2 px-3 mb-3 small d-flex align-items-center"
                role="alert"
                style={{
                  borderRadius: "8px",
                  backgroundColor: "#FDF2F2",
                  borderColor: "#F8B4B4",
                  color: "#9B1C1C",
                }}
              >
                <span className="me-2" aria-hidden="true">⚠️</span>
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3 text-start">
                <label htmlFor="currentPassInput" className="form-label fw-semibold small" style={{ color: "#2D3732" }}>
                  Current (temporary) password
                </label>
                <div className="input-group">
                  <input
                    id="currentPassInput"
                    type={showCurrent ? "text" : "password"}
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    style={{ borderRadius: "8px 0 0 8px", borderColor: "#D1D9D4", fontSize: "14px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                    style={{ borderRadius: "0 8px 8px 0", borderColor: "#D1D9D4", backgroundColor: "#F8FAF9" }}
                  >
                    {showCurrent ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div className="mb-3 text-start">
                <label htmlFor="newPassInput" className="form-label fw-semibold small" style={{ color: "#2D3732" }}>
                  New password
                </label>
                <div className="input-group">
                  <input
                    id="newPassInput"
                    type={showNew ? "text" : "password"}
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    style={{ borderRadius: "8px 0 0 8px", borderColor: "#D1D9D4", fontSize: "14px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                    style={{ borderRadius: "0 8px 8px 0", borderColor: "#D1D9D4", backgroundColor: "#F8FAF9" }}
                  >
                    {showNew ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div className="mb-3 text-start">
                <label htmlFor="confirmPassInput" className="form-label fw-semibold small" style={{ color: "#2D3732" }}>
                  Confirm new password
                </label>
                <input
                  id="confirmPassInput"
                  type={showNew ? "text" : "password"}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{ borderRadius: "8px", borderColor: "#D1D9D4", fontSize: "14px" }}
                />
              </div>

              {/* Password Requirements Checklist */}
              <div
                className="p-3 mb-4 rounded text-start"
                style={{ backgroundColor: "#F5F7F6", border: "1px solid #E2E8E4", fontSize: "13px" }}
              >
                <div className="fw-semibold mb-2" style={{ color: "#2D3732" }}>
                  Password must:
                </div>
                <div className="d-flex align-items-center mb-1">
                  <span className="me-2" style={{ color: hasMinLength ? "#006B3C" : "#8A9A90" }}>
                    {hasMinLength ? "✓" : "○"}
                  </span>
                  <span style={{ color: hasMinLength ? "#006B3C" : "#556B60" }}>
                    Be at least 8 characters
                  </span>
                </div>
                <div className="d-flex align-items-center mb-1">
                  <span className="me-2" style={{ color: hasUpperAndLower ? "#006B3C" : "#8A9A90" }}>
                    {hasUpperAndLower ? "✓" : "○"}
                  </span>
                  <span style={{ color: hasUpperAndLower ? "#006B3C" : "#556B60" }}>
                    Include upper and lower case letters
                  </span>
                </div>
                <div className="d-flex align-items-center">
                  <span className="me-2" style={{ color: hasNumberAndSpecial ? "#006B3C" : "#8A9A90" }}>
                    {hasNumberAndSpecial ? "✓" : "○"}
                  </span>
                  <span style={{ color: hasNumberAndSpecial ? "#006B3C" : "#556B60" }}>
                    Include a number and a special character
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="btn w-100 fw-bold py-2 text-white"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#006B3C",
                  borderColor: "#006B3C",
                  borderRadius: "8px",
                  fontSize: "15px",
                }}
              >
                {isSubmitting ? "Updating Password…" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
