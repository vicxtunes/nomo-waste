import type { Database } from "./database.types";

export type AlertSeverity = Database["public"]["Enums"]["alert_severity"];

/**
 * Pure mirror of the SQL `severity_for_fill` function in
 * supabase/migrations/20260830000005_ingestion_trigger.sql. Kept in sync by
 * src/lib/severity.test.ts. No side-effect imports — safe to use anywhere.
 */
export function severityForFill(pct: number): AlertSeverity {
  if (pct >= 95) return "high";
  if (pct >= 85) return "medium";
  return "low";
}
