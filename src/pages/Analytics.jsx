import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { TrendingUp, DollarSign, Clock, Target } from "lucide-react";

export default function Analytics() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

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
    return { completed, invoiced, collected, onDuty };
  }, [jobs, invoices, employees]);

  const jobsByStatus = useMemo(() => {
    const counts = {};
    jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [jobs]);

  const barColors = ["#64748b", "#3b82f6", "#f59e0b", "#a855f7", "#6366f1", "#22c55e", "#06b6d4"];

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold mb-1">Analytics</h1>
      <p className="text-sm text-slate-500 mb-5">Operations & financial KPIs</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Target} label="Jobs Completed" value={kpis.completed} accent="text-cyan-400" />
        <KpiCard icon={DollarSign} label="Invoiced" value={`$${kpis.invoiced.toLocaleString()}`} accent="text-blue-400" />
        <KpiCard icon={TrendingUp} label="Collected" value={`$${kpis.collected.toLocaleString()}`} accent="text-emerald-400" />
        <KpiCard icon={Clock} label="On Duty Now" value={kpis.onDuty} accent="text-amber-400" />
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