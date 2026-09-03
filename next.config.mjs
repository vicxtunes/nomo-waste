/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor wraps a static bundle — every route must export statically.
  // Do not add server actions, route handlers, or dynamic RSC to any route.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
