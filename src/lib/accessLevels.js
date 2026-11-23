// Unified Security Access Levels & RBAC Route Mapping for G-Force SI (GForcesi.com)
// Maps platform roles & access_levels to routes and granular permission profiles.

export const ACCESS_LEVELS = {
  full: {
    label: "Admin · Full Access",
    roleTag: "ADMIN",
    description: "Complete executive control across Ops, Finance, HR/Tax, Legal, Marketing & RBAC",
    role: "admin",
    routes: ["*"],
  },
  ops_manager: {
    label: "Operations Manager",
    roleTag: "OPS_MANAGER",
    description: "50-state dispatch, AI routing, AK/HI travel bundles, Matterport QA, crew compliance",
    role: "user",
    routes: [
      "/ops", "/us-map", "/admin", "/jobs", "/deliverables", "/routes", "/travel",
      "/recurring-schedules", "/contractors", "/contractor-board", "/sites",
      "/projects", "/clients", "/messages", "/daily-reports", "/issues",
      "/inspections", "/drone-compliance", "/equipment", "/equipment-maintenance",
      "/matterport", "/analytics", "/profitability", "/project-status",
      "/crew-performance", "/performance-report", "/assignment-reports",
      "/compliance", "/import", "/quick-start", "/leads", "/proposals",
      "/marketing", "/legal", "/hipaa", "/privacy", "/terms",
    ],
  },
  dispatcher: {
    label: "Dispatcher",
    roleTag: "OPS_MANAGER",
    description: "Operations dispatch, field reporting, routing, messaging",
    role: "user",
    routes: [
      "/ops", "/us-map", "/jobs", "/deliverables", "/routes", "/travel", "/recurring-schedules",
      "/contractors", "/contractor-board", "/sites", "/messages", "/daily-reports",
      "/issues", "/inspections", "/drone-compliance", "/equipment",
      "/equipment-maintenance", "/analytics", "/assignment-reports", "/compliance",
    ],
  },
  billing: {
    label: "Billing, Tax & Finance",
    roleTag: "OPS_MANAGER",
    description: "Clients, invoices, expenses, QuickBooks Online sync, HR/Tax & 1099 payroll",
    role: "user",
    routes: [
      "/ops", "/finance", "/quickbooks", "/quickbooks-setup", "/quickbooks-mapping",
      "/quickbooks-reports", "/quickbooks-errors", "/hr-tax-payroll",
      "/clients", "/projects", "/proposals", "/leads", "/project-status",
      "/invoices", "/expenses", "/expense-approvals", "/payouts", "/payout-review",
      "/billing-review", "/analytics", "/profitability", "/assignment-reports",
      "/legal", "/privacy", "/terms",
    ],
  },
  viewer: {
    label: "Executive Insights · Read-Only",
    roleTag: "OPS_MANAGER",
    description: "Analytics, profitability & compliance dashboards",
    role: "user",
    routes: ["/ops", "/analytics", "/compliance", "/project-status", "/assignment-reports", "/profitability"],
  },
  field: {
    label: "Field Technician / Contractor",
    roleTag: "CONTRACTOR",
    description: "Offline-first Field PWA, schedule, contracts, expenses & payout tracking",
    role: "user",
    routes: [
      "/field", "/my-schedule", "/contractor-portal", "/contractors/onboarding",
      "/notifications", "/drone-compliance", "/legal", "/hipaa", "/privacy", "/terms",
    ],
  },
  agency_client: {
    label: "Ad Agency / Enterprise Client",
    roleTag: "AGENCY_CLIENT",
    description: "White-label multi-branch client portal, Matterport PME viewer & invoices",
    role: "user",
    routes: ["/owner-portal", "/client-portal", "/portal", "/notifications", "/legal", "/hipaa", "/privacy", "/terms"],
  },
  client: {
    label: "Enterprise Direct Client",
    roleTag: "AGENCY_CLIENT",
    description: "Enterprise client portal, deliverables sign-off & invoice downloads",
    role: "user",
    routes: ["/owner-portal", "/client-portal", "/portal", "/notifications", "/legal", "/hipaa", "/privacy", "/terms"],
  },
};

export function levelForUser(user) {
  if (!user) return null;
  if (user.role === "admin") return "full";
  return user.access_level || null;
}

export function roleBadgeForUser(user) {
  if (!user) return "PUBLIC";
  const level = levelForUser(user);
  return ACCESS_LEVELS[level]?.roleTag || "PUBLIC";
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
  if (!routes.length) return "/ops";
  if (routes.includes("*")) return "/ops";
  return routes[0];
}

export function filterNavGroups(groups, user) {
  const level = levelForUser(user);
  if (!level) return groups;
  const def = ACCESS_LEVELS[level];
  if (!def) return groups;
  if (def.routes.includes("*")) return groups;
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (it.external) return ["full", "ops_manager", "billing", "field"].includes(level);
        return def.routes.some((r) => it.to === r || it.to.startsWith(r + "/") || r.startsWith(it.to + "/"));
      }),
    }))
    .filter((g) => g.items.length > 0);
}
