import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

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

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button
        className="btn btn-success"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <div className="mt-4 text-muted">
          <em>Loading…</em>
        </div>
      )}

      {state === "success" && (
        <div className="mt-4">
          <p className="fw-bold mb-2">
            System Status: <span className="text-success">Online</span>
          </p>
          {categories.length > 0 && (
            <div>
              <h2 className="h6 mt-3 mb-2">Supported Request Categories</h2>
              <ol className="list-group list-group-numbered">
                {categories.map((cat) => (
                  <li key={cat.id} className="list-group-item">
                    {cat.name}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p className="fw-bold text-danger mb-1">System Status: Offline</p>
          <div className="text-danger">{errorMessage || "Unable to connect to TokTickIT API"}</div>
        </div>
      )}
    </div>
  );
}
