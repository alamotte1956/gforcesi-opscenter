import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BarChart3, Download, ArrowLeft, Loader2, Filter } from "lucide-react";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuickBooksReports() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [clients, setClients] = useState([]);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list("-issue_date", 1000).catch(() => []),
      base44.entities.Expense.list("-date", 1000).catch(() => []),
      base44.entities.Payout.list("-date", 1000).catch(() => []),
      base44.entities.Client.list("name", 500).catch(() => []),
    ]).then(([inv, exp, pay, cls]) => {
      setInvoices(inv || []);
      setExpenses(exp || []);
      setPayouts(pay || []);
      setClients(cls || []);
      setLoading(false);
    });
  }, []);

  const cutoffDate = useMemo(() => {
    if (dateRange === "all") return null;
    const d = new Date();
    if (dateRange === "30d") d.setDate(d.getDate() - 30);
    if (dateRange === "90d") d.setDate(d.getDate() - 90);
    if (dateRange === "ytd") d.setMonth(0, 1);
    return d.toISOString().slice(0, 10);
  }, [dateRange]);

  const inRange = (dt) => !cutoffDate || (dt && dt >= cutoffDate);

  const report = useMemo(() => {
    const fInv = invoices.filter((i) => inRange(i.issue_date));
    const fExp = expenses.filter((e) => inRange(e.date));
    const fPay = payouts.filter((p) => inRange(p.date));

    const byCategory = {};
    fExp.forEach((e) => {
      const cat = e.category || "other";
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0);
    });
    const totalPayouts = fPay.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (totalPayouts > 0) byCategory["contractor_1099_payouts"] = totalPayouts;

    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const byClient = {};
    fInv.forEach((i) => {
      const cName = clientMap.get(i.client_id)?.name || i.client_name || "Unassigned Client";
      if (!byClient[cName]) byClient[cName] = { invoiced: 0, paid: 0, open: 0, count: 0 };
      const amt = Number(i.total || i.subtotal || 0);
      byClient[cName].invoiced += amt;
      byClient[cName].count += 1;
      if (i.status === "paid") byClient[cName].paid += amt;
      else byClient[cName].open += amt;
    });

    const totalRevenue = fInv.reduce((s, i) => s + Number(i.total || i.subtotal || 0), 0);
    const collectedRevenue = fInv.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total || i.subtotal || 0), 0);
    const totalExpenses = fExp.reduce((s, e) => s + Number(e.amount || 0), 0) + totalPayouts;

    return {
      totalRevenue,
      collectedRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      categories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      clientRows: Object.entries(byClient).sort((a, b) => b[1].invoiced - a[1].invoiced),
    };
  }, [invoices, expenses, payouts, clients, cutoffDate]);

  const exportCsv = () => {
    const lines = [
      "Section,Label,Count,Invoiced_Or_Amount,Paid,Open",
      ...report.clientRows.map(([name, v]) => `Client,"${name.replace(/"/g, '""')}",${v.count},${v.invoiced.toFixed(2)},${v.paid.toFixed(2)},${v.open.toFixed(2)}`),
      ...report.categories.map(([cat, amt]) => `Expense,"${cat}",,${amt.toFixed(2)},,`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gforcesi-pnl-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/finance" className="text-xs text-[#4A9EFF] hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Financials
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#4A9EFF]" /> QuickBooks P&amp;L &amp; Client Reports
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All Time</option>
            <option value="ytd">Year to Date (YTD)</option>
            <option value="90d">Last 90 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Total Billed</div>
          <div className="text-2xl font-bold text-white mt-1">{fmtMoney(report.totalRevenue)}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Cash Collected (Paid)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{fmtMoney(report.collectedRevenue)}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Total Operating Costs</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{fmtMoney(report.totalExpenses)}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Net Operating Income</div>
          <div className={`text-2xl font-bold mt-1 ${report.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtMoney(report.netProfit)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 font-semibold text-sm text-white">
            Revenue by Ad Agency / Enterprise Client
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5 text-right">Invoices</th>
                  <th className="px-4 py-2.5 text-right">Billed</th>
                  <th className="px-4 py-2.5 text-right">Paid</th>
                  <th className="px-4 py-2.5 text-right">Open A/R</th>
                </tr>
              </thead>
              <tbody>
                {report.clientRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No invoices in selected window.</td></tr>
                ) : report.clientRows.map(([name, v]) => (
                  <tr key={name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-medium text-slate-200">{name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{v.count}</td>
                    <td className="px-4 py-2.5 text-right text-slate-200">{fmtMoney(v.invoiced)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">{fmtMoney(v.paid)}</td>
                    <td className="px-4 py-2.5 text-right text-amber-300">{fmtMoney(v.open)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 font-semibold text-sm text-white">
            Expenses &amp; 1099 Payouts by Category
          </div>
          <div className="p-4 space-y-3">
            {report.categories.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No expenses in selected window.</p>
            ) : report.categories.map(([cat, amt]) => {
              const pct = report.totalExpenses > 0 ? Math.round((amt / report.totalExpenses) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-slate-200 font-medium">{cat.replace(/_/g, " ")}</span>
                    <span className="text-slate-300">{fmtMoney(amt)} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#126DFA] rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
