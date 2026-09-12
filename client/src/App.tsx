import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { RequesterSelect } from "./components/RequesterSelect.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { TicketDetail } from "./components/TicketDetail.js";

type UiState = "idle" | "loading" | "success" | "error";

function AppContent() {
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

          {/* Active Requester Context Badge / Switcher in Header */}
          {currentRequester ? (
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
          ) : (
            <div className="text-white small opacity-75 d-none d-sm-block">
              Development Requester Context (Not Authenticated)
            </div>
          )}
        </div>
      </nav>

      {/* Main Body */}
      <main className="container py-4">
        {!currentRequester ? (
          <div>
            <RequesterSelect />
            
            {/* System Diagnostic Utility (Lab 1 Foundation) */}
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
                    <div className="mt-3">
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
                    <div className="mt-3">
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
            {/* Tab Navigation for Logged-In Requester */}
            <ul className="nav nav-tabs mb-4" style={{ borderColor: '#D1D9D4' }}>
              <li className="nav-item">
                <button
                  className={`nav-link ${view === 'create-ticket' ? 'active fw-bold' : ''}`}
                  onClick={() => setView('create-ticket')}
                  style={{
                    color: view === 'create-ticket' ? '#006B3C' : '#556B60',
                    backgroundColor: view === 'create-ticket' ? '#EAF6EF' : 'transparent',
                    borderColor: view === 'create-ticket' ? '#D1D9D4 #D1D9D4 #EAF6EF' : 'transparent'
                  }}
                >
                  + Create Ticket
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${view === 'my-tickets' ? 'active fw-bold' : ''}`}
                  onClick={() => setView('my-tickets')}
                  style={{
                    color: view === 'my-tickets' ? '#006B3C' : '#556B60',
                    backgroundColor: view === 'my-tickets' ? '#EAF6EF' : 'transparent',
                    borderColor: view === 'my-tickets' ? '#D1D9D4 #D1D9D4 #EAF6EF' : 'transparent'
                  }}
                >
                  My Tickets
                </button>
              </li>
            </ul>

            {view === 'create-ticket' && (
              <CreateTicket onCancel={() => setView('my-tickets')} />
            )}
            {view === 'my-tickets' && (
              <MyTickets
                onCreateTicket={() => setView('create-ticket')}
                onSelectTicket={(id) => {
                  setSelectedTicketId(id);
                  setView('ticket-detail');
                }}
              />
            )}
            {view === 'ticket-detail' && selectedTicketId !== null && (
              <TicketDetail
                ticketId={selectedTicketId}
                onBack={() => setView('my-tickets')}
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
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
