// Shared helpers for the Mapbox screens (authority ZoneMap, collector
// CollectorMap). Pure — no `mapbox-gl` import, safe to use in tests and on the
// server.

export interface LngLat {
  lng: number;
  lat: number;
}

export interface MapBin {
  id: string;
  lng: number;
  lat: number;
  fillLevel: number;
  label: string;
}

/** Kampala — Central Division centroid. Default map center. */
export const KAMPALA_CENTER: LngLat = { lng: 32.5811, lat: 0.3136 };

/**
 * Pin colour by fill level. Bands are deliberately finer than the alert
 * severity bands in `severity.ts` — this is a visual gradient, not the
 * low/medium/high the ingestion trigger records.
 */
export function fillColor(pct: number): string {
  if (pct >= 95) return "#dc2626"; // red
  if (pct >= 85) return "#f59e0b"; // amber
  if (pct >= 60) return "#eab308"; // yellow
  return "#16a34a"; // green
}

/**
 * Bins have no real coordinates yet (registration comes later), so both maps
 * place a bin with deterministic jitter around its zone centroid. The same id
 * always yields the same point, so pins don't jump between renders.
 */
export function binApproxCoords(binId: string, centroid: LngLat): LngLat {
  const h = hashToUnit(binId);
  return {
    lng: centroid.lng + (h.x - 0.5) * 0.02,
    lat: centroid.lat + (h.y - 0.5) * 0.02,
  };
}

function hashToUnit(s: string): { x: number; y: number } {
  let a = 2166136261;
  for (let i = 0; i < s.length; i++) {
    a ^= s.charCodeAt(i);
    a = Math.imul(a, 16777619);
  }
  const x = ((a >>> 0) % 1000) / 1000;
  const y = ((a >>> 8) % 1000) / 1000;
  return { x, y };
}
