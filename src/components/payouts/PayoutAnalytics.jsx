import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, XAxis as BarX, YAxis as BarY,
} from "recharts";
import { TrendingUp, FolderKanban, Loader2 } from "lucide-react";

const monthKey = (d) => (d || "").slice(0, 7); // YYYY-MM
const monthLabel = (k) => {
  const [y, m] = k.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString("en-US", { month: "short", year: "2-digit" });
};
const fmtMoney = (n) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function PayoutAnalytics({ payouts }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project.list()
      .then((p) => setProjects(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeProjectNames = useMemo(
    () => new Set(projects.filter((p) => p.status === "active").map((p) => p.name).filter(Boolean)),
    [projects]
  );

  const overTime = useMemo(() => {
    const map = {};
    payouts.forEach((p) => {
      const k = monthKey(p.date);
      if (!k) return;
      map[k] = (map[k] || 0) + (p.amount || 0);
    });
    return Object.keys(map).sort().map((k) => ({ key: k, label: monthLabel(k), total: map[k] }));
  }, [payouts]);

  const byProject = useMemo(() => {
    const map = {};
    payouts.forEach((p) => {
      const name = p.project_name || "Unassigned";
      if (activeProjectNames.size && !activeProjectNames.has(name) && name !== "Unassigned") return;
      map[name] = (map[name] || 0) + (p.amount || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [payouts, activeProjectNames]);

  const grandTotal = useMemo(() => payouts.reduce((s, p) => s + (p.amount || 0), 0), [payouts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!payouts.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">
        No payout data to analyze yet.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-slate-200">Payout Analytics</h2>
        <span className="text-xs text-slate-500">· {fmtMoney(grandTotal)} total across {payouts.length} payouts</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pay over time */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-3">Total Contractor Pay Over Time</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={overTime} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={fmtMoney} tickLine={false} axisLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v) => [fmtMoney(v), "Paid"]}
              />
              <Area type="monotone" dataKey="total" stroke="#22d3ee" strokeWidth={2} fill="url(#payGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown by active project */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5" /> Pay Breakdown by Active Project
          </div>
          {byProject.length === 0 ? (
            <div className="text-sm text-slate-500 py-16 text-center">No payouts linked to active projects.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byProject} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <BarX type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={fmtMoney} tickLine={false} axisLine={false} />
                <BarY type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} width={110} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v) => [fmtMoney(v), "Paid"]}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}