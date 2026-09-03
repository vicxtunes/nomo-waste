import { describe, expect, it } from "vitest";
import { binApproxCoords, fillColor } from "./map";

describe("fillColor", () => {
  it("bands by fill level", () => {
    expect(fillColor(0)).toBe("#16a34a");
    expect(fillColor(59)).toBe("#16a34a");
    expect(fillColor(60)).toBe("#eab308");
    expect(fillColor(84)).toBe("#eab308");
    expect(fillColor(85)).toBe("#f59e0b");
    expect(fillColor(94)).toBe("#f59e0b");
    expect(fillColor(95)).toBe("#dc2626");
    expect(fillColor(100)).toBe("#dc2626");
  });
});

describe("binApproxCoords", () => {
  const centroid = { lng: 32.5811, lat: 0.3136 };

  it("is deterministic for the same id", () => {
    expect(binApproxCoords("bin-1", centroid)).toEqual(
      binApproxCoords("bin-1", centroid),
    );
  });

  it("stays within ~0.01 of the centroid", () => {
    const p = binApproxCoords("33333333-0000-0000-0000-000000000003", centroid);
    expect(Math.abs(p.lng - centroid.lng)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(p.lat - centroid.lat)).toBeLessThanOrEqual(0.01);
  });

  it("separates different ids", () => {
    expect(binApproxCoords("a", centroid)).not.toEqual(
      binApproxCoords("b", centroid),
    );
  });
});
