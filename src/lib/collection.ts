import { supabase } from "./supabase";
import { ingestFillReport } from "./ingestion";

export interface CompletePickupInput {
  binId: string;
  collectorId: string;
  /** Fill level the bin resets to once emptied. */
  resetFillLevel?: number;
  notes?: string;
}

export interface CompletePickupResult {
  /** The request that was closed, or null if the bin had no open request. */
  requestId: string | null;
  /** The `collections` row written, or null if there was no request to log against. */
  collectionId: string | null;
}

/**
 * Closes the collection loop for a bin the collector has just emptied.
 *
 *   1. Find the open `auto_threshold_alert` request for the bin (if any),
 *      mark it `completed`, and assign this collector.
 *   2. Insert a `collections` row against that request.
 *   3. Resolve any open `alerts` for the bin.
 *   4. Push a low `fill_reports` row through the shared ingestion point so the
 *      bin's `current_fill_level` drops and every dashboard / map reflects it
 *      live (Realtime covers `bins`, `alerts`, `collection_requests`).
 *
 * Steps 1–3 are skipped when the bin has no open request (a collector emptied
 * it proactively); step 4 always runs. Request claiming / assignment UI is a
 * later increment — this is the minimum that keeps the demo loop honest.
 */
export async function completePickup({
  binId,
  collectorId,
  resetFillLevel = 10,
  notes,
}: CompletePickupInput): Promise<CompletePickupResult> {
  const { data: openReq, error: reqErr } = await supabase
    .from("collection_requests")
    .select("id")
    .eq("bin_id", binId)
    .eq("request_type", "auto_threshold_alert")
    .in("status", ["pending", "assigned", "in_progress"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (reqErr) throw reqErr;

  let collectionId: string | null = null;

  if (openReq) {
    const { error: updErr } = await supabase
      .from("collection_requests")
      .update({ status: "completed", collector_id: collectorId })
      .eq("id", openReq.id);
    if (updErr) throw updErr;

    const { data: collection, error: collErr } = await supabase
      .from("collections")
      .insert({
        request_id: openReq.id,
        collector_id: collectorId,
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: notes ?? null,
      })
      .select("id")
      .single();
    if (collErr) throw collErr;
    collectionId = collection.id;

    const { error: alertErr } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("bin_id", binId)
      .is("resolved_at", null);
    if (alertErr) throw alertErr;
  }

  // A future sensor-monitored bin should report its reset reading as `sensor`.
  const { data: bin, error: binErr } = await supabase
    .from("bins")
    .select("monitoring_mode")
    .eq("id", binId)
    .single();
  if (binErr) throw binErr;

  await ingestFillReport({
    binId,
    fillLevel: resetFillLevel,
    source: bin.monitoring_mode === "sensor" ? "sensor" : "manual_slider",
  });

  return { requestId: openReq?.id ?? null, collectionId };
}
