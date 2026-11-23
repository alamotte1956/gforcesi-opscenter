import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Target, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const STAGES = ["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"];
const fmtHrs = (h) => {
  if (!h || h < 1) return `${Math.round((h || 0) * 60)}m`;
  return `${h.toFixed(1)}h`;
};

export default function AssignmentReports() {
  const [jobs, setJobs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list(),
      base44.entities.Contractor.list(),
    ]).then(([j, c]) => { setJobs(j); setContractors(c); setLoading(false); });
  }, []);

  const kpis = useMemo(() => {
    const completed = jobs.filter((j) => ["complete", "invoiced"].includes(j.status));
    const slaJobs = completed.filter((j) => j.sla_due_date);
    const slaOnTime = slaJobs.filter((j) => {
      const done = (j.status_history || []).find((h) => h.status === "complete")?.entered_at || j.updated_date;
      return done && new Date(done) <= new Date(j.sla_due_date);
    });
    const slaPct = slaJobs.length ? Math.round((slaOnTime.length / slaJobs.length) * 100) : null;
    const cycleTimes = completed.map((j) => {
      const h = j.status_history || [];
      if (h.length < 2) return null;
      const first = h[0].entered_at, last = h[h.length - 1].entered_at;
      return (new Date(last) - new Date(first)) / 3600000;
    }).filter((v) => v != null && v >= 0);
    const avgCycle = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : null;
    return { total: jobs.length, completed: completed.length, slaPct, avgCycle, completionRate: jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0 };
  }, [jobs]);

  const byContractor = useMemo(() => {
    const map = {};
    contractors.forEach((c) => { map[c.id] = { name: c.name, total: 0, completed: 0, active: 0 }; });
    jobs.forEach((j) => {
      (j.assigned_contractor_ids || []).forEach((id) => {
        if (!map[id]) map[id] = { name: (j.assigned_contractor_names || [])[j.assigned_contractor_ids.indexOf(id)] || "Unknown", total: 0, completed: 0, active: 0 };
        map[id].total++;
        if (["complete", "invoiced"].includes(j.status)) map[id].completed++;
        if (["en_route", "on_site", "scanning", "processing"].includes(j.status)) map[id].active++;
      });
    });
    return Object.values(map).filter((m) => m.total > 0).sort((a, b) => b.total - a.total);
  }, [jobs, contractors]);

  const byStatus = useMemo(() => {
    const counts = {};
    jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [jobs]);

  const byPriority = useMemo(() => {
    const counts = {};
    jobs.forEach((j) => { counts[j.priority] = (counts[j.priority] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const barColors = ["#64748b", "#3b82f6", "#f59e0b", "#a855f7", "#6366f1", "#22c55e", "#06b6d4"];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold mb-1">Assignment Reports</h1>
      <p className="text-sm text-slate-500 mb-5">Job assignment performance & contractor metrics</p>

      <div className="flex gap-1.5 mb-6">
        {[
          { key: "overview", label: "Overview" },
          { key: "contractors", label: "By Contractor" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t.key ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard icon={Target} label="Total Assignments" value={kpis.total} accent="text-cyan-400" />
            <KpiCard icon={CheckCircle2} label="Completion Rate" value={`${kpis.completionRate}%`} accent="text-emerald-400" />
            <KpiCard icon={TrendingUp} label="SLA On-Time" value={kpis.slaPct != null ? `${kpis.slaPct}%` : "—"} accent="text-blue-400" />
            <KpiCard icon={Clock} label="Avg Cycle Time" value={kpis.avgCycle != null ? fmtHrs(kpis.avgCycle) : "—"} accent="text-amber-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-medium text-slate-300 mb-4">Jobs by Status</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {byStatus.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-medium text-slate-300 mb-4">Jobs by Priority</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {byPriority.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Contractor</th>
                <th className="px-4 py-3 font-medium text-right">Total Jobs</th>
                <th className="px-4 py-3 font-medium text-right">Active</th>
                <th className="px-4 py-3 font-medium text-right">Completed</th>
                <th className="px-4 py-3 font-medium text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {byContractor.map((c) => (
                <tr key={c.name} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-200">{c.name}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{c.total}</td>
                  <td className="px-4 py-3 text-right text-amber-400">{c.active}</td>
                  <td className="px-4 py-3 text-right text-emerald-400">{c.completed}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{c.total ? `${Math.round((c.completed / c.total) * 100)}%` : "—"}</td>
                </tr>
              ))}
              {byContractor.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No assignment data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }) {
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