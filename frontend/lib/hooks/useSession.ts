"use client";

import { useCallback, useState } from "react";
import { getToken, setToken } from "../api";
import { STORAGE_KEYS } from "../constants";
import type { User } from "../types";

export interface UseSession {
  user: User | null;
  setUser: (user: User | null) => void;
  readStoredUser: () => User | null;
  hydrate: () => boolean;
  persistUser: (user: User) => void;
  clearUser: () => void;
  canWrite: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

export function useSession(): UseSession {
  const [user, setUser] = useState<User | null>(null);

  const readStoredUser = useCallback((): User | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }, []);

  const hydrate = useCallback((): boolean => {
    if (!getToken()) return false;
    const stored = readStoredUser();
    if (stored) setUser(stored);
    return !!stored;
  }, [readStoredUser]);

  const persistUser = useCallback((u: User) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

  const clearUser = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    user,
    setUser,
    readStoredUser,
    hydrate,
    persistUser,
    clearUser,
    canWrite: !!user && (user.role === "admin" || user.role === "magasinier"),
    canDelete: user?.role === "admin",
    canManageUsers: user?.role === "admin",
  };
}
