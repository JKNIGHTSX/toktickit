import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { Login } from "../../src/components/Login.js";

(globalThis as any).fetch = vi.fn();

describe("Login UI Component (Lab 3 — Issue #3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ((globalThis as any).fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthenticated", code: "UNAUTHENTICATED" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });
    });
  });

  it("UI-01: renders email input, password input, sign in button, and brand heading", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("UI-01: validates empty email or password on submission", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter both email address and password/i)).toBeInTheDocument();
    });
  });

  it("UI-01: displays error banner when authentication fails (401 invalid credentials)", async () => {
    ((globalThis as any).fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthenticated" }),
      });
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "wrong@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "WrongPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("UI-01: displays error banner for inactive user account", async () => {
    ((globalThis as any).fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({
            error: "Account is inactive. Please contact an Administrator",
            code: "ACCOUNT_INACTIVE",
          }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthenticated" }),
      });
    });

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "inactive.user@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/account is inactive/i)).toBeInTheDocument();
    });
  });

  it("UI-01: toggles password input visibility when eye icon is clicked", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");
  });
});
