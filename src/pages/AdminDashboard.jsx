import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ShieldCheck, Users, UserCog, Briefcase, FileText, Receipt, AlertTriangle,
  Boxes, CheckCircle2, Clock, TrendingUp, Plug, ChevronRight, ScanLine, Rocket,
} from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, contractors, jobs, invoices, expenses, equipment, issues, syncLogs] = await Promise.all([
          base44.entities.User.list().catch(() => []),
          base44.entities.Contractor.list(),
          base44.entities.Job.list(),
          base44.entities.Invoice.list(),
          base44.entities.Expense.list(),
          base44.entities.Equipment.list(),
          base44.entities.Issue.list(),
          base44.entities.SyncLog.list().catch(() => []),
        ]);
        setData({ users, contractors, jobs, invoices, expenses, equipment, issues, syncLogs });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const onboarded = data.contractors.filter((c) => c.onboarding_status === "complete").length;
    const pendingOnboarding = data.contractors.filter((c) => c.onboarding_status !== "complete").length;
    const activeJobs = data.jobs.filter((j) => ["en_route", "on_site", "scanning", "processing"].includes(j.status)).length;
    const scheduledJobs = data.jobs.filter((j) => j.status === "scheduled").length;
    const overdueInvoices = data.invoices.filter((i) => i.status === "overdue").length;
    const pendingExpenses = data.expenses.filter((e) => e.status === "pending").length;
    const openIssues = data.issues.filter((i) => ["open", "in_progress"].includes(i.status)).length;
    const maintDue = data.equipment.filter((e) => {
      const today = new Date();
      return (e.maintenance_due_date && new Date(e.maintenance_due_date) <= today) || (e.calibration_due_date && new Date(e.calibration_due_date) <= today);
    }).length;
    const syncErrors = data.syncLogs.filter((s) => s.status === "error").length;
    return { onboarded, pendingOnboarding, activeJobs, scheduledJobs, overdueInvoices, pendingExpenses, openIssues, maintDue, syncErrors };
  }, [data]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
  if (!data) return <div className="p-6 text-slate-400">Unable to load admin data.</div>;

  const quickLinks = [
    { to: "/users", label: "User Management", icon: UserCog, desc: `${data.users.length} users` },
    { to: "/contractors", label: "Contractors", icon: Users, desc: `${data.contractors.length} contractors` },
    { to: "/compliance", label: "Compliance", icon: ShieldCheck, desc: `${stats.onboarded} fully onboarded` },
    { to: "/integrations", label: "Integrations", icon: Plug, desc: stats.syncErrors ? `${stats.syncErrors} sync errors` : "All synced" },
    { to: "/settings", label: "QB Settings", icon: FileText, desc: "QuickBooks config" },
    { to: "/quick-start", label: "Quick Start Guide", icon: Rocket, desc: "Onboarding workflows" },
    { to: "/import", label: "Data Import", icon: ScanLine, desc: "Bulk import data" },
  ];

  const alerts = [
    stats.pendingOnboarding > 0 && { icon: Users, label: "Contractors pending onboarding", value: stats.pendingOnboarding, to: "/contractors", accent: "text-amber-400" },
    stats.overdueInvoices > 0 && { icon: FileText, label: "Overdue invoices", value: stats.overdueInvoices, to: "/invoices", accent: "text-rose-400" },
    stats.pendingExpenses > 0 && { icon: Receipt, label: "Expenses pending approval", value: stats.pendingExpenses, to: "/expenses", accent: "text-amber-400" },
    stats.openIssues > 0 && { icon: AlertTriangle, label: "Open issues", value: stats.openIssues, to: "/issues", accent: "text-rose-400" },
    stats.maintDue > 0 && { icon: Boxes, label: "Equipment maintenance overdue", value: stats.maintDue, to: "/equipment", accent: "text-rose-400" },
    stats.syncErrors > 0 && { icon: Plug, label: "QuickBooks sync errors", value: stats.syncErrors, to: "/integrations", accent: "text-rose-400" },
  ].filter(Boolean);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">System overview & quick actions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 mb-6">
        <StatCard icon={Users} label="Total Users" value={data.users.length} accent="text-cyan-400" />
        <StatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} accent="text-amber-400" />
        <StatCard icon={Clock} label="Scheduled" value={stats.scheduledJobs} accent="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Onboarded" value={`${stats.onboarded}/${data.contractors.length}`} accent="text-emerald-400" />
      </div>

      {alerts.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {alerts.map((a, i) => (
              <Link key={i} to={a.to} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex items-center gap-3 group">
                <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center ${a.accent}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold">{a.value}</div>
                  <div className="text-xs text-slate-500">{a.label}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map((q) => (
          <Link key={q.to} to={q.to} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <q.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-200">{q.label}</div>
              <div className="text-xs text-slate-500">{q.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mb-3 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}