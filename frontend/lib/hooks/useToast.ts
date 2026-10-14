"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastState {
  message: string;
  type?: ToastType;
}

export interface UseToast {
  toast: ToastState;
  showToast: (msg: string, type?: ToastType) => void;
}

function inferType(msg: string): ToastType | undefined {
  if (msg.startsWith("❌")) return "error";
  if (msg.startsWith("✅")) return "success";
  if (msg.startsWith("⚠️")) return "warn";
  return undefined;
}

export function useToast(duration = 2800): UseToast {
  const [toast, setToast] = useState<ToastState>({ message: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, type?: ToastType) => {
      setToast({ message: msg, type: type ?? inferType(msg) });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast({ message: "" }), duration);
    },
    [duration],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, showToast };
}
