import { supabase } from "./supabase";
import type { Database } from "./database.types";

export { severityForFill } from "./severity";
export type { AlertSeverity } from "./severity";

export type FillSource = Database["public"]["Enums"]["fill_source"];

export interface IngestFillReportInput {
  binId: string;
  fillLevel: number; // 0–100
  source: FillSource;
}

export interface IngestFillReportResult {
  /** Whether the bin now has an open auto-threshold pickup request. */
  hasOpenAutoRequest: boolean;
}

/**
 * The single client-side entry point for a fill level entering the system.
 *
 * It does exactly ONE thing: insert a `fill_reports` row. Everything
 * downstream — syncing `bins.current_fill_level`, and (on threshold) opening
 * a `collection_requests` row + an `alerts` row — is owned by the
 * `trg_on_fill_report` Postgres trigger. A future hardware integration can
 * POST straight to PostgREST `/rest/v1/fill_reports` (or an Edge Function)
 * and hit the identical path with zero downstream changes.
 */
export async function ingestFillReport({
  binId,
  fillLevel,
  source,
}: IngestFillReportInput): Promise<IngestFillReportResult> {
  const level = Math.round(fillLevel);
  if (level < 0 || level > 100) {
    throw new Error(`fillLevel must be 0–100, got ${fillLevel}`);
  }

  const { error } = await supabase
    .from("fill_reports")
    .insert({ bin_id: binId, fill_level: level, source });
  if (error) throw error;

  // The trigger runs in the same transaction as the insert, so any auto
  // request already exists by the time we get here.
  const { count, error: countErr } = await supabase
    .from("collection_requests")
    .select("id", { count: "exact", head: true })
    .eq("bin_id", binId)
    .eq("request_type", "auto_threshold_alert")
    .in("status", ["pending", "assigned", "in_progress"]);
  if (countErr) throw countErr;

  return { hasOpenAutoRequest: (count ?? 0) > 0 };
}
