import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp, DollarSign, Clock, Target, Gauge, AlertTriangle, ShieldCheck } from "lucide-react";

const STAGES = ["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"];
const stageLabels = {
  scheduled: "Scheduled", en_route: "En Route", on_site: "On Site",
  scanning: "Scanning", processing: "Processing", complete: "Complete", invoiced: "Invoiced",
};
const fmtHrs = (h) => {
  if (!h || h < 1) return `${Math.round((h || 0) * 60)}m`;
  return `${h.toFixed(1)}h`;
};

export default function Analytics() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    Promise.all([
      base44.entities.Job.list(),
      base44.entities.Invoice.list(),
      base44.entities.Contractor.list(),
    ]).then(([j, i, e]) => {
      setJobs(j); setInvoices(i); setEmployees(e);
      setLoading(false);
    });
  }, []);

  const kpis = useMemo(() => {
    const completed = jobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
    const invoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
    const onDuty = employees.filter((e) => e.shift_status === "on_duty").length;
    const slaJobs = jobs.filter((j) => j.sla_due_date && ["complete", "invoiced"].includes(j.status));
    const slaOnTime = slaJobs.filter((j) => {
      const done = (j.status_history || []).find((h) => h.status === "complete")?.entered_at || j.updated_date;
      return done && new Date(done) <= new Date(j.sla_due_date);
    }).length;
    const slaOnTimePct = slaJobs.length ? Math.round((slaOnTime / slaJobs.length) * 100) : null;
    return { completed, invoiced, collected, onDuty, slaOnTimePct };
  }, [jobs, invoices, employees]);

  const jobsByStatus = useMemo(() => {
    const counts = {};
    jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [jobs]);

  // Average time spent in each workflow stage, derived from recorded transitions.
  const stageData = useMemo(() => {
    const buckets = {};
    STAGES.forEach((s) => (buckets[s] = []));
    jobs.forEach((j) => {
      const h = Array.isArray(j.status_history)
        ? [...j.status_history].sort((a, b) => new Date(a.entered_at) - new Date(b.entered_at))
        : [];
      for (let i = 0; i < h.length - 1; i++) {
        const cur = h[i], next = h[i + 1];
        const durHrs = (new Date(next.entered_at) - new Date(cur.entered_at)) / 3600000;
        if (durHrs >= 0 && buckets[cur.status]) buckets[cur.status].push(durHrs);
      }
    });
    return STAGES.map((s) => {
      const arr = buckets[s];
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return {
        stage: s, label: stageLabels[s], avg, count: arr.length,
        max: arr.length ? Math.max(...arr) : 0,
        min: arr.length ? Math.min(...arr) : 0,
      };
    });
  }, [jobs]);

  const hasStageData = stageData.some((d) => d.count > 0);
  const bottleneck = stageData.filter((d) => d.count > 0).sort((a, b) => b.avg - a.avg)[0];
  const maxAvg = Math.max(...stageData.map((d) => d.avg), 1);
  const barColors = ["#64748b", "#3b82f6", "#f59e0b", "#a855f7", "#6366f1", "#22c55e", "#06b6d4"];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold mb-1">Analytics</h1>
      <p className="text-sm text-slate-500 mb-5">Operations & financial KPIs</p>

      <div className="flex gap-1.5 mb-6">
        {[
          { key: "overview", label: "Overview" },
          { key: "stages", label: "Stage Duration" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t.key ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <KpiCard icon={Target} label="Jobs Completed" value={kpis.completed} accent="text-cyan-400" />
            <KpiCard icon={DollarSign} label="Invoiced" value={`$${kpis.invoiced.toLocaleString()}`} accent="text-blue-400" />
            <KpiCard icon={TrendingUp} label="Collected" value={`$${kpis.collected.toLocaleString()}`} accent="text-emerald-400" />
            <KpiCard icon={Clock} label="On Duty Now" value={kpis.onDuty} accent="text-amber-400" />
            <KpiCard icon={ShieldCheck} label="SLA On-Time" value={kpis.slaOnTimePct != null ? `${kpis.slaOnTimePct}%` : "—"} accent="text-cyan-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-slate-300 mb-4">Jobs by Status</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={jobsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {jobsByStatus.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            <KpiCard icon={Gauge} label="Stages Tracked" value={stageData.filter((d) => d.count > 0).length} accent="text-cyan-400" />
            <KpiCard icon={Clock} label="Avg Total Cycle Time" value={fmtHrs(stageData.reduce((s, d) => s + d.avg, 0))} accent="text-blue-400" />
            <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center mb-3 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">{bottleneck ? `${bottleneck.label} · ${fmtHrs(bottleneck.avg)}` : "—"}</div>
              <div className="text-xs text-slate-500 mt-1">Biggest bottleneck</div>
            </div>
          </div>

          {!hasStageData ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
              <Gauge className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <div className="text-sm text-slate-400">No stage transition data yet.</div>
              <div className="text-xs text-slate-500 mt-1">Durations populate automatically as jobs move through the workflow.</div>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
                <h2 className="text-sm font-medium text-slate-300 mb-4">Average Time per Stage</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtHrs} />
                    <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={90} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} formatter={(v) => fmtHrs(v)} />
                    <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                      {stageData.map((d) => <Cell key={d.stage} fill={bottleneck && d.stage === bottleneck.stage ? "#f43f5e" : "#06b6d4"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-500 mt-2">Red bar marks the slowest stage (bottleneck). Averages use only completed transitions.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                      <th className="px-4 py-3 font-medium">Stage</th>
                      <th className="px-4 py-3 font-medium text-right">Avg Time</th>
                      <th className="px-4 py-3 font-medium text-right">Min</th>
                      <th className="px-4 py-3 font-medium text-right">Max</th>
                      <th className="px-4 py-3 font-medium text-right">Transitions</th>
                      <th className="px-4 py-3 font-medium text-right">% of Cycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageData.map((d) => {
                      const cycle = stageData.reduce((s, x) => s + x.avg, 0) || 1;
                      const isBn = bottleneck && d.stage === bottleneck.stage;
                      return (
                        <tr key={d.stage} className={`border-b border-slate-800/60 hover:bg-slate-800/40 ${isBn ? "bg-rose-500/5" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isBn && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                              <span className="font-medium text-slate-200">{d.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">{d.count ? fmtHrs(d.avg) : "—"}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{d.count ? fmtHrs(d.min) : "—"}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{d.count ? fmtHrs(d.max) : "—"}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{d.count}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{d.count ? `${Math.round((d.avg / cycle) * 100)}%` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
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