"use client";

import type { Database } from "@/lib/database.types";

type Severity = Database["public"]["Enums"]["alert_severity"];

export interface DashboardAlert {
  id: string;
  severity: Severity;
  created_at: string;
  zoneName: string | null;
  binLabel: string | null;
  fillLevel: number | null;
}

const SEVERITY_BADGE: Record<Severity, string> = {
  high: "failed",
  medium: "pending",
  low: "neutral",
};

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function AlertList({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted-green)" }}>
        No unresolved alerts.
      </p>
    );
  }

  const sorted = [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.created_at.localeCompare(a.created_at),
  );

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between"
          style={{
            padding: "0.75rem 0.85rem",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "var(--bs-body-bg)",
          }}
        >
          <span className="flex items-center gap-3">
            <span className={`badge-table ${SEVERITY_BADGE[a.severity]}`}>
              {a.severity}
            </span>
            <span style={{ fontSize: "0.85rem" }}>
              {a.zoneName ?? "Unknown zone"}
              {a.binLabel ? ` · ${a.binLabel}` : ""}
            </span>
          </span>
          <span className="num" style={{ fontWeight: 700 }}>
            {a.fillLevel != null ? `${a.fillLevel}%` : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
