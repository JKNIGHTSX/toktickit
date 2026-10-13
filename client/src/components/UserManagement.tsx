import React, { useState, useEffect, useMemo } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  resetUserPassword,
  UserAccount,
  UserRole,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();

  // State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string>("");
  const [successBanner, setSuccessBanner] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createRole, setCreateRole] = useState<UserRole>("REQUESTER");
  const [createIsActive, setCreateIsActive] = useState<boolean>(true);
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createError, setCreateError] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Edit Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("REQUESTER");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>("");
  const [resetError, setResetError] = useState<string>("");
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorBanner("");
    try {
      const data = await fetchUsers({
        search: searchQuery.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data);
    } catch (err: any) {
      setErrorBanner(err?.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "ADMINISTRATOR") {
      loadUsers();
    }
  }, [currentUser?.role, searchQuery, roleFilter]);

  // Role Badge Styling
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "ADMINISTRATOR":
        return {
          label: "Admin",
          bg: "#EDE7F6",
          color: "#512DA8",
          border: "#D1C4E9",
        };
      case "IT_STAFF":
        return {
          label: "IT Staff",
          bg: "#E1F5FE",
          color: "#0277BD",
          border: "#B3E5FC",
        };
      case "REQUESTER":
      default:
        return {
          label: "Requester",
          bg: "#E8F5E9",
          color: "#2E7D32",
          border: "#C8E6C9",
        };
    }
  };

  // Status Badge Styling
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return {
        label: "Active",
        bg: "#E8F5E9",
        color: "#2E7D32",
      };
    }
    return {
      label: "Inactive",
      bg: "#FFEBEE",
      color: "#C62828",
    };
  };

  // Check if non-admin
  if (currentUser?.role !== "ADMINISTRATOR") {
    return (
      <div className="card shadow-sm border p-4 text-center my-4" style={{ borderColor: "#D1D9D4", borderRadius: "12px" }}>
        <div style={{ fontSize: "3rem" }}>🔒</div>
        <h3 className="h5 fw-bold mt-2" style={{ color: "#1E2B24" }}>Access Restricted</h3>
        <p className="text-muted mb-0">You do not have permission to view this resource. Administrator access is required.</p>
      </div>
    );
  }

  // Handle Create User
  const handleOpenCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreateRole("REQUESTER");
    setCreateIsActive(true);
    setCreatePassword("");
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createName.trim()) {
      setCreateError("Full name is required.");
      return;
    }
    if (!createEmail.trim()) {
      setCreateError("Email address is required.");
      return;
    }
    if (!createPassword) {
      setCreateError("Initial password is required.");
      return;
    }

    setIsCreating(true);
    try {
      await createUser({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createPassword,
      });
      setIsCreateModalOpen(false);
      setSuccessBanner(`User "${createName.trim()}" created successfully with initial password.`);
      loadUsers();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Edit User
  const handleOpenEditModal = (target: UserAccount) => {
    setEditingUser(target);
    setEditName(target.name);
    setEditEmail(target.email);
    setEditRole(target.role);
    setEditIsActive(target.isActive);
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");

    if (!editName.trim()) {
      setEditError("Full name cannot be empty.");
      return;
    }
    if (!editEmail.trim()) {
      setEditError("Email address cannot be empty.");
      return;
    }

    // Client-side guardrail check: Self-deactivation
    if (editingUser.id === currentUser?.id && !editIsActive) {
      setEditError("You cannot deactivate your own active Administrator account.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        isActive: editIsActive,
      });
      setEditingUser(null);
      setSuccessBanner(`User "${editName.trim()}" updated successfully.`);
      loadUsers();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset Password
  const handleOpenResetModal = (target: UserAccount) => {
    setResetTargetUser(target);
    setResetPasswordValue("");
    setResetError("");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setResetError("");

    if (!resetPasswordValue) {
      setResetError("New initial password is required.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetUserPassword(resetTargetUser.id, resetPasswordValue);
      setResetTargetUser(null);
      setSuccessBanner(res?.message || `Initial password reset for "${resetTargetUser.name}".`);
      loadUsers();
    } catch (err: any) {
      setResetError(err?.message || "Failed to set initial password.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="user-management-container">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1E2B24" }}>
            User Management
          </h1>
          <p className="text-muted small mb-0">
            Manage authenticated users, roles, activation state, and initial passwords.
          </p>
        </div>
        <button
          id="create-user-btn"
          className="btn text-white fw-semibold d-flex align-items-center gap-2"
          onClick={handleOpenCreateModal}
          style={{
            backgroundColor: "#006B3C",
            borderColor: "#006B3C",
            borderRadius: "6px",
            minHeight: "44px",
            padding: "8px 18px",
          }}
        >
          <span>+</span>
          <span>Create User</span>
        </button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between p-3 mb-3"
          style={{
            backgroundColor: "#EAF6EF",
            borderColor: "#A3D9B8",
            color: "#006B3C",
            borderRadius: "8px",
          }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span>✓</span>
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-sm"
            aria-label="Close"
            onClick={() => setSuccessBanner("")}
          />
        </div>
      )}

      {/* Error Notification */}
      {errorBanner && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-3 mb-3"
          style={{
            backgroundColor: "#FFEBEE",
            borderColor: "#FFCDD2",
            color: "#C62828",
            borderRadius: "8px",
          }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span>⚠️</span>
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            className="btn-close btn-sm"
            aria-label="Close"
            onClick={() => setErrorBanner("")}
          />
        </div>
      )}

      {/* Search and Role Filter Bar */}
      <div
        className="card shadow-sm border mb-4"
        style={{
          borderRadius: "8px",
          borderColor: "#D1D9D4",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-7 col-lg-8">
              <div className="input-group">
                <span
                  className="input-group-text bg-white border-end-0 text-muted"
                  style={{ borderColor: "#D1D9D4" }}
                >
                  🔍
                </span>
                <input
                  id="search-users-input"
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search users by name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    borderColor: "#D1D9D4",
                    minHeight: "44px",
                  }}
                />
              </div>
            </div>

            {/* Role Filter Select */}
            <div className="col-12 col-md-5 col-lg-4 d-flex gap-2">
              <select
                id="role-filter-select"
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  borderColor: "#D1D9D4",
                  minHeight: "44px",
                }}
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>

              {(searchQuery || roleFilter) && (
                <button
                  id="clear-filters-btn"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("");
                  }}
                  style={{ minHeight: "44px", whiteSpace: "nowrap" }}
                  title="Clear filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Table Card */}
      <div
        className="card shadow-sm border"
        style={{
          borderRadius: "8px",
          borderColor: "#D1D9D4",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: "650px" }}>
            <thead style={{ backgroundColor: "#F5F7F6", color: "#556B60" }}>
              <tr>
                <th scope="col" className="ps-4 py-3" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Name
                </th>
                <th scope="col" className="py-3" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Email
                </th>
                <th scope="col" className="py-3" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Role
                </th>
                <th scope="col" className="py-3" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Status
                </th>
                <th scope="col" className="text-end pe-4 py-3" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    <span>Loading users…</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    {searchQuery || roleFilter ? (
                      <div className="text-muted">
                        <p className="mb-2">No users match your search or filter criteria. Try clearing filters.</p>
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("");
                          }}
                          style={{ borderColor: "#006B3C", color: "#006B3C" }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <div className="text-muted">
                        <p className="mb-0">No user accounts found.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const roleBadge = getRoleBadge(item.role);
                  const statusBadge = getStatusBadge(item.isActive);
                  const isSelf = item.id === currentUser?.id;

                  return (
                    <tr key={item.id} id={`user-row-${item.id}`}>
                      {/* Name */}
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold" style={{ color: "#1E2B24" }}>
                            {item.name}
                          </span>
                          {isSelf && (
                            <span
                              className="badge rounded-pill bg-light text-muted border"
                              style={{ fontSize: "10px" }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 text-muted" style={{ fontSize: "13px" }}>
                        {item.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3">
                        <span
                          className="badge rounded-pill px-2 py-1"
                          style={{
                            backgroundColor: roleBadge.bg,
                            color: roleBadge.color,
                            border: `1px solid ${roleBadge.border}`,
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3">
                        <span
                          className="badge rounded-pill px-2 py-1"
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                        {item.mustChangePassword && (
                          <span
                            className="badge ms-1 px-2 py-1 rounded-pill"
                            style={{
                              backgroundColor: "#FFF8E1",
                              color: "#B76E00",
                              fontSize: "10px",
                              border: "1px solid #FFE082",
                            }}
                            title="Password change required at next login"
                          >
                            Pass Change Req
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-4 py-3">
                        <div className="d-inline-flex gap-2">
                          <button
                            id={`edit-user-btn-${item.id}`}
                            type="button"
                            className="btn btn-sm btn-outline-secondary px-3"
                            onClick={() => handleOpenEditModal(item)}
                            style={{
                              minHeight: "36px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            id={`reset-password-btn-${item.id}`}
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark px-2"
                            onClick={() => handleOpenResetModal(item)}
                            style={{
                              minHeight: "36px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 500,
                              borderColor: "#FFE082",
                              backgroundColor: "#FFFDE7",
                            }}
                            title="Set New Initial Password"
                          >
                            🔑 Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Create User Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content shadow border"
              style={{ borderRadius: "12px", borderColor: "#D1D9D4" }}
            >
              <form onSubmit={handleCreateSubmit}>
                <div
                  className="modal-header px-4 pt-4 pb-3"
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <h2 className="modal-title h5 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                    Create New User
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setIsCreateModalOpen(false)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  {createError && (
                    <div
                      className="alert alert-danger p-2 small mb-3"
                      style={{ borderRadius: "6px" }}
                      role="alert"
                    >
                      ⚠️ {createError}
                    </div>
                  )}

                  {/* Name */}
                  <div className="mb-3">
                    <label
                      htmlFor="create-user-name"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-name"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Alex Thompson"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label
                      htmlFor="create-user-email"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-email"
                      type="email"
                      className="form-control"
                      placeholder="e.g. alex.thompson@toktickit.local"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-3">
                    <label
                      htmlFor="create-user-role"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="create-user-role"
                      className="form-select"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as UserRole)}
                      style={{ minHeight: "44px" }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  {/* Active Toggle */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold d-block" style={{ color: "#1E2B24" }}>
                      Active Status
                    </label>
                    <div className="form-check form-switch">
                      <input
                        id="create-user-active"
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={createIsActive}
                        onChange={(e) => setCreateIsActive(e.target.checked)}
                        style={{ width: "2.5em", height: "1.3em", cursor: "pointer" }}
                      />
                      <label className="form-check-label small ms-2" htmlFor="create-user-active">
                        {createIsActive ? (
                          <span className="text-success fw-semibold">Active</span>
                        ) : (
                          <span className="text-danger fw-semibold">Inactive</span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Initial Password */}
                  <div className="mb-2">
                    <label
                      htmlFor="create-user-password"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="create-user-password"
                      type="text"
                      className="form-control"
                      placeholder="e.g. TempPassword123!"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                    <div className="form-text small" style={{ color: "#556B60" }}>
                      💡 User will be required to choose a new password upon first login.
                    </div>
                  </div>
                </div>

                <div
                  className="modal-footer px-4 pb-4 pt-2 gap-2"
                  style={{ borderTop: "none" }}
                >
                  <button
                    id="cancel-create-user-btn"
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{ minHeight: "44px", borderRadius: "6px" }}
                  >
                    Cancel
                  </button>
                  <button
                    id="save-create-user-btn"
                    type="submit"
                    className="btn text-white fw-semibold"
                    disabled={isCreating}
                    style={{
                      backgroundColor: "#006B3C",
                      borderColor: "#006B3C",
                      minHeight: "44px",
                      borderRadius: "6px",
                      padding: "8px 20px",
                    }}
                  >
                    {isCreating ? "Saving…" : "Save User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Edit User Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editingUser && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content shadow border"
              style={{ borderRadius: "12px", borderColor: "#D1D9D4" }}
            >
              <form onSubmit={handleEditSubmit}>
                <div
                  className="modal-header px-4 pt-4 pb-3"
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <h2 className="modal-title h5 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                    Edit User: {editingUser.name}
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setEditingUser(null)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  {editError && (
                    <div
                      className="alert alert-danger p-2 small mb-3"
                      style={{ borderRadius: "6px" }}
                      role="alert"
                    >
                      ⚠️ {editError}
                    </div>
                  )}

                  {/* Self-Deactivation Warning banner */}
                  {editingUser.id === currentUser?.id && (
                    <div
                      className="alert alert-warning p-2 small mb-3"
                      style={{
                        backgroundColor: "#FFF8E1",
                        borderColor: "#FFE082",
                        color: "#795548",
                        borderRadius: "6px",
                      }}
                    >
                      ℹ️ You are editing your currently authenticated Administrator account. Self-deactivation is prevented.
                    </div>
                  )}

                  {/* Name */}
                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-name"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-name"
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-email"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="edit-user-email"
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-3">
                    <label
                      htmlFor="edit-user-role"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      Role <span className="text-danger">*</span>
                    </label>
                    <select
                      id="edit-user-role"
                      className="form-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      style={{ minHeight: "44px" }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  {/* Active Toggle */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold d-block" style={{ color: "#1E2B24" }}>
                      Active Status
                    </label>
                    <div className="form-check form-switch">
                      <input
                        id="edit-user-active"
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={editIsActive}
                        disabled={editingUser.id === currentUser?.id}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        style={{ width: "2.5em", height: "1.3em", cursor: editingUser.id === currentUser?.id ? "not-allowed" : "pointer" }}
                      />
                      <label className="form-check-label small ms-2" htmlFor="edit-user-active">
                        {editIsActive ? (
                          <span className="text-success fw-semibold">Active</span>
                        ) : (
                          <span className="text-danger fw-semibold">Inactive</span>
                        )}
                        {editingUser.id === currentUser?.id && (
                          <span className="text-muted ms-1">(Cannot deactivate self)</span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Set initial password shortcut in edit modal */}
                  <div className="mt-4 pt-3 border-top">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold small" style={{ color: "#1E2B24" }}>
                          Account Initial Password
                        </div>
                        <div className="text-muted small" style={{ fontSize: "11px" }}>
                          Issue a new initial password requiring change at next login
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning text-dark fw-semibold"
                        onClick={() => {
                          const target = editingUser;
                          setEditingUser(null);
                          handleOpenResetModal(target);
                        }}
                        style={{ borderColor: "#FFE082", backgroundColor: "#FFFDE7" }}
                      >
                        Reset Password…
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="modal-footer px-4 pb-4 pt-2 gap-2"
                  style={{ borderTop: "none" }}
                >
                  <button
                    id="cancel-edit-user-btn"
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    style={{ minHeight: "44px", borderRadius: "6px" }}
                  >
                    Cancel
                  </button>
                  <button
                    id="save-edit-user-btn"
                    type="submit"
                    className="btn text-white fw-semibold"
                    disabled={isSaving}
                    style={{
                      backgroundColor: "#006B3C",
                      borderColor: "#006B3C",
                      minHeight: "44px",
                      borderRadius: "6px",
                      padding: "8px 20px",
                    }}
                  >
                    {isSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Reset Initial Password Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {resetTargetUser && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content shadow border"
              style={{ borderRadius: "12px", borderColor: "#D1D9D4" }}
            >
              <form onSubmit={handleResetSubmit}>
                <div
                  className="modal-header px-4 pt-4 pb-3"
                  style={{ borderBottom: "1px solid #E5E7EB" }}
                >
                  <h2 className="modal-title h5 fw-bold mb-0" style={{ color: "#1E2B24" }}>
                    Set New Initial Password
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setResetTargetUser(null)}
                  />
                </div>

                <div className="modal-body px-4 py-3">
                  <p className="text-muted small mb-3">
                    Setting a new initial password for user:{" "}
                    <strong style={{ color: "#1E2B24" }}>
                      {resetTargetUser.name} ({resetTargetUser.email})
                    </strong>
                    . The user will be required to choose a new password at next login.
                  </p>

                  {resetError && (
                    <div
                      className="alert alert-danger p-2 small mb-3"
                      style={{ borderRadius: "6px" }}
                      role="alert"
                    >
                      ⚠️ {resetError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      htmlFor="reset-password-input"
                      className="form-label small fw-semibold"
                      style={{ color: "#1E2B24" }}
                    >
                      New Initial Password <span className="text-danger">*</span>
                    </label>
                    <input
                      id="reset-password-input"
                      type="text"
                      className="form-control"
                      placeholder="e.g. TempSecurePass123!"
                      value={resetPasswordValue}
                      onChange={(e) => setResetPasswordValue(e.target.value)}
                      style={{ minHeight: "44px" }}
                      required
                    />
                    <div className="form-text small" style={{ color: "#556B60" }}>
                      Must be 8+ characters, with uppercase, lowercase, digit, and special symbol.
                    </div>
                  </div>
                </div>

                <div
                  className="modal-footer px-4 pb-4 pt-2 gap-2"
                  style={{ borderTop: "none" }}
                >
                  <button
                    id="cancel-reset-password-btn"
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setResetTargetUser(null)}
                    style={{ minHeight: "44px", borderRadius: "6px" }}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-reset-password-btn"
                    type="submit"
                    className="btn text-white fw-semibold"
                    disabled={isResetting}
                    style={{
                      backgroundColor: "#006B3C",
                      borderColor: "#006B3C",
                      minHeight: "44px",
                      borderRadius: "6px",
                      padding: "8px 20px",
                    }}
                  >
                    {isResetting ? "Setting…" : "Set Initial Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagement;
