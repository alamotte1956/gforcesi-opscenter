import { base44 } from "@/api/base44Client";
import { levelForUser } from "@/lib/accessLevels";

let permissionCache = null;
let cacheUserId = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;

const emptyMatrix = () => ({
  expenses: { submit: false, view_own: false, view_all: false, approve: false, reject: false, delete: false },
  quickbooks: { connect: false, sync: false, view_reports: false, view_errors: false },
  projects: { view: false, create: false, edit: false, delete: false },
  sites: { view: false, create: false, edit: false, delete: false, import: false },
  personnel: { view: false, create: false, edit: false, delete: false },
  routing: { view_own: false, view_all: false, optimize: false },
  deliverables: { view: false, qa_signoff: false, deliver: false, approve: false },
  hr_tax_payroll: { view: false, generate_w9: false, approve_payouts: false },
  marketing: { view: false, publish_metricool: false },
  admin: { manage_roles: false, manage_users: false, view_all_data: false },
});

const fullMatrix = () => ({
  expenses: { submit: true, view_own: true, view_all: true, approve: true, reject: true, delete: true },
  quickbooks: { connect: true, sync: true, view_reports: true, view_errors: true },
  projects: { view: true, create: true, edit: true, delete: true },
  sites: { view: true, create: true, edit: true, delete: true, import: true },
  personnel: { view: true, create: true, edit: true, delete: true },
  routing: { view_own: true, view_all: true, optimize: true },
  deliverables: { view: true, qa_signoff: true, deliver: true, approve: true },
  hr_tax_payroll: { view: true, generate_w9: true, approve_payouts: true },
  marketing: { view: true, publish_metricool: true },
  admin: { manage_roles: true, manage_users: true, view_all_data: true },
});

export function defaultPermissionsForLevel(level) {
  if (level === "full") return fullMatrix();
  const m = emptyMatrix();
  if (level === "ops_manager" || level === "dispatcher") {
    m.projects = { view: true, create: true, edit: true, delete: false };
    m.sites = { view: true, create: true, edit: true, delete: false, import: true };
    m.personnel = { view: true, create: true, edit: true, delete: false };
    m.routing = { view_own: true, view_all: true, optimize: true };
    m.deliverables = { view: true, qa_signoff: true, deliver: true, approve: false };
    m.expenses = { submit: true, view_own: true, view_all: true, approve: false, reject: false, delete: false };
    m.marketing = { view: true, publish_metricool: level === "ops_manager" };
  } else if (level === "billing") {
    m.expenses = { submit: true, view_own: true, view_all: true, approve: true, reject: true, delete: false };
    m.quickbooks = { connect: true, sync: true, view_reports: true, view_errors: true };
    m.hr_tax_payroll = { view: true, generate_w9: true, approve_payouts: true };
    m.projects = { view: true, create: false, edit: false, delete: false };
  } else if (level === "field") {
    m.expenses = { submit: true, view_own: true, view_all: false, approve: false, reject: false, delete: false };
    m.routing = { view_own: true, view_all: false, optimize: false };
    m.sites = { view: true, create: false, edit: false, delete: false, import: false };
  } else if (level === "client" || level === "agency_client") {
    m.deliverables = { view: true, qa_signoff: false, deliver: false, approve: true };
    m.projects = { view: true, create: false, edit: false, delete: false };
    m.sites = { view: true, create: false, edit: false, delete: false, import: false };
  } else if (level === "viewer") {
    m.projects.view = true;
    m.sites.view = true;
    m.deliverables.view = true;
  }
  return m;
}

export async function getUserPermissions(user) {
  if (!user) return emptyMatrix();

  if (
    permissionCache &&
    cacheUserId === user.id &&
    cacheTimestamp &&
    Date.now() - cacheTimestamp < CACHE_DURATION
  ) {
    return permissionCache;
  }

  const level = levelForUser(user);
  const basePerms = defaultPermissionsForLevel(level);

  if (level === "full") {
    permissionCache = basePerms;
    cacheUserId = user.id;
    cacheTimestamp = Date.now();
    return basePerms;
  }

  // Merge any custom Role/UserRole grants stored in Base44
  try {
    const [userRoles, roles] = await Promise.all([
      base44.entities.UserRole.filter({ user_email: user.email }).catch(() => []),
      base44.entities.Role.list().catch(() => []),
    ]);
    const roleIds = new Set(userRoles.map((ur) => ur.role_id));
    const activeRoles = roles.filter((r) => roleIds.has(r.id) && r.active !== false);

    activeRoles.forEach((role) => {
      if (!role.permissions) return;
      Object.keys(basePerms).forEach((cat) => {
        if (!role.permissions[cat]) return;
        Object.keys(basePerms[cat]).forEach((act) => {
          if (role.permissions[cat][act] === true) {
            basePerms[cat][act] = true;
          }
        });
      });
    });
  } catch {
    // Fallback cleanly to access_level defaults
  }

  permissionCache = basePerms;
  cacheUserId = user.id;
  cacheTimestamp = Date.now();
  return basePerms;
}

export function clearPermissionCache() {
  permissionCache = null;
  cacheUserId = null;
  cacheTimestamp = null;
}

export function hasPermission(permissions, category, action) {
  return Boolean(permissions?.[category]?.[action] === true);
}

export function hasAnyPermission(permissions, category, actions) {
  return Boolean(permissions && actions.some((action) => permissions[category]?.[action] === true));
}

export function hasAllPermissions(permissions, category, actions) {
  return Boolean(permissions && actions.every((action) => permissions[category]?.[action] === true));
}
