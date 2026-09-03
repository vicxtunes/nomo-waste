"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActingUserSwitcher } from "@/components/ActingUserSwitcher";
import { useActingUser } from "@/context/ActingUserContext";

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Menu",
    items: [{ href: "/", label: "Overview", icon: "bi-grid-1x2-fill" }],
  },
  {
    title: "Operations",
    items: [
      { href: "/report", label: "Report fill", icon: "bi-clipboard-data" },
      { href: "/collector", label: "Collector", icon: "bi-truck" },
      { href: "/dashboard", label: "Authority", icon: "bi-speedometer2" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/login", label: "Sign in", icon: "bi-box-arrow-in-right" },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  household: "Household",
  market_vendor: "Market vendor",
  collector: "Collector",
  admin: "KCCA / authority",
};

function initials(name: string): string {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Admin shell ported from the Spark Admin theme: a fixed dark forest sidebar,
 * a sticky blurred topbar, and a footer — the "bars". Off-canvas below 1200px
 * (the CSS breakpoint), toggled here. Wraps the `(app)` route group; `/login`
 * and the 404 render outside it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const rawPath = usePathname();
  const path = rawPath.replace(/\/+$/, "") || "/";
  const [open, setOpen] = useState(false);
  const { actingUser } = useActingUser();

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const currentLabel =
    NAV.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ??
    "Nomo Waste";

  return (
    <>
      <aside className={`sidebar-wrapper${open ? " show" : ""}`}>
        <Link href="/" className="sidebar-brand">
          <i className="bi bi-recycle" />
          <span>Nomo&nbsp;Waste</span>
        </Link>

        <div className="flex-1 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.title} className="sidebar-menu-section">
              <div className="sidebar-menu-title">{group.title}</div>
              <ul className="sidebar-menu-list">
                {group.items.map((item) => (
                  <li key={item.href} className="sidebar-menu-item">
                    <Link
                      href={item.href}
                      className={`sidebar-menu-link${
                        isActive(item.href) ? " active" : ""
                      }`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <i className={`bi ${item.icon}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sidebar-profile">
          <span className="sidebar-profile-img">
            {actingUser ? initials(actingUser.name) : "—"}
          </span>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">
              {actingUser?.name ?? "No user"}
            </div>
            <div className="sidebar-profile-email">
              {actingUser ? (ROLE_LABEL[actingUser.role] ?? actingUser.role) : ""}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`sidebar-overlay${open ? " show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className="main-wrapper">
        <header className="navbar-custom">
          <div className="navbar-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <i className="bi bi-list" />
            </button>
            <span className="text-[1.1rem] font-bold">{currentLabel}</span>
          </div>

          <div className="navbar-search-wrapper">
            <input
              type="search"
              className="navbar-search-input"
              placeholder="Search zones, bins, collectors…"
              aria-label="Search"
            />
            <span className="navbar-search-btn">
              <i className="bi bi-search" />
            </span>
          </div>

          <div className="navbar-actions">
            <button
              type="button"
              className="navbar-action-btn"
              aria-label="Notifications"
            >
              <i className="bi bi-bell" />
            </button>
            <ActingUserSwitcher />
          </div>
        </header>

        <div className="page-body">{children}</div>

        <footer className="footer-custom">
          <div className="footer-left">
            <span className="footer-logo">
              <i className="bi bi-recycle" /> Nomo Waste
            </span>
            <span className="footer-separator">|</span>
            <span>UCIC 2026 · MVP — visibility &amp; coordination, Phase 1</span>
          </div>
          <ul className="footer-links">
            <li>
              <Link href="/dashboard" className="footer-link">
                Authority
              </Link>
            </li>
            <li>
              <Link href="/report" className="footer-link">
                Report
              </Link>
            </li>
            <li>
              <span className="footer-link">
                Realtime <span className="status-dot" />
              </span>
            </li>
          </ul>
        </footer>
      </div>
    </>
  );
}
