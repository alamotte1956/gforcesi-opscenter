import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Check, X, UploadCloud, Receipt, Filter, Loader2 } from "lucide-react";
import DeleteRecord from "@/components/DeleteRecord";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  synced: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const categoryStyles = {
  labor: "bg-blue-500/15 text-blue-300",
  equipment: "bg-purple-500/15 text-purple-300",
  materials: "bg-indigo-500/15 text-indigo-300",
  travel: "bg-amber-500/15 text-amber-300",
  software: "bg-pink-500/15 text-pink-300",
  other: "bg-slate-700 text-slate-300",
};

const fmtMoney = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "labor", vendor_name: "", date: new Date().toISOString().slice(0, 10), job_id: "", notes: "" });

  const isAdmin = me?.role === "admin";
  const { toast } = useToast();

  const load = async () => {
    const [exp, jbs, user] = await Promise.all([
      base44.entities.Expense.list("-date"),
      base44.entities.Job.list(),
      base44.auth.me().catch(() => null),
    ]);
    setExpenses(exp); setJobs(jbs); setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (filter === "all" ? expenses : expenses.filter((e) => e.status === filter)), [expenses, filter]);

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((s, e) => s + (e.amount || 0), 0);
    const byStatus = (s) => expenses.filter((e) => e.status === s);
    return {
      pending: { count: byStatus("pending").length, total: sum(byStatus("pending")) },
      approved: { count: byStatus("approved").length, total: sum(byStatus("approved")) },
      synced: { count: byStatus("synced").length, total: sum(byStatus("synced")) },
      rejected: { count: byStatus("rejected").length, total: sum(byStatus("rejected")) },
    };
  }, [expenses]);

  const setStatus = async (id, status) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    await base44.entities.Expense.update(id, { status });
  };

  const syncApproved = async () => {
    const approved = expenses.filter((e) => e.status === "approved");
    if (!approved.length) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncQuickbooks", { action: "pushExpenses", ids: approved.map((e) => e.id) });
      const data = res.data || {};
      const failed = (data.results || []).filter((r) => !r.ok);
      if (failed.length) {
        toast({ title: `${failed.length} expense(s) failed`, description: failed[0]?.error || "See sync log", variant: "destructive" });
      } else {
        toast({ title: "Synced to QuickBooks", description: `${approved.length} expense(s)` });
      }
      await load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const createExpense = async () => {
    if (!form.description || !form.amount) return;
    const job = jobs.find((j) => j.id === form.job_id);
    await base44.entities.Expense.create({
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      category: form.category,
      vendor_name: form.vendor_name,
      job_id: form.job_id || undefined,
      job_title: job?.title,
      project_id: job?.project_id,
      project_name: job?.project_name,
      status: "pending",
      notes: form.notes,
    });
    setForm({ description: "", amount: "", category: "labor", vendor_name: "", date: new Date().toISOString().slice(0, 10), job_id: "", notes: "" });
    setShowForm(false);
    load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Receipt className="w-5 h-5 text-cyan-400" /> Expenses</h1>
          <p className="text-sm text-slate-500">Review and approve expenses before syncing to QuickBooks</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700 border border-slate-700">
              <Plus className="w-4 h-4" /> New Expense
            </button>
            <button onClick={syncApproved} disabled={syncing || totals.approved.count === 0} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-40">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Sync {totals.approved.count} approved to QB
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card label="Pending Review" value={`${totals.pending.count}`} sub={fmtMoney(totals.pending.total)} accent="text-amber-300" />
        <Card label="Approved" value={`${totals.approved.count}`} sub={fmtMoney(totals.approved.total)} accent="text-emerald-300" />
        <Card label="Synced to QB" value={`${totals.synced.count}`} sub={fmtMoney(totals.synced.total)} accent="text-cyan-300" />
        <Card label="Rejected" value={`${totals.rejected.count}`} sub={fmtMoney(totals.rejected.total)} accent="text-rose-300" />
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        <Filter className="w-4 h-4 text-slate-500" />
        {["all", "pending", "approved", "rejected", "synced"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${filter === s ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Vendor / Contractor</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{e.date || "—"}</td>
                  <td className="px-4 py-3 text-slate-200">{e.description}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${categoryStyles[e.category] || categoryStyles.other}`}>{e.category}</span></td>
                  <td className="px-4 py-3 text-slate-400">{e.vendor_name || e.filed_by_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate" title={e.job_title}>{e.job_title || "—"}</td>
                  <td className="px-4 py-3">
                    {e.receipt_url ? (
                      <a href={e.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                        <Receipt className="w-3.5 h-3.5" /> View
                      </a>
                    ) : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-200">{fmtMoney(e.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize whitespace-nowrap ${statusStyles[e.status] || statusStyles.pending}`}>
                      {e.status}{e.status === "synced" && e.quickbooks_id ? ` · ${e.quickbooks_id}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin && e.status === "pending" && (
                        <>
                          <button onClick={() => setStatus(e.id, "approved")} title="Approve" className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setStatus(e.id, "rejected")} title="Reject" className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {isAdmin && e.status === "approved" && (
                        <button onClick={() => setStatus(e.id, "pending")} className="text-xs text-slate-400 hover:text-slate-200">Revoke</button>
                      )}
                      {isAdmin && <DeleteRecord entityName="Expense" recordId={e.id} recordLabel={e.description} onDeleted={load} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400" />}
                      {!isAdmin && <span className="text-xs text-slate-600">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No expenses {filter !== "all" ? `with status "${filter}"` : ""}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold mb-4">New Expense</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="e.g. LiDAR scanning labor — Riverside job" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount ($)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    {["labor", "equipment", "materials", "travel", "software", "other"].map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Vendor / Contractor</label>
                  <input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className={inputCls} placeholder="Vendor name" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Job (optional)</label>
                <select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className={inputCls}>
                  <option value="">— None —</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={createExpense} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400">Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}