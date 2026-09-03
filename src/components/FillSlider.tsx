"use client";

import { useState } from "react";

interface FillSliderProps {
  initial: number;
  disabled?: boolean;
  onSubmit: (level: number) => Promise<void> | void;
}

function barColor(pct: number): string {
  if (pct >= 95) return "#dc2626";
  if (pct >= 85) return "var(--sys-orange)";
  if (pct >= 60) return "#eab308";
  return "var(--sys-green)";
}

export function FillSlider({ initial, disabled, onSubmit }: FillSliderProps) {
  const [level, setLevel] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    try {
      await onSubmit(level);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="form-label-custom" style={{ margin: 0 }}>
          Fill level
        </span>
        <span
          className="num"
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          {level}%
        </span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: "50rem",
          background: "var(--bs-body-bg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${level}%`,
            background: barColor(level),
            borderRadius: "50rem",
            transition: "width 0.2s ease, background 0.2s ease",
          }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={level}
        disabled={disabled || busy}
        onChange={(e) => setLevel(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--brand-forest-medium)" }}
        aria-label="Fill level percentage"
      />

      <button
        type="button"
        className="btn-custom btn-custom-primary btn-custom-lg w-full"
        disabled={disabled || busy}
        onClick={handleSubmit}
      >
        {busy ? "Submitting…" : "Submit reading"}
        {!busy && <i className="bi bi-arrow-right" />}
      </button>
    </div>
  );
}
