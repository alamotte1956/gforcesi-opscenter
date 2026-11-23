import React from "react";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

const PERMISSION_CATEGORIES = [
  {
    name: "Expenses & Audit",
    key: "expenses",
    permissions: [
      { key: "submit", label: "Submit Expenses", description: "Log receipts & mileage from field or web" },
      { key: "view_own", label: "View Own", description: "Inspect personal expense history" },
      { key: "view_all", label: "View All", description: "Audit company-wide field expenses" },
      { key: "approve", label: "Approve", description: "Approve expenses for reimbursement" },
      { key: "reject", label: "Reject", description: "Flag or reject out-of-policy expenses" },
      { key: "delete", label: "Delete", description: "Remove draft/erroneous expenses" },
    ],
  },
  {
    name: "QuickBooks Online",
    key: "quickbooks",
    permissions: [
      { key: "connect", label: "OAuth Setup & Mapping", description: "Connect QBO and map Chart of Accounts" },
      { key: "sync", label: "Push / Pull Sync", description: "Sync invoices, expenses, and 1099 payouts" },
      { key: "view_reports", label: "Financial Reports", description: "Access QBO reconciliation & spending reports" },
      { key: "view_errors", label: "Sync Error Resolution", description: "Inspect and retry failed QBO sync logs" },
    ],
  },
  {
    name: "Operations & Routing",
    key: "routing",
    permissions: [
      { key: "view_own", label: "View Own Schedule", description: "See assigned branch routes" },
      { key: "view_all", label: "View All Crews", description: "Monitor nationwide CONUS/AK/HI routes" },
      { key: "optimize", label: "AI & Week Optimization", description: "Run AI multi-stop solver & AK/HI trip bundles" },
    ],
  },
  {
    name: "Deliverables & QA",
    key: "deliverables",
    permissions: [
      { key: "view", label: "View Digital Twins", description: "Access Matterport PME embeds & downloads" },
      { key: "qa_signoff", label: "QA Sign-Off", description: "Approve 3D scan quality before client delivery" },
      { key: "deliver", label: "Deliver to Client", description: "Publish deliverables to agency/client portals" },
      { key: "approve", label: "Client Acceptance", description: "Sign off or request revision on branch scans" },
    ],
  },
  {
    name: "HR, Tax & Payroll",
    key: "hr_tax_payroll",
    permissions: [
      { key: "view", label: "View Compliance & Tax", description: "Access federal/state tax & W-9 dashboard" },
      { key: "generate_w9", label: "Generate W-9 PDFs", description: "Produce IRS Form W-9 & 1099 summaries" },
      { key: "approve_payouts", label: "Batch Contractor Payouts", description: "Approve and sync 1099 payouts to QBO" },
    ],
  },
  {
    name: "Marketing & Metricool",
    key: "marketing",
    permissions: [
      { key: "view", label: "View Campaigns", description: "View social calendar & Metricool analytics" },
      { key: "publish_metricool", label: "Schedule to Metricool", description: "Publish campaigns to connected social channels" },
    ],
  },
  {
    name: "Administration",
    key: "admin",
    permissions: [
      { key: "manage_roles", label: "Manage Roles", description: "Configure RBAC matrix and access levels" },
      { key: "manage_users", label: "Manage Users", description: "Provision agency, client, and crew accounts" },
      { key: "view_all_data", label: "Global Tenant Access", description: "Cross-tenant visibility and audit trails" },
    ],
  },
];

export default function RolePermissionMatrix({ role, editable = false, onToggle }) {
  const perms = role?.permissions || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PERMISSION_CATEGORIES.map((category) => {
        const categoryPerms = perms[category.key] || {};
        const grantedCount = category.permissions.filter((p) => categoryPerms[p.key] === true).length;

        return (
          <div key={category.key} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 bg-[#0A1628] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Shield className="w-4 h-4 text-[#4A9EFF]" />
                {category.name}
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {grantedCount} / {category.permissions.length}
              </span>
            </div>
            <div className="p-3 space-y-1.5">
              {category.permissions.map((perm) => {
                const granted = categoryPerms[perm.key] === true;
                return (
                  <div
                    key={perm.key}
                    onClick={() => editable && onToggle?.(category.key, perm.key, !granted)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      editable ? "cursor-pointer hover:border-[#4A9EFF]/50" : ""
                    } ${
                      granted
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-slate-950/60 border-slate-800/80"
                    }`}
                  >
                    {granted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-200">{perm.label}</div>
                      <div className="text-[11px] text-slate-500">{perm.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
