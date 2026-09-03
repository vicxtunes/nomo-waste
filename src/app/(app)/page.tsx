"use client";

import Link from "next/link";
import { useActingUser } from "@/context/ActingUserContext";

const CARDS = [
  {
    href: "/report",
    icon: "bi-clipboard-data",
    title: "Report a bin fill level",
    body: "Set how full a bin is on a slider. Crossing the threshold opens a pickup request automatically.",
  },
  {
    href: "/collector",
    icon: "bi-truck",
    title: "Collector dispatch",
    body: "See nearby bins on the map, route to the fullest one, and log the pickup on arrival.",
  },
  {
    href: "/dashboard",
    icon: "bi-speedometer2",
    title: "Authority dashboard",
    body: "Read-only view of alerts by severity and bin fill levels aggregated by zone.",
  },
];

export default function HomePage() {
  const { actingUser } = useActingUser();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            A shared, real-time picture of where waste is
          </h1>
          <p className="page-subtitle">
            {actingUser
              ? `Signed in as ${actingUser.name}`
              : "Coordination between households, collectors, and authorities"}
          </p>
        </div>
      </div>

      <div className="card alert-green-card" style={{ marginBottom: "1.5rem" }}>
        <span className="stat-label">Phase 1 — the honest framing</span>
        <p
          className="stat-value"
          style={{ fontSize: "1.35rem", maxWidth: "60ch" }}
        >
          Visibility and coordination. It does not divert emissions by itself —
          it makes the data that later diversion work depends on.
        </p>
        <Link
          href="/dashboard"
          className="text-lime"
          style={{ fontWeight: 600, fontSize: "0.875rem" }}
        >
          Open the authority view <i className="bi bi-arrow-right" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card group block">
            <span
              className="navbar-action-btn"
              style={{ marginBottom: "1rem", cursor: "pointer" }}
            >
              <i className={`bi ${c.icon}`} />
            </span>
            <h2 className="card-title">{c.title}</h2>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-muted-green)" }}
            >
              {c.body}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--brand-forest-medium)" }}
            >
              Open <i className="bi bi-arrow-right" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
