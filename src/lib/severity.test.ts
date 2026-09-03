import { describe, expect, it } from "vitest";
import { severityForFill } from "./severity";

// Must stay identical to the SQL `severity_for_fill` bands in
// supabase/migrations/20260830000005_ingestion_trigger.sql.
describe("severityForFill", () => {
  it("returns low below 85", () => {
    expect(severityForFill(0)).toBe("low");
    expect(severityForFill(80)).toBe("low");
    expect(severityForFill(84)).toBe("low");
  });

  it("returns medium from 85 to 94", () => {
    expect(severityForFill(85)).toBe("medium");
    expect(severityForFill(90)).toBe("medium");
    expect(severityForFill(94)).toBe("medium");
  });

  it("returns high from 95", () => {
    expect(severityForFill(95)).toBe("high");
    expect(severityForFill(100)).toBe("high");
  });
});
