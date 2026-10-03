import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { TicketDetail } from "./components/TicketDetail.js";
import { RequesterSelect } from "./components/RequesterSelect.js";

type UiState = "idle" | "loading" | "success" | "error";

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { currentRequester, clearRequester } = useRequester();

  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [view, setView] = useState<"create-ticket" | "my-tickets" | "ticket-detail">("create-ticket");
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err: any) {
      setErrorMessage(err?.message || "Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatRoleLabel = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "Admin";
      case "IT_STAFF":
        return "IT Staff";
      case "REQUESTER":
      default:
        return "Requester";
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return { backgroundColor: "#FEF3C7", color: "#92400E" };
      case "IT_STAFF":
        return { backgroundColor: "#EBF5FF", color: "#1D4ED8" };
      case "REQUESTER":
      default:
        return { backgroundColor: "#EAF6EF", color: "#006B3C" };
    }
  };

  if (authLoading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", backgroundColor: "#F5F7F6" }}
      >
        <div className="text-center text-muted">
          <div className="spinner-border text-success mb-2" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <div className="small fw-semibold" style={{ color: "#006B3C" }}>
            Loading TokTickIT Session…
          </div>
        </div>
      </div>
    );
  }

  // Mandatory First-Login Password Change Intercept
  if (isAuthenticated && user?.mustChangePassword) {
    return (
      <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }}>
        <nav
          className="navbar px-3 px-md-4"
          style={{
            backgroundColor: "#006B3C",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <div className="container-fluid d-flex align-items-center justify-content-between p-0">
            <div className="navbar-brand text-white fw-bold mb-0 d-flex align-items-center">
              <span className="me-2" style={{ fontSize: "20px" }} aria-hidden="true">🎫</span>
              <span>TokTickIT Security</span>
            </div>
            <button
              type="button"
              className="btn btn-sm text-white px-2 py-1"
              onClick={logout}
              style={{
                borderColor: "rgba(255,255,255,0.4)",
                backgroundColor: "rgba(0,0,0,0.15)",
                fontSize: "12px",
              }}
            >
              Sign Out
            </button>
          </div>
        </nav>
        <main className="container py-4">
          <ChangePassword />
        </main>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#F5F7F6", minHeight: "100vh" }}>
      {/* Zen Green Navigation Header */}
      <nav
        className="navbar navbar-expand px-3 px-md-4"
        style={{
          backgroundColor: "#006B3C",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div className="container-fluid d-flex align-items-center justify-content-between p-0">
          <div className="navbar-brand text-white fw-bold mb-0 d-flex align-items-center me-2">
            <span className="me-2" style={{ fontSize: "20px" }} aria-hidden="true">🎫</span>
            <span>
              TokTickIT <span className="d-none d-sm-inline" style={{ opacity: 0.85, fontWeight: 400, fontSize: "14px" }}>IT Service Desk</span>
            </span>
          </div>

          {/* Authenticated User / Requester Badge */}
          {isAuthenticated && user ? (
            <div className="d-flex align-items-center gap-2 gap-sm-3">
              <div className="d-flex align-items-center text-white">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold flex-shrink-0"
                  style={{
                    width: "34px",
                    height: "34px",
                    backgroundColor: "#EAF6EF",
                    color: "#006B3C",
                    fontSize: "13px",
                  }}
                  title={user.email}
                >
                  {getInitials(user.name)}
                </div>
                <div className="d-none d-sm-block text-start" style={{ lineHeight: "1.2" }}>
                  <div className="d-flex align-items-center gap-1">
                    <span className="fw-semibold" style={{ fontSize: "13px" }}>
                      {user.name}
                    </span>
                    <span
                      className="badge rounded-pill px-2 py-1 ms-1"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        ...getRoleBadgeStyle(user.role),
                      }}
                    >
                      {formatRoleLabel(user.role)}
                    </span>
                  </div>
                  {user.email && (
                    <div style={{ fontSize: "11px", opacity: 0.8 }}>
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm text-white px-2 py-1"
                onClick={logout}
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                Logout
              </button>
            </div>
          ) : currentRequester ? (
            <div className="d-flex align-items-center gap-2 gap-sm-3">
              <div className="d-flex align-items-center text-white">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center me-1 me-sm-2 fw-bold flex-shrink-0"
                  style={{
                    width: "34px",
                    height: "34px",
                    backgroundColor: "#EAF6EF",
                    color: "#006B3C",
                    fontSize: "13px",
                  }}
                  title={currentRequester.email}
                >
                  {getInitials(currentRequester.name)}
                </div>
                <div className="d-none d-sm-block text-start" style={{ lineHeight: "1.2" }}>
                  <div className="fw-semibold" style={{ fontSize: "13px" }}>
                    {currentRequester.name}
                  </div>
                  {currentRequester.department && (
                    <div style={{ fontSize: "11px", opacity: 0.8 }}>
                      {currentRequester.department}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm text-white px-2 py-1"
                onClick={clearRequester}
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                Change Requester
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      {/* Main Body */}
      <main className="container py-4">
        {!isAuthenticated && !currentRequester ? (
          <div>
            {/* Primary Login Screen */}
            <Login />

            {/* Development Requester Selector Fallback for Lab 2 continuity */}
            <div className="mt-4 text-center">
              <details className="text-muted small">
                <summary className="cursor-pointer text-decoration-underline" style={{ cursor: "pointer" }}>
                  Development Requester Context Selector (Lab 2 Legacy Mode)
                </summary>
                <div className="mt-3">
                  <RequesterSelect />
                </div>
              </details>
            </div>

            {/* System Diagnostics Utility */}
            <div className="mx-auto mt-4" style={{ maxWidth: 520 }}>
              <div
                className="card shadow-sm border"
                style={{
                  borderRadius: "8px",
                  borderColor: "#D1D9D4",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div className="card-body p-4">
                  <h2 className="h6 fw-bold mb-2" style={{ color: "#1E2B24" }}>
                    System Diagnostics & Health Check
                  </h2>
                  <p className="text-muted small mb-3">
                    Verify connectivity with backend API and PostgreSQL database services.
                  </p>
                  <button
                    className="btn btn-sm btn-outline-success fw-semibold"
                    onClick={handleCheck}
                    disabled={state === "loading"}
                    style={{ borderColor: "#006B3C", color: "#006B3C" }}
                  >
                    {state === "loading" ? "Loading…" : "Check System"}
                  </button>

                  {state === "loading" && (
                    <div className="mt-3 text-muted small">
                      <em>Loading…</em>
                    </div>
                  )}

                  {state === "success" && (
                    <div className="mt-3 text-start">
                      <p className="fw-bold mb-2 small">
                        System Status: <span className="text-success">Online</span>
                      </p>
                      {categories.length > 0 && (
                        <div>
                          <h3 className="h6 mt-2 mb-1" style={{ fontSize: "13px" }}>Supported Request Categories</h3>
                          <ol className="list-group list-group-numbered small">
                            {categories.map((cat) => (
                              <li key={cat.id} className="list-group-item py-1">
                                {cat.name}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {state === "error" && (
                    <div className="mt-3 text-start">
                      <p className="fw-bold text-danger mb-1 small">System Status: Offline</p>
                      <div className="text-danger small">{errorMessage || "Unable to connect to TokTickIT API"}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Tab Navigation for Logged-In User / Requester */}
            <ul className="nav nav-tabs mb-4" style={{ borderColor: "#D1D9D4" }}>
              <li className="nav-item">
                <button
                  className={`nav-link ${view === "create-ticket" ? "active fw-bold" : ""}`}
                  onClick={() => setView("create-ticket")}
                  style={{
                    color: view === "create-ticket" ? "#006B3C" : "#556B60",
                    backgroundColor: view === "create-ticket" ? "#EAF6EF" : "transparent",
                    borderColor: view === "create-ticket" ? "#D1D9D4 #D1D9D4 #EAF6EF" : "transparent",
                  }}
                >
                  + Create Ticket
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${view === "my-tickets" ? "active fw-bold" : ""}`}
                  onClick={() => setView("my-tickets")}
                  style={{
                    color: view === "my-tickets" ? "#006B3C" : "#556B60",
                    backgroundColor: view === "my-tickets" ? "#EAF6EF" : "transparent",
                    borderColor: view === "my-tickets" ? "#D1D9D4 #D1D9D4 #EAF6EF" : "transparent",
                  }}
                >
                  My Tickets
                </button>
              </li>
            </ul>

            {view === "create-ticket" && (
              <CreateTicket onCancel={() => setView("my-tickets")} />
            )}
            {view === "my-tickets" && (
              <MyTickets
                onCreateTicket={() => setView("create-ticket")}
                onSelectTicket={(id) => {
                  setSelectedTicketId(id);
                  setView("ticket-detail");
                }}
              />
            )}
            {view === "ticket-detail" && selectedTicketId !== null && (
              <TicketDetail
                ticketId={selectedTicketId}
                onBack={() => setView("my-tickets")}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppContent />
      </RequesterProvider>
    </AuthProvider>
  );
}
