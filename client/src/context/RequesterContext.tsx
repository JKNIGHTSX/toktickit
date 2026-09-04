import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Requester, fetchRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_current_requester_id";

export interface RequesterContextType {
  currentRequester: Requester | null;
  requesters: Requester[];
  isLoading: boolean;
  error: string | null;
  selectRequester: (requesterId: number) => void;
  clearRequester: () => void;
  refreshRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRequesters();
      setRequesters(data);

      // Check stored requester ID in localStorage
      const savedIdStr = localStorage.getItem(STORAGE_KEY);
      if (savedIdStr) {
        const savedId = parseInt(savedIdStr, 10);
        const matching = data.find((r) => r.id === savedId && r.isActive);
        if (matching) {
          setCurrentRequester(matching);
        } else {
          // If stored ID is no longer valid or inactive, clear it
          localStorage.removeItem(STORAGE_KEY);
          setCurrentRequester(null);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load development requesters");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequesters();
  }, [loadRequesters]);

  const selectRequester = (requesterId: number) => {
    const target = requesters.find((r) => r.id === requesterId);
    if (target && target.isActive) {
      setCurrentRequester(target);
      localStorage.setItem(STORAGE_KEY, String(target.id));
    }
  };

  const clearRequester = () => {
    setCurrentRequester(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        isLoading,
        error,
        selectRequester,
        clearRequester,
        refreshRequesters: loadRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
};

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
