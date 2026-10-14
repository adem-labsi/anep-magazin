import type { ToastState } from "@/lib/hooks/useToast";

export function Toast({ toast }: { toast: ToastState }) {
  const variant = toast.type ? ` ${toast.type}` : "";
  return <div className={`toast${toast.message ? ` show${variant}` : ""}`}>{toast.message}</div>;
}
