import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Map, KanbanSquare, FolderKanban, Users, Building2, FileText,
  Boxes, BarChart3,   Settings, LogOut, Satellite, Menu, X, ChevronRight, ShieldCheck, Globe, Route as RouteIcon, FileSpreadsheet, MessageSquare, UserCog, Receipt, ClipboardList, AlertTriangle, ClipboardCheck, ScanLine, Plug, Sparkles, Activity, MapPin, Bell, Calendar, DollarSign, LayoutDashboard, FileBarChart, Wrench
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import { filterNavGroups, canAccessRoute, levelForUser, firstAllowedRoute } from "@/lib/accessLevels";
import GuideDownload from "@/components/GuideDownload";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Live Map", icon: Map, end: true },
    ],
  },
  {
    label: "Setup & Resources",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/sites", label: "Sites", icon: MapPin },
      { to: "/contractors", label: "Contractors", icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/jobs", label: "Jobs", icon: KanbanSquare },
      { to: "/routes", label: "Route Planning", icon: RouteIcon },
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
      { to: "/invoices", label: "Invoices", icon: FileText },
      { to: "/billing-review", label: "Billing Review", icon: Sparkles },
      { to: "/project-status", label: "Project Status", icon: Activity },
    ],
  },
  {
    label: "Insights & Admin",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/assignment-reports", label: "Assignment Reports", icon: FileBarChart },
      { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
      { to: "/compliance", label: "Compliance", icon: ShieldCheck },
      { to: "/users", label: "User Management", icon: UserCog },
    ],
  },
  {
    label: "Data & Integrations",
    items: [
      { to: "/import", label: "Data Import", icon: FileSpreadsheet },
      { to: "/matterport", label: "Matterport", icon: ScanLine },
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/settings", label: "QB Settings", icon: Settings },
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
        // Explicit access level takes precedence.
        if (level === "field") { navigate("/field", { replace: true }); return; }
        if (level === "client") { navigate("/portal", { replace: true }); return; }
        // Legacy: no access level assigned yet — detect via linked records.
        if (!level && u.role !== "admin" && u.email) {
          const linked = await base44.entities.Client.filter({ portal_email: u.email });
          if (linked.length && linked[0].portal_access_level !== "none") {
            navigate("/portal", { replace: true });
            return;
          }
          const cons = await base44.entities.Contractor.filter({ email: u.email });
          if (cons.length && ["Field Technician", "Field Pilot"].includes(cons[0].role)) {
            navigate("/field", { replace: true });
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
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{group.label}</div>
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