import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Map, KanbanSquare, FolderKanban, Users, Building2, FileText, Calculator, PieChart, Plane, Target,
  Boxes, BarChart3, Settings, LogOut, Menu, X, ChevronRight, ShieldCheck, Globe, Route as RouteIcon,
  FileSpreadsheet, MessageSquare, UserCog, Receipt, ClipboardList, AlertTriangle, ClipboardCheck,
  ScanLine, Plug, Sparkles, Activity, MapPin, Bell, Calendar, DollarSign, LayoutDashboard,
  FileBarChart, Wrench, Gauge, TrendingUp, Repeat, Wallet, ListChecks, Rocket, Radio, Megaphone,
  Scale, Layers, ShieldAlert, Smartphone, ExternalLink, Cpu, Crown, KeyRound,
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import { filterNavGroups, canAccessRoute, levelForUser, firstAllowedRoute, roleBadgeForUser } from "@/lib/accessLevels";
import GuideDownload from "@/components/GuideDownload";
import { GForceLogo } from "@/components/brand/GForceGraphics";
import SyncStatusIndicator from "@/components/offline/SyncStatusIndicator";
import UniversalSearch from "@/components/UniversalSearch";

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
    label: "Dashboard",
    items: [
      { to: "/executive", label: "Executive Dashboard", icon: LayoutDashboard },
      { to: "/us-map", label: "US Project Map", icon: Globe },
      { to: "/ops", label: "Live Map Ops", icon: Map, end: true },
      { to: "/admin", label: "Ops Admin", icon: Gauge },
      { to: "/quick-start", label: "Quick Start", icon: Rocket },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/crm", label: "CRM & Sales Pipeline", icon: Users },
      { to: "/clients", label: "Agencies & Clients", icon: Building2 },
      { to: "/leads", label: "Enterprise Leads & RFPs", icon: Target },
      { to: "/proposals", label: "Proposals & Quotes", icon: Calculator },
      { to: "/marketing", label: "Social & Metricool", icon: Megaphone },
      { to: "/owner-portal", label: "Simple Property Portal", icon: Building2 },
      { to: "/client-portal", label: "Agency / Client Portal", icon: Globe },
    ],
  },
  {
    label: "Projects & Digital Twins",
    items: [
      { to: "/projects", label: "10-Stage Projects", icon: FolderKanban },
      { to: "/sites", label: "50-State Sites", icon: MapPin },
      { to: "/deliverables", label: "3D Deliverables & QA", icon: ScanLine },
      { to: "/matterport", label: "Matterport Sync", icon: ScanLine },
    ],
  },
  {
    label: "AI Inventory & Assets",
    items: [
      { to: "/ai-inventory", label: "AI Visual Inventory Studio", icon: Cpu },
      { to: "/assets", label: "Digital Twin Assets", icon: Boxes },
      { href: "https://studio.twinscanstudio.com", label: "TwinScan CV Engine", icon: Sparkles, external: true },
      { to: "/equipment", label: "Pro3 / LiDAR Gear", icon: Wrench },
      { to: "/equipment-maintenance", label: "Gear Maintenance", icon: Wrench },
    ],
  },
  {
    label: "Scheduling & Field Ops",
    items: [
      { to: "/jobs", label: "Scan Jobs", icon: KanbanSquare },
      { to: "/routes", label: "AI Route & Trip Planner", icon: RouteIcon },
      { to: "/travel", label: "AK / HI Flight Logistics", icon: Plane },
      { to: "/recurring-schedules", label: "Recurring Scans", icon: Repeat },
      { to: "/contractors", label: "Contractors", icon: Users },
      { to: "/contractor-board", label: "Live Crew Board", icon: Radio },
      { to: "/field", label: "Offline Field PWA", icon: Smartphone },
      { to: "/contractor-portal", label: "Contractor Portal", icon: DollarSign },
      { to: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
      { to: "/issues", label: "Field Issues", icon: AlertTriangle },
      { to: "/inspections", label: "Inspections", icon: ClipboardCheck },
      { to: "/drone-compliance", label: "FAA Drone Compliance", icon: Plane },
      { to: "/messages", label: "Team Messages", icon: MessageSquare },
      { to: "/my-schedule", label: "My Schedule", icon: Calendar },
    ],
  },
  {
    label: "Billing & Payroll",
    items: [
      { to: "/finance", label: "QuickBooks Hub", icon: DollarSign },
      { to: "/invoices", label: "Invoices", icon: FileText },
      { to: "/expenses", label: "Expenses & Mileage", icon: Receipt },
      { to: "/expense-approvals", label: "Expense Approvals", icon: ClipboardCheck },
      { to: "/billing-review", label: "Billing Review", icon: Sparkles },
      { to: "/hr-tax-payroll", label: "HR, Taxes & W-9 PDF", icon: Scale },
      { to: "/payouts", label: "Contractor Payouts", icon: Wallet },
      { to: "/payout-review", label: "Payout Review", icon: ListChecks },
      { href: "https://gforcepay.com/", label: "GForcePay Portal", icon: DollarSign, external: true },
      { to: "/quickbooks-mapping", label: "QBO Account Mapping", icon: Layers },
      { to: "/quickbooks-errors", label: "QBO Sync Errors", icon: ShieldAlert },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/quickbooks-reports", label: "QBO P&L Reports", icon: BarChart3 },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/profitability", label: "Branch Profitability", icon: PieChart },
      { to: "/project-status", label: "Project Status", icon: Activity },
      { to: "/crew-performance", label: "Crew Performance", icon: Gauge },
      { to: "/performance-report", label: "Performance Report", icon: TrendingUp },
      { to: "/assignment-reports", label: "Assignment Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/saas-admin", label: "SaaS Super Admin", icon: Crown },
      { to: "/users", label: "Users & RBAC", icon: UserCog },
      { to: "/compliance", label: "COI / NDA Compliance", icon: ShieldCheck },
      { to: "/import", label: "CSV Data Import", icon: FileSpreadsheet },
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/quickbooks-setup", label: "QBO OAuth Setup", icon: Settings },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "System Settings", icon: Settings },
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

        if (level === "field") {
          if (onOnboarding) return;
          const cons = await base44.entities.Contractor.list().catch(() => []);
          const c = cons.find((co) => normalizeEmail(co.email) === normalizeEmail(u.email));
          if (needsOnboarding(c)) { navigate("/contractors/onboarding", { replace: true }); return; }
          if (!["/contractor-portal", "/field", "/my-schedule", "/notifications"].includes(location.pathname)) {
            navigate("/contractor-portal", { replace: true });
          }
          return;
        }
        if (level === "client" || level === "agency_client") {
          navigate("/client-portal", { replace: true });
          return;
        }
        if (!level && u.role !== "admin" && u.email) {
          if (onOnboarding) return;
          const norm = normalizeEmail(u.email);
          const [clients, cons] = await Promise.all([
            base44.entities.Client.list().catch(() => []),
            base44.entities.Contractor.list().catch(() => []),
          ]);
          const linked = clients.find((cl) => normalizeEmail(cl.portal_email) === norm);
          if (linked && linked.portal_access_level !== "none") {
            navigate("/client-portal", { replace: true });
            return;
          }
          const c = cons.find((co) => normalizeEmail(co.email) === norm);
          if (needsOnboarding(c)) { navigate("/contractors/onboarding", { replace: true }); return; }
          if (c && ["Field Technician", "Field Pilot"].includes(c.role)) {
            navigate("/contractor-portal", { replace: true });
            return;
          }
        }
        if (level && level !== "full" && !canAccessRoute(u, location.pathname)) {
          const first = firstAllowedRoute(u);
          if (first) navigate(first, { replace: true });
        }
      } catch {}
    })();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate("/");
  };

  const roleBadge = roleBadgeForUser(me);

  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 w-64 shrink-0 h-screen lg:h-auto bg-[#0D1C33] border-r border-[#1E3A5F]/80 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-[#1E3A5F]/80">
          <Link to="/" className="min-w-0">
            <GForceLogo size={34} subtitle="Ops Command" />
          </Link>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {me && (
          <div className="px-4 py-2.5 border-b border-[#1E3A5F]/60 flex items-center justify-between gap-2 bg-[#0A1628]/50">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{me.full_name || me.email}</div>
              <div className="text-[10px] text-[#FF8A3D] font-semibold uppercase tracking-wider">{roleBadge}</div>
            </div>
            <SyncStatusIndicator compact />
          </div>
        )}

        <div className="px-3 pt-3">
          <UniversalSearch />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {filterNavGroups(navGroups, me).map((group) => (
            <div key={group.label} className="mb-4 last:mb-0">
              <div className="px-3 mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A9EFF]/85">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-[#1E3A5F]/60 ml-1" />
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (item.external && item.href) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-slate-300 hover:text-white hover:bg-[#F97316]/15 border border-transparent hover:border-[#F97316]/40 transition-all group"
                      >
                        <Icon className="w-[16px] h-[16px] shrink-0 text-[#FF8A3D]" />
                        <span className="font-medium truncate">{item.label}</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto text-[#FF8A3D]/80 shrink-0" />
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all group ${
                          isActive
                            ? "bg-gradient-to-r from-[#126DFA]/25 to-[#F97316]/15 text-white border border-[#F97316]/40 shadow-sm"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                        }`
                      }
                    >
                      <Icon className="w-[16px] h-[16px] shrink-0 text-[#4A9EFF] group-hover:text-[#FF8A3D] transition-colors" />
                      <span className="font-medium truncate">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[#1E3A5F]/80 space-y-1">
          <div className="flex items-center gap-3 px-3 pb-1 text-[11px] text-slate-400">
            <NavLink to="/legal" className="hover:text-[#FF8A3D]">HIPAA &amp; Legal</NavLink>
            <NavLink to="/privacy" className="hover:text-[#4A9EFF]">Privacy</NavLink>
            <NavLink to="/terms" className="hover:text-[#4A9EFF]">Terms</NavLink>
          </div>
          <GuideDownload label="User Guide" className="w-full px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-[#4A9EFF] hover:bg-slate-800/60 transition-colors font-medium" />
          <NavLink
            to="/forgot-password"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-[#FF8A3D] hover:bg-slate-800/60 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span className="font-medium">Reset Password</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:hidden flex items-center justify-between gap-3 px-4 border-b border-[#1E3A5F] bg-[#0D1C33] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="text-slate-300" onClick={() => setOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <GForceLogo size={28} subtitle="" />
          </div>
          <SyncStatusIndicator compact />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <AiAdvisor />
    </div>
  );
}
