"use client";

import { useActingUser } from "@/context/ActingUserContext";

function initials(name: string): string {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Dev-only stand-in for auth: pick which seeded user the app acts as.
export function ActingUserSwitcher() {
  const { users, actingUser, setActingUserId, loading } = useActingUser();

  if (loading) {
    return (
      <span className="text-sm" style={{ color: "var(--text-muted-green)" }}>
        Loading…
      </span>
    );
  }

  return (
    <div className="navbar-user" title="Acting as (dev stand-in for auth)">
      <span className="navbar-user-avatar">
        {actingUser ? initials(actingUser.name) : "—"}
      </span>
      <select
        className="navbar-user-select"
        aria-label="Acting as"
        value={actingUser?.id ?? ""}
        onChange={(e) => setActingUserId(e.target.value)}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
