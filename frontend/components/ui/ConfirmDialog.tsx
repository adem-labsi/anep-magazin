"use client";

import { useEffect } from "react";
import { Button } from "./Button";
import type { ConfirmOptions } from "@/components/app/AppContext";

export interface ConfirmDialogProps {
  message: string;
  opts?: ConfirmOptions;
  onResolve: (value: boolean) => void;
}

export function ConfirmDialog({ message, opts, onResolve }: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResolve(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onResolve]);

  return (
    <div className="modal-overlay show" role="presentation" onClick={() => onResolve(false)}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={opts?.title || message}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>
          <span>{opts?.title || "Confirmation"}</span>
        </h3>
        <p className="confirm-msg">{message}</p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => onResolve(false)}>
            {opts?.cancelLabel || "Annuler"}
          </Button>
          <Button autoFocus variant={opts?.danger ? "danger" : "primary"} onClick={() => onResolve(true)}>
            {opts?.confirmLabel || "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
