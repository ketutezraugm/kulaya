/** Old URLs keep working (QR codes already shared point to /pay/...). Query strings are carried over automatically. */
const moved = [
  ["/pay/:m", "/bayar/:m"], ["/loan/:id", "/modal/:id"], ["/m/:m", "/t/:m"], ["/dashboard", "/toko"], ["/onboard", "/mulai"],
  ["/redteam", "/protocol/redteam"], ["/agent", "/protocol/agent"], ["/pool", "/protocol/pool"],
];

/** Baseline browser hardening. No CSP yet: the wallet modal, inline SVG art and Next's own scripts would need a tuned policy. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // the money screens must not be framed by another site
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

export default {
  poweredByHeader: false,
  async redirects() {
    return moved.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
