import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { UserManagement } from "../../src/components/UserManagement.js";

// Mock fetch globally
(globalThis as any).fetch = vi.fn();

const mockAdminUser = {
  id: 1,
  name: "John Smith",
  email: "admin@toktickit.local",
  role: "ADMINISTRATOR" as const,
  isActive: true,
  mustChangePassword: false,
};

const mockNonAdminUser = {
  id: 5,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@toktickit.local",
  role: "REQUESTER" as const,
  isActive: true,
  mustChangePassword: false,
};

const sampleUsers = [
  {
    id: 1,
    name: "John Smith",
    email: "admin@toktickit.local",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "tech1@toktickit.local",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: 3,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.local",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: 4,
    name: "Inactive Guy",
    email: "inactive@toktickit.local",
    role: "REQUESTER",
    isActive: false,
    mustChangePassword: true,
  },
];

describe("UI-05: Administrator User Management UI Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupAuthFetch = (currentUser: any, usersData: any[] = sampleUsers) => {
    ((globalThis as any).fetch as any).mockImplementation((url: string, opts: any = {}) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: currentUser }),
        });
      }

      if (url.includes("/api/users")) {
        // Query param parsing for search / role filter
        if (!opts?.method || opts.method === "GET") {
          const urlObj = new URL(url, "http://localhost:3000");
          const search = urlObj.searchParams.get("search");
          const role = urlObj.searchParams.get("role");

          let filtered = [...usersData];
          if (role) {
            filtered = filtered.filter((u) => u.role === role);
          }
          if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(
              (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
            );
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => filtered,
          });
        }
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      });
    });
  };

  it("renders user list with Name, Email, Role badges, Status badges, and Edit buttons for Admin", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    expect(await screen.findByRole("heading", { name: /user management/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ create user/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search users by name or email/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Verify sample users rendered
    expect(await screen.findByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("admin@toktickit.local")).toBeInTheDocument();
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("tech1@toktickit.local")).toBeInTheDocument();
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("Inactive Guy")).toBeInTheDocument();

    // Verify badges and actions
    const rows = screen.getAllByRole("row");
    // 1 header + 4 user rows = 5 rows
    expect(rows.length).toBe(5);

    // Verify Edit buttons exist
    expect(document.getElementById("edit-user-btn-1")).toBeInTheDocument();
    expect(document.getElementById("edit-user-btn-2")).toBeInTheDocument();
  });

  it("filters user list by search query", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    const searchInput = screen.getByPlaceholderText(/search users by name or email/i);
    fireEvent.change(searchInput, { target: { value: "Michael" } });

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
      expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
    });
  });

  it("filters user list by role dropdown", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    const roleSelect = screen.getByRole("combobox");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
      expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Jennifer Anderson")).not.toBeInTheDocument();
    });
  });

  it("displays empty state when no users match search filter and allows clearing filters", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    const searchInput = screen.getByPlaceholderText(/search users by name or email/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentNameXYZ" } });

    expect(
      await screen.findByText(/no users match your search or filter criteria/i)
    ).toBeInTheDocument();

    // Click Clear Filters
    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(await screen.findByText("John Smith")).toBeInTheDocument();
  });

  it("opens Create User modal and submits new user with single role and initial password", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    let createdPayload: any = null;
    ((globalThis as any).fetch as any).mockImplementation((url: string, opts: any = {}) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: mockAdminUser }) });
      }
      if (url.endsWith("/api/users") && opts?.method === "POST") {
        createdPayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              id: 99,
              name: createdPayload.name,
              email: createdPayload.email,
              role: createdPayload.role,
              isActive: createdPayload.isActive,
              mustChangePassword: true,
            },
            message: "User created",
          }),
        });
      }
      if (url.includes("/api/users")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleUsers });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    // Click "+ Create User"
    fireEvent.click(screen.getByRole("button", { name: /\+ create user/i }));

    expect(await screen.findByRole("heading", { name: /create new user/i })).toBeInTheDocument();
    expect(screen.getByText(/user will be required to choose a new password/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alex Thompson" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alex.thompson@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: "IT_STAFF" } });
    fireEvent.change(screen.getByLabelText(/initial password/i), {
      target: { value: "TempPassword123!" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    await waitFor(() => {
      expect(createdPayload).toEqual({
        name: "Alex Thompson",
        email: "alex.thompson@toktickit.local",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "TempPassword123!",
      });
      expect(screen.getByText(/created successfully with initial password/i)).toBeInTheDocument();
    });
  });

  it("handles duplicate email error (409 Conflict) when creating user", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    ((globalThis as any).fetch as any).mockImplementation((url: string, opts: any = {}) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: mockAdminUser }) });
      }
      if (url.endsWith("/api/users") && opts?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            error: "Email is already registered",
            code: "EMAIL_ALREADY_EXISTS",
          }),
        });
      }
      if (url.includes("/api/users")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleUsers });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    fireEvent.click(screen.getByRole("button", { name: /\+ create user/i }));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Duplicate Alex" } });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "admin@toktickit.local" },
    });
    fireEvent.change(screen.getByLabelText(/initial password/i), {
      target: { value: "TempPassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save user/i }));

    expect(await screen.findByText(/email is already registered/i)).toBeInTheDocument();
  });

  it("opens Edit User modal, updates user, and enforces self-deactivation guardrail", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("John Smith");

    // Click Edit on John Smith (the logged-in admin)
    const editAdminBtn = document.getElementById("edit-user-btn-1")!;
    fireEvent.click(editAdminBtn);

    expect(await screen.findByRole("heading", { name: /edit user: john smith/i })).toBeInTheDocument();
    // Guardrail notice for self
    expect(screen.getByText(/self-deactivation is prevented/i)).toBeInTheDocument();

    // Verify active switch is disabled for self
    const activeSwitch = screen.getByRole("switch");
    expect(activeSwitch).toBeDisabled();

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Now edit another user (Michael Brown)
    const editOtherBtn = document.getElementById("edit-user-btn-2")!;
    fireEvent.click(editOtherBtn);

    expect(await screen.findByRole("heading", { name: /edit user: michael brown/i })).toBeInTheDocument();
    const otherSwitch = screen.getByRole("switch");
    expect(otherSwitch).not.toBeDisabled();
  });

  it("opens Reset Password modal and submits new initial password", async () => {
    setupAuthFetch(mockAdminUser, sampleUsers);

    let resetPayload: any = null;
    ((globalThis as any).fetch as any).mockImplementation((url: string, opts: any = {}) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: mockAdminUser }) });
      }
      if (url.includes("/reset-password") && opts?.method === "POST") {
        resetPayload = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: "New initial password set. User will be required to change it at next login.",
          }),
        });
      }
      if (url.includes("/api/users")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => sampleUsers });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await screen.findByText("Michael Brown");

    // Click Password button on Michael Brown (#reset-password-btn-2)
    const resetBtn = document.getElementById("reset-password-btn-2")!;
    fireEvent.click(resetBtn);

    expect(await screen.findByRole("heading", { name: /set new initial password/i })).toBeInTheDocument();
    expect(
      screen.getByText(/user will be required to choose a new password at next login/i)
    ).toBeInTheDocument();

    // Type new initial password
    fireEvent.change(screen.getByLabelText(/new initial password/i), {
      target: { value: "NewTempSecret123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /set initial password/i }));

    await waitFor(() => {
      expect(resetPayload).toEqual({ initialPassword: "NewTempSecret123!" });
      expect(screen.getByText(/initial password set/i)).toBeInTheDocument();
    });
  });

  it("displays Access Restricted card when accessed by non-Administrator", async () => {
    setupAuthFetch(mockNonAdminUser, sampleUsers);

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    expect(await screen.findByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/administrator access is required/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ create user/i })).not.toBeInTheDocument();
  });
});
