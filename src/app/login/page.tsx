"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Visual login screen ported from the Spark Admin theme. Auth is still faked
 * (see src/context/ActingUserContext.tsx) — "Sign in" just enters the app.
 * This screen renders outside the `(app)` route group, so it has no shell.
 */
export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-wrapper">
      <div className="login-bg-shape login-bg-shape-1" />
      <div className="login-bg-shape login-bg-shape-2" />

      <div className="login-card">
        <Link href="/" className="login-brand">
          <i className="bi bi-recycle" />
          <span>Nomo&nbsp;Waste</span>
        </Link>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Sign in to coordinate collection across Kampala
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/");
          }}
        >
          <div className="login-form-group">
            <label htmlFor="phone" className="login-form-label">
              Phone number
            </label>
            <div className="login-input-group">
              <i className="bi bi-telephone input-icon" />
              <input
                id="phone"
                type="tel"
                className="login-input"
                placeholder="+256 700 000 000"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="login-form-group">
            <label htmlFor="password" className="login-form-label">
              PIN
            </label>
            <div className="login-input-group">
              <i className="bi bi-shield-lock input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="••••••"
                style={{ paddingRight: "2.85rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                style={{
                  position: "absolute",
                  right: "1.25rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted-green)",
                  cursor: "pointer",
                }}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login">
            <span>Sign in</span>
            <i className="bi bi-arrow-right" />
          </button>
        </form>

        <p className="login-footer-text" style={{ marginTop: "1.5rem" }}>
          Phone-OTP auth isn&apos;t wired up yet —{" "}
          <Link href="/">skip to the app</Link>
        </p>
      </div>
    </div>
  );
}
