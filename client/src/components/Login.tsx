import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

export const Login: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email address and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "75vh" }}
    >
      <div className="w-100" style={{ maxWidth: "420px" }}>
        <div
          className="card shadow-sm border"
          style={{
            borderRadius: "12px",
            borderColor: "#D1D9D4",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="card-body p-4">
            {/* Header / Brand */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "#EAF6EF",
                  color: "#006B3C",
                  fontSize: "28px",
                }}
              >
                🎫
              </div>
              <h1 className="h5 fw-bold mb-1" style={{ color: "#1E2B24" }}>
                Sign in to your account
              </h1>
              <p className="text-muted small mb-0">
                Enter your TokTickIT credentials to access your support portal
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

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3 text-start">
                <label htmlFor="emailInput" className="form-label fw-semibold small" style={{ color: "#2D3732" }}>
                  Email address
                </label>
                <input
                  id="emailInput"
                  type="email"
                  className="form-control"
                  placeholder="e.g. user@toktickit.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{
                    borderRadius: "8px",
                    borderColor: "#D1D9D4",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div className="mb-4 text-start">
                <label htmlFor="passwordInput" className="form-label fw-semibold small" style={{ color: "#2D3732" }}>
                  Password
                </label>
                <div className="input-group">
                  <input
                    id="passwordInput"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    style={{
                      borderRadius: "8px 0 0 8px",
                      borderColor: "#D1D9D4",
                      fontSize: "14px",
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      borderRadius: "0 8px 8px 0",
                      borderColor: "#D1D9D4",
                      backgroundColor: "#F8FAF9",
                    }}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
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
                {isSubmitting ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        {/* Development Help / Credential Hints */}
        <div className="text-center mt-3 text-muted small" style={{ fontSize: "12px" }}>
          <span>Lab Development Default Credentials: <code>Password123!</code></span>
        </div>
      </div>
    </div>
  );
};
