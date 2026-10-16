import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";

const userByRole = {
  REQUESTER: {
    id: 10,
    email: "first.login@toktickit.local",
    name: "First Login User",
    role: "REQUESTER",
    mustChangePassword: true,
    isActive: true,
  },
  IT_STAFF: {
    id: 11,
    email: "tech1@toktickit.local",
    name: "Tech One",
    role: "IT_STAFF",
    mustChangePassword: true,
    isActive: true,
  },
  ADMINISTRATOR: {
    id: 12,
    email: "admin@toktickit.local",
    name: "Admin User",
    role: "ADMINISTRATOR",
    mustChangePassword: true,
    isActive: true,
  },
} as const;

let firstLoginUser: (typeof userByRole)[keyof typeof userByRole] = userByRole.REQUESTER;

const normalPageByRole = {
  REQUESTER: /\+ create ticket/i,
  IT_STAFF: /ticket queue/i,
  ADMINISTRATOR: /user management/i,
} as const;

describe("first-login authentication route guard", () => {
  beforeEach(() => {
    firstLoginUser = userByRole.REQUESTER;
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        if (url.includes("/api/auth/me")) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ error: "Unauthenticated", code: "UNAUTHENTICATED" }),
          } as Response;
        }
        if (url.includes("/api/auth/login")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { user: firstLoginUser } }),
          } as Response;
        }
        if (url.includes("/api/auth/change-password")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ message: "Password changed successfully" }),
          } as Response;
        }
        if (url.includes("/api/tickets?")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [],
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
              },
            }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      })
    );
  });

  it("does not offer login while the initial session check is still pending", async () => {
    let resolveSessionCheck!: (response: Response) => void;
    const sessionCheck = new Promise<Response>((resolve) => {
      resolveSessionCheck = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL): Promise<Response> => {
        if (String(input).includes("/api/auth/me")) {
          return sessionCheck;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { user: firstLoginUser } }),
        } as Response);
      })
    );

    render(<App />);

    expect(screen.queryByRole("heading", { name: /sign in to your account/i })).not.toBeInTheDocument();
    expect(screen.getByText(/loading toktickit session/i)).toBeInTheDocument();

    resolveSessionCheck({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthenticated", code: "UNAUTHENTICATED" }),
    } as Response);

    expect(await screen.findByRole("heading", { name: /sign in to your account/i })).toBeInTheDocument();
  });

  it.each(Object.keys(userByRole) as (keyof typeof userByRole)[])(
    "forces %s users through Change Password before showing role pages",
    async (role) => {
      firstLoginUser = userByRole[role];
      render(<App />);

      await screen.findByRole("heading", { name: /sign in to your account/i });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: firstLoginUser.email },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: "Password123!" },
      });
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      expect(await screen.findByRole("heading", { name: /change your password/i })).toBeInTheDocument();
      expect(screen.getByText(/you must change your password to continue/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /\+ create ticket/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /my tickets/i })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/current \(temporary\) password/i), {
        target: { value: "Password123!" },
      });
      fireEvent.change(screen.getByLabelText(/^new password/i), {
        target: { value: "NewSecurePass123!" },
      });
      fireEvent.change(screen.getByLabelText(/confirm new password/i), {
        target: { value: "NewSecurePass123!" },
      });
      fireEvent.click(screen.getByRole("button", { name: /change password/i }));

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /change your password/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: normalPageByRole[role] })).toBeInTheDocument();
      });
      expect(screen.getByRole("status")).toHaveTextContent(/password changed successfully/i);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/change-password"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            currentPassword: "Password123!",
            newPassword: "NewSecurePass123!",
            confirmPassword: "NewSecurePass123!",
          }),
        })
      );
    }
  );
});
