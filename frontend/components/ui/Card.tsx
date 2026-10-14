import type { ReactNode } from "react";

export type CardVariant = "warn" | "danger" | "success";

export function Card({ label, value, variant }: { label: string; value: ReactNode; variant?: CardVariant }) {
  return (
    <div className={`card${variant ? ` ${variant}` : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
