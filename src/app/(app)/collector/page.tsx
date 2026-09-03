"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActingUser } from "@/context/ActingUserContext";
import { CollectorMap, type CollectorPosition } from "@/components/CollectorMap";
import { completePickup } from "@/lib/collection";
import { KAMPALA_CENTER, binApproxCoords, fillColor, type MapBin } from "@/lib/map";
import type { Database } from "@/lib/database.types";

type Zone = Database["public"]["Tables"]["zones"]["Row"];
type Bin = Database["public"]["Tables"]["bins"]["Row"];

export default function CollectorPage() {
  const { actingUser, users, loading } = useActingUser();
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [zoneRes, binRes] = await Promise.all([
      supabase.from("zones").select("*"),
      supabase.from("bins").select("*"),
    ]);
    if (zoneRes.data) setZones(zoneRes.data);
    if (binRes.data) setBins(binRes.data);
  }, []);

  useEffect(() => {
    void load();
    // Realtime, not polling (CLAUDE.md stack conventions). The ingestion
    // trigger keeps bins.current_fill_level current, so a bins change covers
    // both new fill reports and pickups.
    const channel = supabase
      .channel("collector")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bins" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collection_requests" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const zoneById = useMemo(() => {
    const m = new Map<string, Zone>();
    zones.forEach((z) => m.set(z.id, z));
    return m;
  }, [zones]);

  const mapBins: MapBin[] = useMemo(
    () =>
      bins
        .map((b) => {
          const z = b.zone_id ? zoneById.get(b.zone_id) : null;
          if (!z) return null;
          const { lng, lat } = binApproxCoords(b.id, {
            lng: z.centroid_lng,
            lat: z.centroid_lat,
          });
          return {
            id: b.id,
            lng,
            lat,
            fillLevel: b.current_fill_level,
            label: `${b.type} bin`,
          };
        })
        .filter((x): x is MapBin => x !== null),
    [bins, zoneById],
  );

  const collectorUser =
    actingUser?.role === "collector"
      ? actingUser
      : (users.find((u) => u.role === "collector") ?? null);

  const collector: CollectorPosition = useMemo(
    () => ({
      lng: collectorUser?.lng ?? KAMPALA_CENTER.lng,
      lat: collectorUser?.lat ?? KAMPALA_CENTER.lat,
      label: collectorUser ? collectorUser.name : "Collector",
    }),
    [collectorUser],
  );

  const handleArrive = useCallback(
    async (bin: MapBin) => {
      if (!collectorUser) {
        setMessage("No collector on file to log this pickup against.");
        return;
      }
      try {
        const { collectionId } = await completePickup({
          binId: bin.id,
          collectorId: collectorUser.id,
        });
        await load();
        setMessage(
          collectionId
            ? `Pickup logged for ${bin.label}. The open request is closed and its alert resolved.`
            : `${bin.label} emptied — no open request for this bin, fill level reset.`,
        );
      } catch (err) {
        setMessage(`Could not log pickup: ${(err as Error).message}`);
      }
    },
    [collectorUser, load],
  );

  if (loading)
    return <p style={{ color: "var(--text-muted-green)" }}>Loading…</p>;

  const sortedBins = [...mapBins].sort((a, b) => b.fillLevel - a.fillLevel);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Collector dispatch</h1>
          <p className="page-subtitle">
            Nearby bins, live · route to the fullest and log the pickup
          </p>
        </div>
      </div>

      {actingUser?.role !== "collector" && (
        <div
          className="alert-custom alert-custom-info"
          style={{ marginBottom: "1.5rem" }}
        >
          <i className="bi bi-info-circle alert-custom-icon" />
          <span>
            Viewing as {actingUser?.name}. Switch the acting user to{" "}
            {collectorUser?.name ?? "a collector"} to log pickups as yourself.
          </span>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <CollectorMap
          bins={mapBins}
          collector={collector}
          onArrive={handleArrive}
        />
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-muted-green)",
            }}
          >
            Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map. The list below is the
            fallback view.
          </p>
        )}
      </div>

      <div className="table-card-custom" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header-control">
          <span style={{ fontWeight: 700 }}>Bins by fill level</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted-green)" }}>
            {sortedBins.length} bins
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Bin</th>
                <th>Zone</th>
                <th>Fill</th>
              </tr>
            </thead>
            <tbody>
              {sortedBins.map((b) => {
                const bin = bins.find((x) => x.id === b.id);
                const zone = bin?.zone_id ? zoneById.get(bin.zone_id) : null;
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ background: fillColor(b.fillLevel) }}
                      />
                      {b.label}
                    </td>
                    <td>{zone?.name ?? "—"}</td>
                    <td className="num">{b.fillLevel}%</td>
                  </tr>
                );
              })}
              {sortedBins.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "var(--text-muted-green)" }}>
                    No bins.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {message && (
        <div
          className="alert-custom alert-custom-primary"
          style={{ maxWidth: 720 }}
        >
          <i className="bi bi-check-circle alert-custom-icon" />
          <span>{message}</span>
        </div>
      )}
    </>
  );
}
