import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, AlertCircle, RefreshCw, Settings, DollarSign, FileText,
  TrendingUp, Receipt, ArrowUpRight, Loader2, Layers, ShieldAlert, BarChart3, ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuickBooksDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [sites, setSites] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [syncingKey, setSyncingKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [connRes, exp, inv, pay, logs, st, jbs] = await Promise.all([
        base44.functions.invoke("checkConnections", {}).catch(() => ({ data: { quickbooks: false } })),
        base44.entities.Expense.list("-date", 500).catch(() => []),
        base44.entities.Invoice.list("-issue_date", 500).catch(() => []),
        base44.entities.Payout.list("-date", 500).catch(() => []),
        base44.entities.SyncLog.list("-timestamp", 50).catch(() => []),
        base44.entities.Site.list("-created_date", 500).catch(() => []),
        base44.entities.Job.list("-created_date", 500).catch(() => []),
      ]);
      setConnected(Boolean(connRes?.data?.quickbooks));
      setExpenses(exp || []);
      setInvoices(inv || []);
      setPayouts(pay || []);
      setSyncLogs(logs || []);
      setSites(st || []);
      setJobs(jbs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const approvedExpenses = expenses.filter((e) => e.status === "approved" && !e.quickbooks_synced && !e.quickbooks_id);
    const syncedExpenses = expenses.filter((e) => e.status === "synced" || e.quickbooks_synced || e.quickbooks_id);
    const failedExpenses = expenses.filter((e) => e.quickbooks_sync_error);

    const unsyncedInvoices = invoices.filter((i) => !i.quickbooks_invoice_id && i.status !== "draft");
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const openInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");

    const approvedPayouts = payouts.filter((p) => p.status === "approved" && !p.quickbooks_id);
    const totalRevenue = invoices.reduce((s, i) => s + Number(i.total || i.subtotal || 0), 0);
    const totalCosts = expenses.reduce((s, e) => s + Number(e.amount || 0), 0) + payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const netMargin = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? Math.round((netMargin / totalRevenue) * 100) : 0;

    return {
      approvedExpenses,
      syncedExpenses,
      failedExpenses,
      unsyncedInvoices,
      paidInvoices,
      openInvoices,
      approvedPayouts,
      totalRevenue,
      totalCosts,
      netMargin,
      marginPct,
      errorLogCount: syncLogs.filter((l) => l.status === "error" || l.status === "failed").length,
    };
  }, [expenses, invoices, payouts, syncLogs]);

  const branchProfitability = useMemo(() => {
    const byZone = { CONUS: { revenue: 0, cost: 0, count: 0 }, AK: { revenue: 0, cost: 0, count: 0 }, HI: { revenue: 0, cost: 0, count: 0 } };
    const siteMap = new Map(sites.map((s) => [s.id, s]));
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    jobs.forEach((j) => {
      const zone = j.region_zone || siteMap.get(j.site_id)?.region_zone || "CONUS";
      const bucket = byZone[zone] || byZone.CONUS;
      bucket.count += 1;
      bucket.revenue += Number(j.price || j.rate || 0);
    });
    expenses.forEach((e) => {
      const j = jobMap.get(e.job_id);
      const zone = j?.region_zone || siteMap.get(j?.site_id)?.region_zone || "CONUS";
      const bucket = byZone[zone] || byZone.CONUS;
      bucket.cost += Number(e.amount || 0);
    });
    payouts.forEach((p) => {
      const j = jobMap.get(p.job_id);
      const zone = j?.region_zone || siteMap.get(j?.site_id)?.region_zone || "CONUS";
      const bucket = byZone[zone] || byZone.CONUS;
      bucket.cost += Number(p.amount || 0);
    });
    return Object.entries(byZone).map(([zone, v]) => ({
      zone,
      ...v,
      profit: v.revenue - v.cost,
    }));
  }, [sites, jobs, expenses, payouts]);

  const runAction = async (key, fn, successTitle) => {
    setSyncingKey(key);
    try {
      const res = await fn();
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      toast({ title: successTitle, description: data.message || "QuickBooks Online sync completed." });
      await load();
    } catch (e) {
      toast({ title: "QuickBooks Sync Error", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setSyncingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#4A9EFF]" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Financials & QuickBooks Online</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              connected
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}>
              {connected ? "QBO Connected" : "QBO Setup Required"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Two-way QuickBooks Online OAuth sync, automated invoicing, contractor payout batching &amp; 50-state branch margin analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://gforcepay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" /> GForcePay Portal <ExternalLink className="w-3 h-3" />
          </a>
          <Link to="/quickbooks-setup" className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Connection Setup
          </Link>
          <Link to="/quickbooks-mapping" className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Account Mapping
          </Link>
          <Link to="/quickbooks-reports" className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> P&amp;L Reports
          </Link>
          <Link to="/quickbooks-errors" className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Sync Errors
            {(stats.failedExpenses.length + stats.errorLogCount) > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                {stats.failedExpenses.length + stats.errorLogCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {!connected && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-200">QuickBooks Online Connector Not Authorized</h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Connect your QuickBooks Online company via the Base44 OAuth connector to push invoices, expenses, and contractor payouts automatically.
              </p>
            </div>
          </div>
          <Link to="/quickbooks-setup" className="px-3.5 py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold">
            Configure OAuth
          </Link>
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gross Invoiced Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{fmtMoney(stats.totalRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.paidInvoices.length} paid · {stats.openInvoices.length} open invoices
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Field Costs &amp; Payouts</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{fmtMoney(stats.totalCosts)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {expenses.length} expenses · {payouts.length} contractor payouts
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Net Operating Margin</span>
            <DollarSign className="w-4 h-4 text-[#4A9EFF]" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${stats.netMargin >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmtMoney(stats.netMargin)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{stats.marginPct}% gross margin across portfolio</div>
        </div>

        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ready for QBO Batch Sync</span>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats.approvedExpenses.length + stats.unsyncedInvoices.length + stats.approvedPayouts.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.approvedExpenses.length} exp · {stats.unsyncedInvoices.length} inv · {stats.approvedPayouts.length} payouts
          </div>
        </div>
      </div>

      {/* Sync Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">1. Push Approved Expenses</h3>
            <p className="text-xs text-slate-400 mt-1">
              Creates QuickBooks Purchase entries mapped to your Chart of Accounts ({stats.approvedExpenses.length} queued).
            </p>
          </div>
          <button
            disabled={syncingKey !== null || stats.approvedExpenses.length === 0}
            onClick={() =>
              runAction(
                "expenses",
                () => base44.functions.invoke("syncQuickbooks", { action: "pushExpenses", ids: stats.approvedExpenses.map((e) => e.id) }),
                "Expenses pushed to QuickBooks"
              )
            }
            className="w-full py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            {syncingKey === "expenses" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            Push {stats.approvedExpenses.length} Expenses
          </button>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">2. Batch Contractor Payouts</h3>
            <p className="text-xs text-slate-400 mt-1">
              Syncs approved 1099 technician time payouts as QBO vendor bills/purchases ({stats.approvedPayouts.length} ready).
            </p>
          </div>
          <button
            disabled={syncingKey !== null || stats.approvedPayouts.length === 0}
            onClick={() =>
              runAction(
                "payouts",
                () => base44.functions.invoke("syncApprovedPayouts", {}),
                "Contractor payouts synced to QuickBooks"
              )
            }
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            {syncingKey === "payouts" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Batch {stats.approvedPayouts.length} Payouts
          </button>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">3. Sync Invoice Payments</h3>
            <p className="text-xs text-slate-400 mt-1">
              Pulls live QBO invoice balances and automatically marks paid client &amp; agency invoices.
            </p>
          </div>
          <button
            disabled={syncingKey !== null}
            onClick={() =>
              runAction(
                "payments",
                () => base44.functions.invoke("syncQuickBooksPaymentStatus", {}),
                "Invoice payment status refreshed"
              )
            }
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            {syncingKey === "payments" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Pull Payment Status
          </button>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">4. Pull QBO Customers</h3>
            <p className="text-xs text-slate-400 mt-1">
              Imports or links QuickBooks Customer IDs into G-Force SI Agency &amp; Enterprise Client records.
            </p>
          </div>
          <button
            disabled={syncingKey !== null}
            onClick={() =>
              runAction(
                "customers",
                () => base44.functions.invoke("syncQuickbooks", { action: "pullCustomers" }),
                "QuickBooks customers imported"
              )
            }
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            {syncingKey === "customers" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Sync Customers
          </button>
        </div>
      </div>

      {/* Regional Profitability (CONUS / AK / HI) & Recent Sync Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">50-State Regional Margin (CONUS · AK · HI)</h2>
            <Link to="/quickbooks-reports" className="text-xs text-[#4A9EFF] hover:underline">Full Reports →</Link>
          </div>
          <div className="space-y-3">
            {branchProfitability.map((row) => {
              const pct = row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0;
              return (
                <div key={row.zone} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#126DFA]/15 text-[#4A9EFF] text-xs font-bold">{row.zone}</span>
                      <span className="text-xs text-slate-400">{row.count} scan job(s)</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Rev {fmtMoney(row.revenue)} · Costs {fmtMoney(row.cost)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${row.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {fmtMoney(row.profit)}
                    </div>
                    <div className="text-[11px] text-slate-400">{pct}% margin</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent QuickBooks Sync Activity</h2>
            <Link to="/quickbooks-errors" className="text-xs text-[#4A9EFF] hover:underline">Inspect Logs →</Link>
          </div>
          {syncLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No QuickBooks sync logs recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {syncLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      {log.entity_label || log.entity_type || log.sync_type}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{log.message}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                    log.status === "success"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-rose-500/15 text-rose-300"
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
