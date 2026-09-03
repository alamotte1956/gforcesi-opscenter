// Security access levels for GForceSI OpsCenter.
// Each level maps to the app routes a user may reach. The platform `role`
// (admin/user) controls data writes via RLS; `access_level` controls which
// portions of the app a user can see and navigate to.

export const ACCESS_LEVELS = {
  full: { label: "Admin · Full Access", description: "All modules + user management", role: "admin", routes: ["*"] },
  dispatcher: { label: "Dispatcher", description: "Operations, field reporting, messaging", role: "user", routes: ["/", "/jobs", "/routes", "/contractors", "/sites", "/messages", "/daily-reports", "/issues", "/inspections", "/equipment", "/analytics", "/assignment-reports", "/admin", "/compliance"] },
  billing: { label: "Billing & Finance", description: "Clients, projects, invoices, expenses", role: "user", routes: ["/clients", "/projects", "/project-status", "/invoices", "/expenses", "/billing-review", "/analytics", "/assignment-reports"] },
  viewer: { label: "Insights · Read-only", description: "Analytics & compliance dashboards", role: "user", routes: ["/analytics", "/compliance", "/project-status", "/assignment-reports"] },
  field: { label: "Field Crew", description: "Mobile field app + personal schedule", role: "user", routes: ["/field", "/my-schedule", "/contractor-portal", "/notifications"] },
  client: { label: "Client Portal", description: "Client portal only", role: "user", routes: ["/portal", "/notifications"] },
};

export function levelForUser(user) {
  if (!user) return null;
  if (user.role === "admin") return "full";
  return user.access_level || null;
}

export function allowedRoutes(user) {
  const level = levelForUser(user);
  if (!level) return [];
  const def = ACCESS_LEVELS[level];
  return def ? def.routes : [];
}

export function canAccessRoute(user, path) {
  const level = levelForUser(user);
  if (!level) return false;
  const def = ACCESS_LEVELS[level];
  if (!def) return false;
  if (def.routes.includes("*")) return true;
  return def.routes.some((r) => path === r || path.startsWith(r + "/"));
}

export function firstAllowedRoute(user) {
  const routes = allowedRoutes(user);
  if (!routes.length) return null;
  if (routes.includes("*")) return "/";
  return routes[0];
}

export function filterNavGroups(groups, user) {
  const level = levelForUser(user);
  // Unassigned (legacy) users keep full nav until an admin assigns a level.
  if (!level) return groups;
  const def = ACCESS_LEVELS[level];
  if (!def) return groups;
  if (def.routes.includes("*")) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) =>
        def.routes.some((r) => it.to === r || it.to.startsWith(r + "/") || r.startsWith(it.to + "/"))
      ),
    }))
    .filter((g) => g.items.length > 0);
}