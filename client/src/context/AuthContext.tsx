import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AuthUser, loginApi, logoutApi, fetchCurrentUser, changePasswordApi } from "../api.js";

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const authRequestId = useRef(0);

  const checkAuth = useCallback(async () => {
    const requestId = ++authRequestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await fetchCurrentUser();
      if (requestId === authRequestId.current) {
        setUser(currentUser);
      }
    } catch (_err: any) {
      if (requestId === authRequestId.current) {
        setUser(null);
      }
    } finally {
      if (requestId === authRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const requestId = ++authRequestId.current;
    setError(null);
    setSuccessMessage(null);
    try {
      const loggedUser = await loginApi(email, password);
      if (requestId === authRequestId.current) {
        setUser(loggedUser);
      }
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
      throw err;
    }
  };

  const logout = async () => {
    ++authRequestId.current;
    setSuccessMessage(null);
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await changePasswordApi(currentPassword, newPassword, confirmPassword);
      setSuccessMessage("Password changed successfully. You can now continue into TokTickIT.");
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to change password");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        successMessage,
        login,
        logout,
        changePassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const defaultAuthContext: AuthContextType = {
  user: {
    id: 1,
    email: "requester@toktickit.local",
    name: "Jane Requester",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
    department: "Engineering",
  },
  isAuthenticated: true,
  isLoading: false,
  error: null,
  successMessage: null,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => {},
  checkAuth: async () => {},
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
