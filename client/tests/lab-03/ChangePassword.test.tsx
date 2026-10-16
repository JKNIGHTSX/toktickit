import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { ChangePassword } from "../../src/components/ChangePassword.js";

(globalThis as any).fetch = vi.fn();

describe("ChangePassword UI Component (Lab 3 — Issue #3)", () => {
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
        json: async () => ({ message: "Success" }),
      });
    });
  });

  it("UI-02: renders current password, new password, confirm password inputs, and policy checklist", () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    expect(screen.getByRole("heading", { name: /change your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeRequired();
    expect(screen.getByLabelText(/^new password/i)).toBeRequired();
    expect(screen.getByLabelText(/confirm new password/i)).toBeRequired();
    expect(screen.getByRole("button", { name: /change password/i })).toBeVisible();
    expect(screen.getByText(/be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/include upper and lower case letters/i)).toBeInTheDocument();
    expect(screen.getByText(/include a number and a special character/i)).toBeInTheDocument();
  });

  it("UI-02: validates password confirmation matching on submit", async () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "NewSecure123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "Mismatch123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/new password and confirmation do not match/i)).toBeInTheDocument();
    });
  });

  it("UI-02: displays error when new password violates policy requirements", async () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "weak" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "weak" },
    });

    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/does not meet all security policy requirements/i)).toBeInTheDocument();
    });
  });

  it("UI-02: updates live checklist indicators when valid password is typed", () => {
    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    const newPassInput = screen.getByLabelText(/^new password/i);
    fireEvent.change(newPassInput, {
      target: { value: "ValidSecurePass123!" },
    });

    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBe(3);
  });

  it("keeps the form visible and displays a safe API failure message", async () => {
    ((globalThis as any).fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthenticated", code: "UNAUTHENTICATED" }),
        });
      }
      if (url.includes("/api/auth/change-password")) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: "Current password is incorrect",
            code: "INVALID_CURRENT_PASSWORD",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: "Success" }),
      });
    });

    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), {
      target: { value: "WrongCurrent123!" },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/current password is incorrect/i);
    expect(screen.getByRole("heading", { name: /change your password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change password/i })).toBeEnabled();
  });

  it("keeps the form mounted and disables duplicate submissions while the API is pending", async () => {
    let resolveChange!: (response: { ok: boolean; status: number; json: () => Promise<unknown> }) => void;
    const pendingChange = new Promise((resolve) => {
      resolveChange = resolve;
    });
    ((globalThis as any).fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthenticated", code: "UNAUTHENTICATED" }),
        });
      }
      if (url.includes("/api/auth/change-password")) return pendingChange;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: "Success" }),
      });
    });

    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "ValidNewPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByRole("button", { name: /changing password/i })).toBeDisabled();
    expect(screen.getByRole("heading", { name: /change your password/i })).toBeInTheDocument();
    resolveChange({
      ok: false,
      status: 400,
      json: async () => ({ error: "Current password is incorrect", code: "INVALID_CURRENT_PASSWORD" }),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/current password is incorrect/i);
  });
});
