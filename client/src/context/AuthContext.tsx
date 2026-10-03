import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser, loginApi, logoutApi, fetchCurrentUser, changePasswordApi } from "../api.js";

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setError(null);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (_err: any) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedUser = await loginApi(email, password);
      setUser(loggedUser);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await changePasswordApi(currentPassword, newPassword, confirmPassword);
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to change password");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
