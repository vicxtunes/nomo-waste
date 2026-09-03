"use client";

import { useCallback, useEffect, useState } from "react";
import { useActingUser } from "@/context/ActingUserContext";
import { supabase } from "@/lib/supabase";
import { ingestFillReport } from "@/lib/ingestion";
import { FillSlider } from "@/components/FillSlider";
import type { Database } from "@/lib/database.types";

type Bin = Database["public"]["Tables"]["bins"]["Row"];

export default function ReportPage() {
  const { actingUser, loading } = useActingUser();
  const [bins, setBins] = useState<Bin[]>([]);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "info" | "alert";
    text: string;
  } | null>(null);

  const loadBins = useCallback(async () => {
    if (!actingUser) return;
    const { data, error } = await supabase
      .from("bins")
      .select("*")
      .eq("owner_id", actingUser.id)
      .order("created_at", { ascending: true });
    if (error) {
      setMessage({ tone: "alert", text: `Could not load bins: ${error.message}` });
      return;
    }
    setBins(data ?? []);
    setSelectedBinId((prev) =>
      prev && data?.some((b) => b.id === prev) ? prev : (data?.[0]?.id ?? null),
    );
  }, [actingUser]);

  useEffect(() => {
    void loadBins();
  }, [loadBins]);

  const selectedBin = bins.find((b) => b.id === selectedBinId) ?? null;
  const isResident =
    actingUser?.role === "household" || actingUser?.role === "market_vendor";

  async function handleSubmit(level: number) {
    if (!selectedBin) return;
    setMessage(null);
    try {
      const { hasOpenAutoRequest } = await ingestFillReport({
        binId: selectedBin.id,
        fillLevel: level,
        source: "manual_slider",
      });
      await loadBins();
      setMessage(
        hasOpenAutoRequest
          ? {
              tone: "alert",
              text: `Reading recorded at ${level}%. This bin is over the threshold — a pickup request is open.`,
            }
          : {
              tone: "info",
              text: `Reading recorded at ${level}%. No pickup needed yet.`,
            },
      );
    } catch (err) {
      setMessage({
        tone: "alert",
        text: `Failed to submit: ${(err as Error).message}`,
      });
    }
  }

  if (loading)
    return <p style={{ color: "var(--text-muted-green)" }}>Loading…</p>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Report a fill level</h1>
          <p className="page-subtitle">
            Manual slider input — the single ingestion point for every reading.
          </p>
        </div>
      </div>

      {!isResident ? (
        <div className="alert-custom alert-custom-info" style={{ maxWidth: 640 }}>
          <i className="bi bi-info-circle alert-custom-icon" />
          <span>
            Switch the acting user (top right) to a household or market vendor to
            report a bin fill level.
          </span>
        </div>
      ) : bins.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--text-muted-green)" }}>
            No bins are registered to this account.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Your bins</h2>
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {bins.map((b) => {
                const active = b.id === selectedBinId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBinId(b.id)}
                    className="pill-tab lg:flex lg:items-center lg:justify-between"
                    style={{
                      border: "1px solid",
                      borderColor: active
                        ? "var(--brand-forest-medium)"
                        : "rgba(11,19,15,.12)",
                      background: active
                        ? "var(--brand-forest-medium)"
                        : "#fff",
                      color: active ? "#fff" : "var(--text-main)",
                    }}
                  >
                    <span style={{ textTransform: "capitalize" }}>{b.type}</span>
                    <span className="num" style={{ marginLeft: 8 }}>
                      {b.current_fill_level}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBin && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  How full is the{" "}
                  <span style={{ textTransform: "lowercase" }}>
                    {selectedBin.type}
                  </span>{" "}
                  bin?
                </h2>
              </div>
              <FillSlider
                key={selectedBin.id}
                initial={selectedBin.current_fill_level}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>
      )}

      {message && (
        <div
          className={`alert-custom ${
            message.tone === "alert"
              ? "alert-custom-warning"
              : "alert-custom-success"
          }`}
          style={{ marginTop: "1.5rem", maxWidth: 640 }}
        >
          <i
            className={`bi ${
              message.tone === "alert"
                ? "bi-exclamation-triangle"
                : "bi-check-circle"
            } alert-custom-icon`}
          />
          <span>{message.text}</span>
        </div>
      )}
    </>
  );
}
