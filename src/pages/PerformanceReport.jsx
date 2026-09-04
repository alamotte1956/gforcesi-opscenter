import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const statusStyles = {
  over: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  under: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  on: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  noreports: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const jobStatusStyles = {
  scheduled: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  en_route: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  on_site: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  scanning: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  processing: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  invoiced: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

function varianceStatus(actual, estimated) {
  if (actual === 0) return "noreports";
  if (estimated <= 0) return actual > 0 ? "over" : "on";
  const pct = (actual / estimated - 1) * 100;
  if (pct > 5) return "over";
  if (pct < -5) return "under";
  return "on";
}

export default function PerformanceReport() {
  const [jobs, setJobs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("variance_pct"); // variance_pct, estimated, actual, title
  const [filter, setFilter] = useState("all"); // all, over, under, on, noreports

  useEffect(() => {
    (async () => {
      try {
        const [j, r] = await Promise.all([
          base44.entities.Job.list(),
          base44.entities.DailyReport.list(),
        ]);
        setJobs(j);
        setReports(r);
      } catch (e) {
        console.error("load error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aggregate actual hours per job from daily reports
  const actualByJob = useMemo(() => {
    const map = {};
    for (const r of reports) {
      if (!r.job_id) continue;
      map[r.job_id] = (map[r.job_id] || 0) + (r.hours_worked || 0);
    }
    return map;
  }, [reports]);

  // Build comparison rows
  const rows = useMemo(() => {
    return jobs.map((j) => {
      const estimated = j.estimated_duration_hours || 0;
      const actual = actualByJob[j.id] || 0;
      const variance = actual - estimated;
      const variancePct = estimated > 0 ? (actual / estimated - 1) * 100 : (actual > 0 ? 100 : 0);
      const vStatus = varianceStatus(actual, estimated);
      return {
        id: j.id,
        title: j.title,
        project_name: j.project_name || "—",
        client_name: j.client_name || "—",
        job_status: j.status,
        estimated,
        actual,
        variance,
        variance_pct: variancePct,
        vStatus,
      };
    });
  }, [jobs, actualByJob]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== "all") list = list.filter((r) => r.vStatus === filter);
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "estimated": return b.estimated - a.estimated;
        case "actual": return b.actual - a.actual;
        case "title": return (a.title || "").localeCompare(b.title || "");
        case "variance_pct":
        default:
          return b.variance_pct - a.variance_pct;
      }
    });
    return sorted;
  }, [rows, sortBy, filter]);

  // Summary metrics
  const summary = useMemo(() => {
    const withReports = rows.filter((r) => r.vStatus !== "noreports");
    const totalEstimated = withReports.reduce((s, r) => s + r.estimated, 0);
    const totalActual = withReports.reduce((s, r) => s + r.actual, 0);
    const overCount = rows.filter((r) => r.vStatus === "over").length;
    const underCount = rows.filter((r) => r.vStatus === "under").length;
    const onCount = rows.filter((r) => r.vStatus === "on").length;
    const noReports = rows.filter((r) => r.vStatus === "noreports").length;
    const totalVariance = totalActual - totalEstimated;
    return { totalEstimated, totalActual, totalVariance, overCount, underCount, onCount, noReports, jobCount: rows.length };
  }, [rows]);

  // Chart data: top 10 by absolute variance among jobs with reports
  const chartData = useMemo(() => {
    return rows
      .filter((r) => r.vStatus !== "noreports")
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10)
      .map((r) => ({
        name: (r.title || "").length > 18 ? (r.title || "").slice(0, 16) + "…" : (r.title || ""),
        full: r.title,
        estimated: r.estimated,
        actual: r.actual,
        variance: r.variance,
      }));
  }, [rows]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" /> Performance Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Estimated job duration vs actual hours logged by field teams. Identifies projects running over budget.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-1">
            <Clock className="w-3.5 h-3.5" /> Total Estimated
          </div>
          <div className="text-2xl font-semibold text-slate-100">{summary.totalEstimated.toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-0.5">across {summary.jobCount - summary.noReports} tracked jobs</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-1">
            <Clock className="w-3.5 h-3.5" /> Total Actual
          </div>
          <div className="text-2xl font-semibold text-slate-100">{summary.totalActual.toFixed(1)}h</div>
          <div className="text-xs text-slate-500 mt-0.5">logged via daily reports</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-1">
            {summary.totalVariance > 0 ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
            Total Variance
          </div>
          <div className={`text-2xl font-semibold ${summary.totalVariance > 0 ? "text-rose-300" : summary.totalVariance < 0 ? "text-emerald-300" : "text-slate-100"}`}>
            {summary.totalVariance > 0 ? "+" : ""}{summary.totalVariance.toFixed(1)}h
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {summary.totalEstimated > 0 ? ((summary.totalVariance / summary.totalEstimated) * 100).toFixed(0) : 0}% vs estimate
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Over Budget
          </div>
          <div className="text-2xl font-semibold text-rose-300">{summary.overCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {summary.underCount} under · {summary.onCount} on target · {summary.noReports} no reports
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Top Variance — Estimated vs Actual (hours)</h2>
          <p className="text-xs text-slate-500 mb-4">The 10 jobs with the largest gap between estimated and actual hours.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={60} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(value, name) => [`${value.toFixed(1)}h`, name === "estimated" ? "Estimated" : "Actual"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.full || _}
              />
              <Bar dataKey="estimated" fill="#475569" name="estimated" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="actual" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.variance > 0 ? "#fb7185" : d.variance < 0 ? "#34d399" : "#22d3ee"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-600" /> Estimated</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400" /> Actual (over)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" /> Actual (under)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-400" /> Actual (on target)</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {[
            { k: "all", label: "All" },
            { k: "over", label: `Over (${summary.overCount})` },
            { k: "under", label: `Under (${summary.underCount})` },
            { k: "on", label: `On Target (${summary.onCount})` },
            { k: "noreports", label: `No Reports (${summary.noReports})` },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.k ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-slate-500">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="variance_pct">% Over estimate</option>
            <option value="estimated">Estimated hours</option>
            <option value="actual">Actual hours</option>
            <option value="title">Job title</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Job Status</th>
              <th className="px-4 py-3 font-medium text-right">Est. Hours</th>
              <th className="px-4 py-3 font-medium text-right">Actual Hours</th>
              <th className="px-4 py-3 font-medium text-right">Variance</th>
              <th className="px-4 py-3 font-medium text-right">% vs Est.</th>
              <th className="px-4 py-3 font-medium">Budget Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500 text-sm">No jobs match this filter.</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <Link to={`/jobs/${r.id}`} className="font-medium text-slate-200 hover:text-cyan-300">{r.title || "Untitled"}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{r.project_name}</td>
                  <td className="px-4 py-3 text-slate-400">{r.client_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${jobStatusStyles[r.job_status] || jobStatusStyles.scheduled}`}>
                      {r.job_status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono">{r.estimated > 0 ? r.estimated.toFixed(1) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono">{r.actual > 0 ? r.actual.toFixed(1) : "—"}</td>
                  <td className={`px-4 py-3 text-right font-mono ${r.variance > 0 ? "text-rose-300" : r.variance < 0 ? "text-emerald-300" : "text-slate-400"}`}>
                    {r.variance > 0 ? "+" : ""}{r.variance.toFixed(1)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${r.variance_pct > 5 ? "text-rose-300" : r.variance_pct < -5 ? "text-emerald-300" : "text-slate-400"}`}>
                    {r.estimated > 0 ? `${r.variance_pct > 0 ? "+" : ""}${r.variance_pct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${statusStyles[r.vStatus]}`}>
                      {r.vStatus === "over" && <AlertTriangle className="w-3 h-3" />}
                      {r.vStatus === "under" && <TrendingDown className="w-3 h-3" />}
                      {r.vStatus === "on" && <CheckCircle2 className="w-3 h-3" />}
                      {r.vStatus === "noreports" && <Clock className="w-3 h-3" />}
                      {r.vStatus === "over" ? "Over Budget" : r.vStatus === "under" ? "Under Budget" : r.vStatus === "on" ? "On Target" : "No Reports"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {summary.noReports > 0 && (
        <p className="text-xs text-slate-500">
          {summary.noReports} job(s) have no daily reports filed yet — actual hours show as "—" and are excluded from totals.
        </p>
      )}
    </div>
  );
}