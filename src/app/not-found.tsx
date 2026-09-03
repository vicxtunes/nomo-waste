import Link from "next/link";

/**
 * 404 — styled after the Spark Admin error card. Rendered by the root layout
 * only (no `(app)` shell), matching the theme's standalone error page.
 */
export default function NotFound() {
  return (
    <div className="login-wrapper">
      <div className="login-bg-shape login-bg-shape-1" />
      <div className="login-bg-shape login-bg-shape-2" />

      <div
        className="error-card-custom"
        style={{ maxWidth: 620, width: "100%" }}
      >
        <div className="error-title-huge">
          <span>4</span>
          <i className="bi bi-recycle" />
          <span>4</span>
        </div>
        <h1 className="error-subtitle">Page not found</h1>
        <p className="error-desc">
          The page you are looking for might have been moved, renamed, or never
          existed.
        </p>
        <Link href="/" className="btn-custom btn-custom-primary">
          <i className="bi bi-house" /> Back to overview
        </Link>
      </div>
    </div>
  );
}
