"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { KAMPALA_CENTER, fillColor, type MapBin } from "@/lib/map";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface CollectorPosition {
  lng: number;
  lat: number;
  label: string;
}

interface CollectorMapProps {
  bins: MapBin[];
  collector: CollectorPosition;
  /** Called once the animated collector reaches the dispatched bin. */
  onArrive?: (bin: MapBin) => void | Promise<void>;
}

type Phase = "idle" | "routing" | "en_route" | "arrived";

interface DirectionsResponse {
  routes?: {
    duration: number;
    distance: number;
    geometry: GeoJSON.LineString;
  }[];
}

/**
 * Collector dispatch map. Pins are bins coloured by fill level; a "Dispatch"
 * button routes the collector to the fullest bin via the Mapbox Directions API
 * and animates a van along the returned geometry. On arrival `onArrive` fires —
 * the page uses that to write the pickup to Supabase; the pin then greens out
 * live through the Realtime subscription rather than being mutated here.
 *
 * Renders nothing without NEXT_PUBLIC_MAPBOX_TOKEN — the list on the page is the
 * always-present fallback (some collectors are on low-end phones anyway).
 */
export function CollectorMap({ bins, collector, onArrive }: CollectorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const binMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const collectorMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vanMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const cancelAnimRef = useRef<(() => void) | null>(null);

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const [target, setTarget] = useState<MapBin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [KAMPALA_CENTER.lng, KAMPALA_CENTER.lat],
      zoom: 11,
    });
    mapRef.current = map;
    map.on("load", () => setReady(true));
    return () => {
      cancelAnimRef.current?.();
      cancelAnimRef.current = null;
      map.remove();
      mapRef.current = null;
      collectorMarkerRef.current = null;
      vanMarkerRef.current = null;
      binMarkersRef.current = [];
      setReady(false);
    };
  }, []);

  // Bin + collector markers, and fit-to-bounds while idle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    binMarkersRef.current.forEach((m) => m.remove());
    binMarkersRef.current = bins.map((b) => {
      const el = document.createElement("div");
      el.style.cssText = `width:16px;height:16px;border-radius:9999px;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25);background:${fillColor(
        b.fillLevel,
      )}`;
      return new mapboxgl.Marker({ element: el })
        .setLngLat([b.lng, b.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setText(
            `${b.label} — ${b.fillLevel}%`,
          ),
        )
        .addTo(map);
    });

    if (!collectorMarkerRef.current) {
      const el = document.createElement("div");
      el.textContent = "🚛";
      el.style.cssText =
        "font-size:22px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))";
      collectorMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([collector.lng, collector.lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(collector.label))
        .addTo(map);
    } else {
      collectorMarkerRef.current.setLngLat([collector.lng, collector.lat]);
    }

    if (phaseRef.current === "idle") {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([collector.lng, collector.lat]);
      bins.forEach((b) => bounds.extend([b.lng, b.lat]));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
      }
    }
  }, [bins, collector, ready]);

  const reset = useCallback(() => {
    cancelAnimRef.current?.();
    cancelAnimRef.current = null;
    const map = mapRef.current;
    vanMarkerRef.current?.remove();
    if (map?.getLayer("route-line")) map.removeLayer("route-line");
    if (map?.getSource("route")) map.removeSource("route");
    setPhase("idle");
    setTarget(null);
    setError(null);
  }, []);

  const dispatch = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !TOKEN) return;

    const fullest = [...bins].sort((a, b) => b.fillLevel - a.fillLevel)[0];
    if (!fullest) {
      setError("No bins to dispatch to.");
      return;
    }

    setError(null);
    setTarget(fullest);
    setPhase("routing");

    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${collector.lng},${collector.lat};${fullest.lng},${fullest.lat}` +
        `?geometries=geojson&overview=full&access_token=${TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Directions API ${res.status}`);
      const json = (await res.json()) as DirectionsResponse;
      const route = json.routes?.[0];
      if (!route) throw new Error("No route found.");

      const coords = route.geometry.coordinates as number[][];
      const feature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      };

      const source = map.getSource("route") as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (source) {
        source.setData(feature);
      } else {
        map.addSource("route", { type: "geojson", data: feature });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#072f1f", "line-width": 4, "line-opacity": 0.85 },
        });
      }

      if (!vanMarkerRef.current) {
        const el = document.createElement("div");
        el.textContent = "🚚";
        el.style.cssText = "font-size:22px;line-height:1";
        vanMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        });
      }
      vanMarkerRef.current.setLngLat(coords[0] as [number, number]).addTo(map);

      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c as [number, number]));
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });

      setPhase("en_route");
      const durationMs = Math.min(9000, Math.max(3500, (route.duration || 60) * 25));
      cancelAnimRef.current = animateAlong(
        coords,
        vanMarkerRef.current,
        durationMs,
        () => {
          cancelAnimRef.current = null;
          setPhase("arrived");
          void onArrive?.(fullest);
        },
      );
    } catch (err) {
      setPhase("idle");
      setTarget(null);
      setError((err as Error).message);
    }
  }, [bins, collector, onArrive]);

  if (!TOKEN) return null;

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-96 w-full overflow-hidden"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        {phase === "idle" && (
          <button
            type="button"
            className="btn-custom btn-custom-primary"
            onClick={dispatch}
            disabled={!ready || bins.length === 0}
          >
            <i className="bi bi-truck" /> Dispatch to fullest bin
          </button>
        )}
        {phase === "routing" && (
          <span className="text-sm" style={{ color: "var(--text-muted-green)" }}>
            Calculating route…
          </span>
        )}
        {phase === "en_route" && target && (
          <span className="text-sm" style={{ color: "var(--text-main)" }}>
            En route to {target.label} —{" "}
            <span className="num">{target.fillLevel}%</span>
          </span>
        )}
        {phase === "arrived" && target && (
          <>
            <span
              className="alert-custom alert-custom-success"
              style={{ padding: "0.5rem 0.85rem" }}
            >
              <i className="bi bi-check-circle" /> Arrived at {target.label}.
              Pickup logged.
            </span>
            <button
              type="button"
              className="btn-custom btn-custom-light btn-custom-sm"
              onClick={reset}
            >
              Clear route
            </button>
          </>
        )}
        {error && (
          <span className="text-sm" style={{ color: "var(--sys-red)" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Move `marker` along `coords` (a [lng, lat] polyline) over `durationMs`,
 * interpolating between vertices so the speed is steady regardless of how many
 * points the route has. Returns a cancel function.
 */
function animateAlong(
  coords: number[][],
  marker: mapboxgl.Marker,
  durationMs: number,
  onDone: () => void,
): () => void {
  let raf = 0;
  let cancelled = false;
  const start = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / durationMs);
    const pos = t * (coords.length - 1);
    const i = Math.floor(pos);
    const frac = pos - i;
    const a = coords[i];
    const b = coords[Math.min(i + 1, coords.length - 1)];
    marker.setLngLat([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      onDone();
    }
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
