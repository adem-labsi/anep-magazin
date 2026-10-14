"use client";

import { createContext, useContext } from "react";
import type { EndpointKey, StockData } from "@/lib/hooks/useStockData";
import type { ToastType } from "@/lib/hooks/useToast";
import type { Lang, SearchKey, SearchState } from "@/lib/types";

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface AppContextValue {
  lang: Lang;
  t: (key: string) => string;
  stock: StockData;
  refresh: (keys?: EndpointKey[]) => Promise<void>;
  search: SearchState;
  setSearchField: (key: SearchKey, value: string) => void;
  resetSearch: (module: string) => void;
  exportCSV: (module: string) => void;
  printModule: (module: string, title: string) => void;
  printElement: (node: HTMLElement | null, title: string) => void;
  showToast: (msg: string, type?: ToastType) => void;
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
  canWrite: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}

export const AppProvider = AppContext.Provider;
