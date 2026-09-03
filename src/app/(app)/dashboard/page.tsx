"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useActingUser } from "@/context/ActingUserContext";
import { AlertList, type DashboardAlert } from "@/components/AlertList";
import { ZoneMap } from "@/components/ZoneMap";
import { binApproxCoords, type MapBin } from "@/lib/map";
import type { Database } from "@/lib/database.types";

type Zone = Database["public"]["Tables"]["zones"]["Row"];
type Bin = Database["public"]["Tables"]["bins"]["Row"];
type Alert = Database["public"]["Tables"]["alerts"]["Row"];

export default function DashboardPage() {
  const { actingUser, loading } = useActingUser();
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  const load = useCallback(async () => {
    const [zoneRes, binRes, alertRes, reqRes] = await Promise.all([
      supabase.from("zones").select("*"),
      supabase.from("bins").select("*"),
      supabase.from("alerts").select("*").is("resolved_at", null),
      supabase
        .from("collection_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);
    if (zoneRes.data) setZones(zoneRes.data);
    if (binRes.data) setBins(binRes.data);
    if (alertRes.data) setAlerts(alertRes.data);
    setPendingRequests(reqRes.count ?? 0);
  }, []);

  useEffect(() => {
    void load();
    // Realtime instead of polling (CLAUDE.md stack conventions).
    const channel = supabase
      .channel("dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => void load(),
      )
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

  const zoneName = useMemo(() => {
    const m = new Map<string, string>();
    zones.forEach((z) => m.set(z.id, z.name));
    return m;
  }, [zones]);

  const binById = useMemo(() => {
    const m = new Map<string, Bin>();
    bins.forEach((b) => m.set(b.id, b));
    return m;
  }, [bins]);

  const dashboardAlerts: DashboardAlert[] = alerts.map((a) => {
    const bin = a.bin_id ? binById.get(a.bin_id) : null;
    return {
      id: a.id,
      severity: a.severity,
      created_at: a.created_at,
      zoneName: a.zone_id ? (zoneName.get(a.zone_id) ?? null) : null,
      binLabel: bin ? `${bin.type} bin` : null,
      fillLevel: bin ? bin.current_fill_level : null,
    };
  });

  const zoneRows = zones
    .map((z) => {
      const zoneBins = bins.filter((b) => b.zone_id === z.id);
      const avg =
        zoneBins.length > 0
          ? Math.round(
              zoneBins.reduce((s, b) => s + b.current_fill_level, 0) /
                zoneBins.length,
            )
          : null;
      const openAlerts = alerts.filter((a) => a.zone_id === z.id).length;
      return { id: z.id, name: z.name, bins: zoneBins.length, avg, openAlerts };
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

  const mapBins: MapBin[] = bins
    .map((b) => {
      const z = b.zone_id ? zones.find((x) => x.id === b.zone_id) : null;
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
    .filter((x): x is MapBin => x !== null);

  if (loading)
    return <p style={{ color: "var(--text-muted-green)" }}>Loading…</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone overview</h1>
          <p className="page-subtitle">
            Authority dashboard · read-only · live via Realtime
          </p>
        </div>
      </div>

      {actingUser?.role !== "admin" && (
        <div
          className="alert-custom alert-custom-info"
          style={{ marginBottom: "1.5rem" }}
        >
          <i className="bi bi-info-circle alert-custom-icon" />
          <span>
            Viewing as {actingUser?.name}. This screen is intended for KCCA /
            NEMA staff.
          </span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3" style={{ marginBottom: "1.5rem" }}>
        <Stat label="Unresolved alerts" value={alerts.length} icon="bi-bell" />
        <Stat
          label="High severity"
          value={alerts.filter((a) => a.severity === "high").length}
          icon="bi-exclamation-octagon"
        />
        <Stat
          label="Pending pickups"
          value={pendingRequests}
          icon="bi-truck"
        />
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <h2 className="card-title">Alerts by severity</h2>
        </div>
        <AlertList alerts={dashboardAlerts} />
      </div>

      <div className="table-card-custom" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header-control">
          <span style={{ fontWeight: 700 }}>Bin fill by zone</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted-green)" }}>
            {zoneRows.length} zones
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Bins</th>
                <th>Avg fill</th>
                <th>Open alerts</th>
              </tr>
            </thead>
            <tbody>
              {zoneRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td className="num">{r.bins}</td>
                  <td className="num">{r.avg != null ? `${r.avg}%` : "—"}</td>
                  <td>
                    <span
                      className={`badge-table ${
                        r.openAlerts > 0 ? "failed" : "success"
                      }`}
                    >
                      {r.openAlerts}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Map</h2>
        </div>
        <ZoneMap bins={mapBins} />
        {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-muted-green)",
            }}
          >
            Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map. The table above is
            the fallback view.
          </p>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <span className="stat-label">{label}</span>
        <i
          className={`bi ${icon}`}
          style={{ color: "var(--text-muted-green)", fontSize: "1.1rem" }}
        />
      </div>
      <p className="stat-value num">{value}</p>
    </div>
  );
}
