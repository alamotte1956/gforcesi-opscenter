import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { PieChart, AlertTriangle, Clock, TrendingUp, DollarSign, Wallet, Receipt } from "lucide-react";

const money = (v) => v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";
const pct = (n, d) => d ? `${((n / d) * 100).toFixed(0)}%` : "—";

const jobBillable = (j) => {
  if (!j) return 0;
  if (j.billable_rate_type === "hourly") return (j.billable_rate || 0) * (j.estimated_duration_hours || 0);
  if (j.billable_rate_type === "flat") return j.billable_rate || 0;
  if (j.billable_rate_type === "daily") return (j.billable_rate || 0) * Math.max(1, Math.ceil((j.estimated_duration_hours || 8) / 8));
  if (j.billable_rate_type === "per_sqft") return j.billable_rate || 0;
  return 0;
};

export default function Profitability() {
  const [jobs, setJobs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [j, e, p, c, r, pr] = await Promise.all([
      base44.entities.Job.list().catch(() => []),
      base44.entities.Expense.list().catch(() => []),
      base44.entities.Payout.list().catch(() => []),
      base44.entities.Contractor.list().catch(() => []),
      base44.entities.RecurringSchedule.list().catch(() => []),
      base44.entities.Proposal.list().catch(() => []),
    ]);
    setJobs(j); setExpenses(e); setPayouts(p); setContractors(c); setRecurring(r); setProposals(pr);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => jobs.map((j) => {
    const billable = jobBillable(j);
    const contractorCost = payouts.filter((p) => p.job_id === j.id).reduce((s, p) => s + (p.amount || 0), 0);
    const exp = expenses.filter((e) => e.job_id === j.id).reduce((s, e) => s + (e.amount || 0), 0);
    const cost = contractorCost + exp;
    const profit = billable - cost;
    const margin = billable ? profit / billable : 0;
    return { j, billable, contractorCost, expenses: exp, cost, profit, margin };
  }), [jobs, payouts, expenses]);

  const completed = rows.filter((r) => ["complete", "invoiced"].includes(r.j.status));
  const totalRevenue = completed.reduce((s, r) => s + r.billable, 0);
  const totalContractorCost = completed.reduce((s, r) => s + r.contractorCost, 0);
  const totalExpenses = completed.reduce((s, r) => s + r.expenses, 0);
  const netProfit = totalRevenue - totalContractorCost - totalExpenses;

  const byClient = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const k = r.j.client_name || "—";
      if (!map[k]) map[k] = { revenue: 0, cost: 0, jobs: 0 };
      map[k].revenue += r.billable;
      map[k].cost += r.cost;
      map[k].jobs += 1;
    }
    return Object.entries(map).map(([client, v]) => ({ client, ...v, profit: v.revenue - v.cost })).sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  const now = new Date();
  const slaBreached = jobs.filter((j) => j.sla_due_date && new Date(j.sla_due_date) < now && !["complete", "invoiced"].includes(j.status));
  const slaAtRisk = jobs.filter((j) => {
    if (!j.sla_due_date || ["complete", "invoiced"].includes(j.status)) return false;
    const days = (new Date(j.sla_due_date) - now) / 86400000;
    return days >= 0 && days <= 3;
  });

  const pipelineValue = proposals.filter((p) => ["sent", "accepted"].includes(p.status)).reduce((s, p) => s + (p.estimated_total || 0), 0);
  const recurringMonthly = recurring.filter((r) => r.active).reduce((s, r) => {
    const v = r.billable_rate || 0;
    if (r.cadence === "monthly") return s + v;
    if (r.cadence === "quarterly") return s + v / 3;
    if (r.cadence === "biweekly") return s + v * 2;
    if (r.cadence === "weekly") return s + v * 4;
    return s;
  }, 0);

  const utilization = useMemo(() => contractors.map((c) => {
    const cj = jobs.filter((j) => (j.assigned_contractor_ids || []).includes(c.id));
    const done = cj.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
    const hours = cj.reduce((s, j) => s + (j.estimated_duration_hours || 0), 0);
    return { c, jobs: cj.length, done, hours };
  }).filter((u) => u.jobs > 0).sort((a, b) => b.hours - a.hours), [contractors, jobs]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2"><PieChart className="w-5 h-5 text-cyan-400" /> SLA & Profitability</h1>
        <p className="text-sm text-slate-500">Job margin, SLA breach monitoring, revenue forecast, and crew utilization</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card label="Revenue (completed)" value={money(totalRevenue)} icon={DollarSign} accent="text-emerald-400" />
        <Card label="Contractor cost" value={money(totalContractorCost)} icon={Wallet} accent="text-amber-400" />
        <Card label="Expenses" value={money(totalExpenses)} icon={Receipt} accent="text-rose-400" />
        <Card label="Net profit" value={money(netProfit)} icon={TrendingUp} accent={netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} />
        <Card label="Avg margin" value={pct(netProfit, totalRevenue)} icon={PieChart} accent="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900 border border-rose-500/30 rounded-xl p-4">
          <h2 className="text-sm font-medium text-rose-300 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> SLA Breached ({slaBreached.length})</h2>
          {slaBreached.length === 0 ? <div className="text-xs text-slate-500">No breaches — all SLAs on track.</div> : (
            <div className="space-y-2">
              {slaBreached.map((j) => (
                <div key={j.id} className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2">
                  <div className="font-medium text-slate-200">{j.title}</div>
                  <div className="text-rose-400">Due {new Date(j.sla_due_date).toLocaleDateString()} · {j.client_name || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4">
          <h2 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> SLA At Risk — 3 days ({slaAtRisk.length})</h2>
          {slaAtRisk.length === 0 ? <div className="text-xs text-slate-500">Nothing due in the next 3 days.</div> : (
            <div className="space-y-2">
              {slaAtRisk.map((j) => (
                <div key={j.id} className="text-xs bg-slate-950 border border-slate-800 rounded-lg p-2">
                  <div className="font-medium text-slate-200">{j.title}</div>
                  <div className="text-amber-400">Due {new Date(j.sla_due_date).toLocaleDateString()} · {j.client_name || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Revenue Forecast</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500">Pipeline (open proposals)</div>
            <div className="text-xl font-semibold text-cyan-300">{money(pipelineValue)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Recurring (monthly run-rate)</div>
            <div className="text-xl font-semibold text-emerald-300">{money(recurringMonthly)}/mo</div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-medium text-slate-300 mb-3">Per-Job Profitability</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto mb-6">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium text-right">Billable</th>
              <th className="px-4 py-3 font-medium text-right">Contractor</th>
              <th className="px-4 py-3 font-medium text-right">Expenses</th>
              <th className="px-4 py-3 font-medium text-right">Profit</th>
              <th className="px-4 py-3 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter((r) => r.billable > 0 || r.cost > 0).map((r) => (
              <tr key={r.j.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                <td className="px-4 py-3 text-slate-200">{r.j.title}</td>
                <td className="px-4 py-3 text-slate-400">{r.j.client_name || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-200">{money(r.billable)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{money(r.contractorCost)}</td>
                <td className="px-4 py-3 text-right text-rose-400">{money(r.expenses)}</td>
                <td className={`px-4 py-3 text-right font-medium ${r.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(r.profit)}</td>
                <td className={`px-4 py-3 text-right ${r.margin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{pct(r.profit, r.billable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-3">By Client</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2.5 font-medium">Client</th>
                  <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                  <th className="px-4 py-2.5 font-medium text-right">Profit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Jobs</th>
                </tr>
              </thead>
              <tbody>
                {byClient.map((c) => (
                  <tr key={c.client} className="border-b border-slate-800/60">
                    <td className="px-4 py-2.5 text-slate-200">{c.client}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{money(c.revenue)}</td>
                    <td className={`px-4 py-2.5 text-right ${c.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(c.profit)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{c.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-3">Crew Utilization</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2.5 font-medium">Contractor</th>
                  <th className="px-4 py-2.5 font-medium text-right">Assigned</th>
                  <th className="px-4 py-2.5 font-medium text-right">Completed</th>
                  <th className="px-4 py-2.5 font-medium text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {utilization.map((u) => (
                  <tr key={u.c.id} className="border-b border-slate-800/60">
                    <td className="px-4 py-2.5 text-slate-200">{u.c.name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{u.jobs}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{u.done}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{u.hours}</td>
                  </tr>
                ))}
                {utilization.length === 0 && <tr><td className="px-4 py-4 text-slate-500 text-xs">No assignments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mb-2 ${accent}`}><Icon className="w-4 h-4" /></div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}