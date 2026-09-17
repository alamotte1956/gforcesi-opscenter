import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Map, KanbanSquare, FolderKanban, Users, Building2, FileText,
  Boxes, BarChart3,   Settings, LogOut, Satellite, Menu, X, ChevronRight, ShieldCheck, Globe, Route as RouteIcon, FileSpreadsheet, MessageSquare, UserCog, Receipt, ClipboardList, AlertTriangle, ClipboardCheck, ScanLine, Plug, Sparkles, Activity, MapPin, Bell, Calendar, DollarSign, LayoutDashboard, FileBarChart, Wrench, Gauge, TrendingUp, Repeat, Wallet, ListChecks, Rocket, Radio
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import { filterNavGroups, canAccessRoute, levelForUser, firstAllowedRoute } from "@/lib/accessLevels";
import GuideDownload from "@/components/GuideDownload";

// Gmail/Googlemail ignore dots in the local part; normalize so a user who
// registered with one variant still matches a contractor/client record stored
// under another (e.g. gretchen.codling@gmail.com vs gretchencodling@gmail.com).
function normalizeEmail(email) {
  const e = (email || "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "")}@${domain}`;
  }
  return e;
}

const navGroups = [
  {
    label: "Command Center",
    items: [
      { to: "/", label: "Live Map", icon: Map, end: true },
      { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
      { to: "/quick-start", label: "Quick Start", icon: Rocket },
    ],
  },
  {
    label: "Setup & Resources",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/sites", label: "Sites", icon: MapPin },
      { to: "/contractors", label: "Contractors", icon: Users },
      { to: "/contractor-board", label: "Status Board", icon: Radio },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/jobs", label: "Jobs", icon: KanbanSquare },
      { to: "/routes", label: "Route Planning", icon: RouteIcon },
      { to: "/recurring-schedules", label: "Recurring Scans", icon: Repeat },
      { to: "/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Field Reporting",
    items: [
      { to: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
      { to: "/issues", label: "Issues", icon: AlertTriangle },
      { to: "/inspections", label: "Inspections", icon: ClipboardCheck },
      { to: "/equipment", label: "Equipment", icon: Boxes },
      { to: "/equipment-maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    label: "Financials",
    items: [
      { to: "/expenses", label: "Expenses", icon: Receipt },
      { to: "/expense-approvals", label: "Expense Approvals", icon: ClipboardCheck },
      { to: "/payouts", label: "Contractor Payouts", icon: Wallet },
      { to: "/payout-review", label: "Payout Review", icon: ListChecks },
      { to: "/invoices", label: "Invoices", icon: FileText },
      { to: "/billing-review", label: "Billing Review", icon: Sparkles },
    ],
  },
  {
    label: "Insights & Reports",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/project-status", label: "Project Status", icon: Activity },
      { to: "/crew-performance", label: "Crew Performance", icon: Gauge },
      { to: "/performance-report", label: "Performance Report", icon: TrendingUp },
      { to: "/assignment-reports", label: "Assignment Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/compliance", label: "Compliance", icon: ShieldCheck },
      { to: "/users", label: "User Management", icon: UserCog },
      { to: "/settings", label: "QB Settings", icon: Settings },
    ],
  },
  {
    label: "Data & Integrations",
    items: [
      { to: "/import", label: "Data Import", icon: FileSpreadsheet },
      { to: "/matterport", label: "Matterport", icon: ScanLine },
      { to: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "External & Personal",
    items: [
      { to: "/portal", label: "Client Portal", icon: Globe },
      { to: "/contractor-portal", label: "Contractor Portal", icon: DollarSign },
      { to: "/my-schedule", label: "My Schedule", icon: Calendar },
      { to: "/notifications", label: "Notification Settings", icon: Bell },
    ],
  },
  ];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setMe(u);
        if (!u) return;
        const level = levelForUser(u);
        const onOnboarding = location.pathname === "/contractors/onboarding";
        const needsOnboarding = (c) => c && ["pending", "in_progress"].includes(c.onboarding_status);
        // Explicit access level takes precedence.
        if (level === "field") {
          if (onOnboarding) return;
          const cons = await base44.entities.Contractor.list();
          const c = cons.find((co) => normalizeEmail(co.email) === normalizeEmail(u.email));
          if (needsOnboarding(c)) { navigate("/contractors/onboarding", { replace: true }); return; }
          navigate("/contractor-portal", { replace: true });
          return;
        }
        if (level === "client") { navigate("/portal", { replace: true }); return; }
        // Legacy: no access level assigned yet — detect via linked records.
        // Use gmail-dot-insensitive matching so the redirect works on the very
        // first login, before the Assign Access on Auth workflow has run.
        if (!level && u.role !== "admin" && u.email) {
          if (onOnboarding) return;
          const norm = normalizeEmail(u.email);
          const [clients, cons] = await Promise.all([
            base44.entities.Client.list(),
            base44.entities.Contractor.list(),
          ]);
          const linked = clients.find((cl) => normalizeEmail(cl.portal_email) === norm);
          if (linked && linked.portal_access_level !== "none") {
            navigate("/portal", { replace: true });
            return;
          }
          const c = cons.find((co) => normalizeEmail(co.email) === norm);
          if (needsOnboarding(c)) { navigate("/contractors/onboarding", { replace: true }); return; }
          if (c && ["Field Technician", "Field Pilot"].includes(c.role)) {
            navigate("/contractor-portal", { replace: true });
            return;
          }
        }
        // Guard: block routes outside the user's access level.
        if (level && level !== "full" && !canAccessRoute(u, location.pathname)) {
          const first = firstAllowedRoute(u);
          if (first) navigate(first, { replace: true });
        }
      } catch {}
    })();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 w-64 shrink-0 h-screen lg:h-auto bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Satellite className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-[15px]">GForceSI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">Ops Control</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {filterNavGroups(navGroups, me).map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <div className="px-3 mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label.split(" & ")[0]}</span>
                {group.label.includes(" & ") && (
                  <span className="text-[11px] font-normal text-slate-600 truncate">& {group.label.split(" & ").slice(1).join(" & ")}</span>
                )}
                <div className="flex-1 h-px bg-slate-800/80 ml-1" />
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                          isActive
                            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                        }`
                      }
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-3 px-3 pb-1 text-[11px] text-slate-500">
            <NavLink to="/privacy" className="hover:text-cyan-300">Privacy</NavLink>
            <NavLink to="/terms" className="hover:text-cyan-300">Terms</NavLink>
          </div>
          <GuideDownload label="User Guide" className="w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors font-medium" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:hidden flex items-center gap-3 px-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
          <button className="text-slate-300" onClick={() => setOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold">GForceSI Ops</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <AiAdvisor />
    </div>
  );
}