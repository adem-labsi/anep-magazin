import { statutClass } from "@/lib/helpers";
import type { Statut } from "@/lib/types";

export function StatusBadge({ statut }: { statut: Statut }) {
  return <span className={`badge ${statutClass(statut)}`}>{statut}</span>;
}
