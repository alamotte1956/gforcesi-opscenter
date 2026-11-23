// Detects whether the app is being accessed via the simplified Client Property Portal subdomain
// (https://portal.twinscanstudio.com) while keeping full Ops Command on gforcesi.twinscanstudio.com.

export function isPropertyPortalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "portal.twinscanstudio.com" || host.startsWith("portal.");
}
