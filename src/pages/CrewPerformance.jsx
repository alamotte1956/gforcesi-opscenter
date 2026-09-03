import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Gauge, Timer, MapPin, Users, Loader2 } from "lucide-react";

const CYAN = "#22d3ee";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";

// Hours from a job's first active status to its "complete" status.
function completionHours(job) {
  const hist = job.status_history || [];
  if (hist.length >= 2) {
    const complete = hist.find((h) => h.status === "complete");
    const start = hist.find((h) => ["en_route", "on_site", "scanning"].includes(h.status)) || hist[0];
    if (complete?.entered_at && start?.entered_at) {
      const ms = new Date(complete.entered_at) - new Date(start.entered_at);
      return ms > 0 ? ms / 3600000 : null;
    }
  }
  if (job.scheduled_start && job.scheduled_end) {
    const ms = new Date(job.scheduled_end) - new Date(job.scheduled_start);
    return ms > 0 ? ms / 3600000 : null;
  }
  return null;
}

function fmtHours(h) {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function Card({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
        <Icon className="w-4 h-4" style={{ color: accent }} /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function CrewPerformance() {
  const [crew, setCrew] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, j] = await Promise.all([
          base44.entities.Contractor.list(),
          base44.entities.Job.list("-updated_date", 500),
        ]);
        setCrew(c);
        setJobs(j);
      } catch (e) {
        // surface via empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const weeks = useMemo(() => {
    const dates = jobs
      .map((j) => j.scheduled_start || j.updated_date)
      .filter(Boolean)
      .sort();
    if (dates.length < 2) return 1;
    const days = (new Date(dates[dates.length - 1]) - new Date(dates[0])) / 86400000;
    return Math.max(1, days / 7);
  }, [jobs]);

  const metrics = useMemo(() => {
    return crew
      .map((c) => {
        const mine = jobs.filter((j) => (j.assigned_contractor_ids || []).includes(c.id));
        const completed = mine.filter((j) => ["complete", "invoiced"].includes(j.status));
        const times = completed.map(completionHours).filter((t) => t != null && t >= 0);
        const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
        const visits = mine.length;
        return {
          id: c.id,
          name: c.name || "Unknown",
          role: c.role,
          jobCount: mine.length,
          completedCount: completed.length,
          avgHours: avg,
          visits,
          visitsPerWeek: visits / weeks,
        };
      })
      .filter((m) => m.jobCount > 0)
      .sort((a, b) => b.visits - a.visits);
  }, [crew, jobs, weeks]);

  const overall = useMemo(() => {
    const allTimes = metrics.map((m) => m.avgHours).filter((h) => h != null);
    const avgCompletion = allTimes.length ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : null;
    const totalVisits = metrics.reduce((s, m) => s + m.visits, 0);
    const busiest = metrics[0];
    return { avgCompletion, totalVisits, busiest, activeCrew: metrics.length };
  }, [metrics]);

  const completionData = metrics
    .filter((m) => m.avgHours != null)
    .map((m) => ({ name: m.name.split(" ")[0], hours: +m.avgHours.toFixed(2), full: m.name }));
  const visitData = metrics.map((m) => ({ name: m.name.split(" ")[0], visits: m.visits, full: m.name }));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" /> Crew Performance
        </h1>
        <p className="text-sm text-slate-500">
          Average job completion time and site visit frequency per field crew member
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label="Active Crew" value={overall.activeCrew} sub="With assigned jobs" accent={CYAN} />
        <Card icon={Timer} label="Avg Completion" value={fmtHours(overall.avgCompletion)} sub="Across completed jobs" accent={EMERALD} />
        <Card icon={MapPin} label="Total Site Visits" value={overall.totalVisits} sub={`${(overall.totalVisits / weeks).toFixed(1)} / week`} accent={AMBER} />
        <Card icon={Gauge} label="Busiest Crew" value={overall.busiest?.name || "—"} sub={overall.busiest ? `${overall.busiest.visits} visits` : ""} accent={ROSE} />
      </div>

      {metrics.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-sm">
          No job assignments found yet. Assign contractors to jobs to see performance metrics.
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Timer className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-medium text-slate-200">Average Job Completion Time</h2>
              </div>
              {completionData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No completed jobs with duration data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={completionData} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} unit="h" />
                    <Tooltip
                      cursor={{ fill: "#1e293b66" }}
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(_, p) => p?.[0]?.payload?.full || ""}
                      formatter={(v) => [fmtHours(v), "Avg time"]}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {completionData.map((d, i) => (
                        <Cell key={i} fill={d.hours > 8 ? ROSE : d.hours > 4 ? AMBER : EMERALD} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-medium text-slate-200">Site Visit Frequency</h2>
              </div>
              {visitData.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No site visits recorded.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={visitData} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "#1e293b66" }}
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(_, p) => p?.[0]?.payload?.full || ""}
                      formatter={(v) => [`${v} visits`, "Site visits"]}
                    />
                    <Bar dataKey="visits" fill={CYAN} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-medium text-slate-200">Per-Crew Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                    <th className="px-4 py-2.5 font-medium">Crew Member</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium text-right">Jobs Assigned</th>
                    <th className="px-4 py-2.5 font-medium text-right">Completed</th>
                    <th className="px-4 py-2.5 font-medium text-right">Avg Completion</th>
                    <th className="px-4 py-2.5 font-medium text-right">Site Visits</th>
                    <th className="px-4 py-2.5 font-medium text-right">Visits / Week</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-medium text-slate-100">{m.name}</td>
                      <td className="px-4 py-2.5 text-slate-400">{m.role}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{m.jobCount}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{m.completedCount}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={m.avgHours == null ? "text-slate-600" : m.avgHours > 8 ? "text-rose-300" : m.avgHours > 4 ? "text-amber-300" : "text-emerald-300"}>
                          {fmtHours(m.avgHours)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{m.visits}</td>
                      <td className="px-4 py-2.5 text-right text-cyan-300">{m.visitsPerWeek.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}