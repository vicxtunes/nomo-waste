"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fillColor, type MapBin } from "@/lib/map";

export type { MapBin };

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Mapbox pins colored by fill level. Renders nothing when
 * NEXT_PUBLIC_MAPBOX_TOKEN is unset — the AlertList / zone table is the
 * always-present fallback (some users are on low-end phones anyway).
 */
export function ZoneMap({ bins }: { bins: MapBin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [32.5811, 0.3136], // Kampala
      zoom: 11,
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = bins.map((b) => {
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:9999px;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2);background:${fillColor(
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
  }, [bins]);

  if (!TOKEN) return null;

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden"
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-light)",
      }}
    />
  );
}
