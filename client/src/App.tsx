import { useState, useEffect } from "react";
import { checkSystem, Category } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { TicketDetail } from "./components/TicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { UserManagement } from "./components/UserManagement.js";
import { StaffDashboard } from "./components/StaffDashboard.js";
import { RequesterDashboard } from "./components/RequesterDashboard.js";

type UiState = "idle" | "loading" | "success" | "error";

type ViewType =
  | "staff-dashboard"
  | "create-ticket"
  | "my-tickets"
  | "ticket-detail"
  | "staff-queue"
  | "user-management"
  | "requester-dashboard";

function getDefaultView(role?: string): ViewType {
  switch (role) {
    case "ADMINISTRATOR":
      return "staff-dashboard";
    case "IT_STAFF":
      return "staff-dashboard";
    case "REQUESTER":
    default:
      return "requester-dashboard";
  }
}

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, successMessage, logout } = useAuth();

  const isStaffOrAdmin = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const isAdmin = user?.role === "ADMINISTRATOR";

  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [view, setView] = useState<ViewType>(
    user ? getDefaultView(user.role) : "requester-dashboard"
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | number | null>(null);
  const [queueFilter, setQueueFilter] = useState<{ status?: string; assignedTo?: string }>({});
  const [myTicketsFilter, setMyTicketsFilter] = useState<{ status?: string }>({});

  // Whenever the authenticated role changes (login/logout), reset to role-appropriate default
  useEffect(() => {
    if (!user) return;
    const defaultView = getDefaultView(user.role);
    // Only redirect if currently on a view the user shouldn't be on
    const staffViews: ViewType[] = ["staff-dashboard", "staff-queue", "user-management"];
    const requesterViews: ViewType[] = ["requester-dashboard", "create-ticket", "my-tickets"];

    if (user.role === "ADMINISTRATOR") {
      if (!staffViews.includes(view) && view !== "ticket-detail") {
        setView(defaultView);
      }
    } else if (user.role === "IT_STAFF") {
      if (!staffViews.includes(view) && view !== "ticket-detail") {
        setView(defaultView);
      }
    } else if (user.role === "REQUESTER") {
      if (!requesterViews.includes(view) && view !== "ticket-detail") {
        setView(defaultView);
      }
    }
  }, [user?.role]);

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
        return { backgroundColor: "#EDE7F6", color: "#512DA8" };
      case "IT_STAFF":
        return { backgroundColor: "#E1F5FE", color: "#0277BD" };
      case "REQUESTER":
      default:
        return { backgroundColor: "#E8F5E9", color: "#2E7D32" };
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

  // Shared active-tab style helper
  const activeTabStyle = (isActive: boolean) => ({
    color: isActive ? "#006B3C" : "#556B60",
    backgroundColor: isActive ? "#EAF6EF" : "transparent",
    borderColor: isActive ? "#D1D9D4 #D1D9D4 #EAF6EF" : "transparent",
    borderBottom: isActive ? "3px solid #006B3C" : "3px solid transparent",
    fontWeight: isActive ? 700 : 400,
  });

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

          {/* Authenticated User Badge */}
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
          ) : null}
        </div>
      </nav>

      {/* Main Body */}
      <main className="container py-4">
        {successMessage && (
          <div className="alert alert-success" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}
        {!isAuthenticated ? (
          <div>
            {/* Primary Login Screen */}
            <Login />

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
            {/* ── Administrator Navigation ── */}
            {isAdmin ? (
              <div>
                <ul className="nav nav-tabs mb-4" style={{ borderColor: "#D1D9D4" }}>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "staff-dashboard" ? "active fw-bold" : ""}`}
                      id="nav-admin-dashboard"
                      onClick={() => setView("staff-dashboard")}
                      style={activeTabStyle(view === "staff-dashboard")}
                    >
                      📊 Dashboard
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "staff-queue" || view === "ticket-detail" ? "active fw-bold" : ""}`}
                      id="nav-ticket-queue"
                      onClick={() => {
                        setQueueFilter({});
                        setView("staff-queue");
                      }}
                      style={activeTabStyle(view === "staff-queue" || view === "ticket-detail")}
                    >
                      🗂 Ticket Queue
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "user-management" ? "active fw-bold" : ""}`}
                      id="nav-user-management"
                      onClick={() => setView("user-management")}
                      style={activeTabStyle(view === "user-management")}
                    >
                      👥 User Management
                    </button>
                  </li>
                </ul>

                {view === "staff-dashboard" && (
                  <StaffDashboard
                    onNavigateQueue={(filter) => {
                      setQueueFilter(filter || {});
                      setView("staff-queue");
                    }}
                    onSelectTicket={(id) => {
                      setSelectedTicketId(id);
                      setView("ticket-detail");
                    }}
                    onCreateTicket={() => setView("create-ticket")}
                  />
                )}
                {view === "staff-queue" && (
                  <StaffTicketQueue
                    initialFilter={queueFilter}
                    filter={queueFilter}
                    onSelectTicket={(id) => {
                      setSelectedTicketId(id);
                      setView("ticket-detail");
                    }}
                    onCreateTicket={() => setView("create-ticket")}
                  />
                )}
                {view === "ticket-detail" && selectedTicketId !== null && (
                  <TicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => setView("staff-queue")}
                  />
                )}
                {view === "user-management" && <UserManagement />}
              </div>
            ) : isStaffOrAdmin ? (
              /* ── IT Staff Navigation ── */
              <div>
                <ul className="nav nav-tabs mb-4" style={{ borderColor: "#D1D9D4" }}>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "staff-dashboard" ? "active fw-bold" : ""}`}
                      id="nav-staff-dashboard"
                      onClick={() => setView("staff-dashboard")}
                      style={activeTabStyle(view === "staff-dashboard")}
                    >
                      📊 Dashboard
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "staff-queue" || view === "ticket-detail" ? "active fw-bold" : ""}`}
                      id="nav-ticket-queue"
                      onClick={() => {
                        setQueueFilter({});
                        setView("staff-queue");
                      }}
                      style={activeTabStyle(view === "staff-queue" || view === "ticket-detail")}
                    >
                      🗂 Ticket Queue
                    </button>
                  </li>
                </ul>

                {view === "staff-dashboard" && (
                  <StaffDashboard
                    onNavigateQueue={(filter) => {
                      setQueueFilter(filter || {});
                      setView("staff-queue");
                    }}
                    onSelectTicket={(id) => {
                      setSelectedTicketId(id);
                      setView("ticket-detail");
                    }}
                    onCreateTicket={() => setView("create-ticket")}
                  />
                )}
                {view === "staff-queue" && (
                  <StaffTicketQueue
                    initialFilter={queueFilter}
                    filter={queueFilter}
                    onSelectTicket={(id) => {
                      setSelectedTicketId(id);
                      setView("ticket-detail");
                    }}
                    onCreateTicket={() => setView("create-ticket")}
                  />
                )}
                {view === "ticket-detail" && selectedTicketId !== null && (
                  <TicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => setView("staff-queue")}
                  />
                )}
              </div>
            ) : (
              /* ── Requester Navigation ── */
              <div>
                <ul className="nav nav-tabs mb-4" style={{ borderColor: "#D1D9D4" }}>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "requester-dashboard" ? "active fw-bold" : ""}`}
                      id="nav-requester-dashboard"
                      onClick={() => setView("requester-dashboard")}
                      style={activeTabStyle(view === "requester-dashboard")}
                    >
                      📊 Dashboard
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "create-ticket" ? "active fw-bold" : ""}`}
                      onClick={() => setView("create-ticket")}
                      style={activeTabStyle(view === "create-ticket")}
                    >
                      + Create Ticket
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${view === "my-tickets" ? "active fw-bold" : ""}`}
                      onClick={() => {
                        setMyTicketsFilter({});
                        setView("my-tickets");
                      }}
                      style={activeTabStyle(view === "my-tickets")}
                    >
                      My Tickets
                    </button>
                  </li>
                </ul>

                {view === "requester-dashboard" && (
                  <RequesterDashboard
                    onNavigateTickets={(filter) => {
                      setMyTicketsFilter(filter || {});
                      setView("my-tickets");
                    }}
                    onSelectTicket={(id) => {
                      setSelectedTicketId(id);
                      setView("ticket-detail");
                    }}
                    onCreateTicket={() => setView("create-ticket")}
                  />
                )}
                {view === "create-ticket" && (
                  <CreateTicket onCancel={() => setView("my-tickets")} />
                )}
                {view === "my-tickets" && (
                  <MyTickets
                    initialFilter={myTicketsFilter}
                    filter={myTicketsFilter}
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
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
