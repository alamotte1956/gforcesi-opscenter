import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Download, Wallet, Clock, CheckCircle2, X, RefreshCw } from "lucide-react";
import DeleteRecord from "@/components/DeleteRecord";
import PayoutAnalytics from "@/components/payouts/PayoutAnalytics";

const statusStyles = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  synced: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

const blank = { contractor_id: "", job_id: "", date: new Date().toISOString().slice(0, 10), hours: "", pay_type: "hourly", pay_rate: "", amount: "", notes: "" };

export default function Payouts() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterContractor, setFilterContractor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const load = async () => {
    try {
      const [user, ps, cs, js] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Payout.list("-date"),
        base44.entities.Contractor.list(),
        base44.entities.Job.list(),
      ]);
      setMe(user); setPayouts(ps); setContractors(cs); setJobs(js);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isAdmin = me?.role === "admin";
  const isFullAccess = isAdmin || me?.access_level === "full";
  const contractorById = (id) => contractors.find((c) => c.id === id);

  const years = useMemo(() => {
    const set = new Set(payouts.map((p) => (p.date || "").slice(0, 4)).filter(Boolean));
    return ["all", ...Array.from(set).sort().reverse()];
  }, [payouts]);

  const filtered = useMemo(() => payouts.filter((p) => {
    if (filterContractor !== "all" && p.contractor_id !== filterContractor) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterYear !== "all" && (p.date || "").slice(0, 4) !== filterYear) return false;
    return true;
  }), [payouts, filterContractor, filterStatus, filterYear]);

  const summary = useMemo(() => {
    const owed = filtered.filter((p) => !["paid", "synced"].includes(p.status)).reduce((s, p) => s + (p.amount || 0), 0);
    const ytd = String(new Date().getFullYear());
    const paidYTD = filtered.filter((p) => p.status === "paid" && (p.date || "").slice(0, 4) === ytd).reduce((s, p) => s + (p.amount || 0), 0);
    const pendingCount = filtered.filter((p) => p.status === "pending").length;
    return { owed, paidYTD, pendingCount };
  }, [filtered]);

  const calcAmount = (pay_type, hours, pay_rate) => {
    const h = Number(hours) || 0;
    const r = Number(pay_rate) || 0;
    if (pay_type === "hourly") return +(h * r).toFixed(2);
    return r;
  };

  const onContractorChange = (id) => {
    const c = contractorById(id);
    const pay_type = c?.pay_type || "hourly";
    const pay_rate = c?.pay_rate ?? "";
    setForm((f) => ({ ...f, contractor_id: id, pay_type, pay_rate, amount: calcAmount(pay_type, f.hours, pay_rate) }));
  };

  const setField = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "hours" || k === "pay_rate" || k === "pay_type") {
      next.amount = calcAmount(next.pay_type, next.hours, next.pay_rate);
    }
    return next;
  });

  const submit = async () => {
    if (!form.contractor_id || !form.amount || !form.date) return;
    setSaving(true);
    const c = contractorById(form.contractor_id);
    const job = jobs.find((j) => j.id === form.job_id);
    try {
      await base44.entities.Payout.create({
        contractor_id: form.contractor_id,
        contractor_name: c?.name || "",
        job_id: form.job_id || undefined,
        job_title: job?.title,
        project_name: job?.project_name,
        date: form.date,
        hours: Number(form.hours) || 0,
        pay_type: form.pay_type,
        pay_rate: Number(form.pay_rate) || 0,
        amount: Number(form.amount) || 0,
        status: "pending",
        notes: form.notes,
      });
      toast({ title: "Payout recorded", description: `$${Number(form.amount).toFixed(2)} to ${c?.name}` });
      setForm(blank); setShowForm(false);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const updateStatus = async (p, status) => {
    try {
      await base44.entities.Payout.update(p.id, { status });
      toast({ title: status === "paid" ? "Marked paid" : "Approved", description: p.contractor_name });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const syncToQb = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncApprovedPayouts", {});
      const d = res.data || {};
      if (d.error) { toast({ title: "Sync failed", description: d.error, variant: "destructive" }); }
      else { toast({ title: "Synced to QuickBooks", description: `${d.pushed || 0} of ${d.found || 0} approved payout(s) pushed.` }); load(); }
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const exportApprovedCsv = () => {
    const approved = filtered.filter((p) => p.status === "approved");
    if (!approved.length) { toast({ title: "No approved payouts", description: "No approved payouts match the current filters." }); return; }
    const header = ["Date", "Contractor", "Job", "Project", "Hours", "Pay Type", "Rate", "Amount", "Status", "Notes"];
    const rows = approved.map((p) => [
      p.date || "", p.contractor_name || "", p.job_title || "", p.project_name || "",
      p.hours ?? "", p.pay_type || "", p.pay_rate ?? "", (p.amount || 0).toFixed(2), p.status || "", p.notes || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `approved-payouts-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const export1099 = () => {
    const year = new Date().getFullYear();
    const paid = payouts.filter((p) => p.status === "paid" && (p.date || "").slice(0, 4) === String(year));
    if (!paid.length) { toast({ title: "No paid payouts", description: `Nothing paid in ${year} to export.` }); return; }
    const byContractor = {};
    paid.forEach((p) => {
      if (!byContractor[p.contractor_id]) byContractor[p.contractor_id] = { name: p.contractor_name, total: 0, count: 0 };
      byContractor[p.contractor_id].total += p.amount || 0;
      byContractor[p.contractor_id].count++;
    });
    const rows = Object.entries(byContractor).map(([id, r]) => {
      const c = contractorById(id);
      return [r.name, c?.email || "", c?.phone || "", r.total.toFixed(2), r.count];
    });
    const header = ["Contractor Name", "Email", "Phone", `Total Paid ${year}`, "Payments"];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `1099-prep-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Contractor Payouts</h1>
          <p className="text-sm text-slate-500">1099 payout ledger & year-end export</p>
        </div>
        <div className="flex items-center gap-2">
          {isFullAccess && (
            <button onClick={exportApprovedCsv} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700">
              <Download className="w-4 h-4" /> Approved CSV
            </button>
          )}
          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={syncToQb} disabled={syncing} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700 disabled:opacity-50">
                {syncing ? <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync to QB
              </button>
              <button onClick={export1099} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700">
                <Download className="w-4 h-4" /> Export 1099
              </button>
              <button onClick={() => { setForm(blank); setShowForm(true); }} className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center gap-1.5 hover:bg-cyan-400">
                <Plus className="w-4 h-4" /> New Payout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Stat icon={Wallet} label="Outstanding (owed)" value={`$${summary.owed.toFixed(2)}`} accent="text-amber-400" />
        <Stat icon={CheckCircle2} label={`Paid YTD ${new Date().getFullYear()}`} value={`$${summary.paidYTD.toFixed(2)}`} accent="text-emerald-400" />
        <Stat icon={Clock} label="Pending approval" value={summary.pendingCount} accent="text-blue-400" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filterContractor} onChange={(e) => setFilterContractor(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
          <option value="all">All contractors</option>
          {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="synced">Synced to QB</option>
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
          {years.map((y) => <option key={y} value={y}>{y === "all" ? "All years" : y}</option>)}
        </select>
      </div>

      <PayoutAnalytics payouts={filtered} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Contractor</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium text-right">Hours</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-300">{p.date}</td>
                <td className="px-4 py-3 font-medium text-slate-100">{p.contractor_name}</td>
                <td className="px-4 py-3 text-slate-400">{p.job_title || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-300">{p.hours || "—"}</td>
                <td className="px-4 py-3 text-right text-slate-400">{p.pay_type === "hourly" ? `$${(p.pay_rate || 0).toFixed(2)}/hr` : p.pay_type}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-100">${(p.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[p.status]}`}>{p.status}</span></td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.status === "pending" && <button onClick={() => updateStatus(p, "approved")} className="text-xs text-blue-300 hover:text-blue-200 mr-2">Approve</button>}
                    {p.status !== "paid" && <button onClick={() => updateStatus(p, "paid")} className="text-xs text-emerald-300 hover:text-emerald-200 mr-2">Mark paid</button>}
                    <DeleteRecord entityName="Payout" recordId={p.id} recordLabel={`${p.contractor_name} · $${(p.amount || 0).toFixed(2)}`} onDeleted={load} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400" />
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-500">No payouts recorded.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Record Payout</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contractor *</label>
                <select value={form.contractor_id} onChange={(e) => onContractorChange(e.target.value)} className={inputCls}>
                  <option value="">Select contractor…</option>
                  {contractors.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Job (optional)</label>
                <select value={form.job_id} onChange={(e) => setField("job_id", e.target.value)} className={inputCls}>
                  <option value="">— General / no specific job —</option>
                  {jobs.filter((j) => !form.contractor_id || (j.assigned_contractor_ids || []).includes(form.contractor_id)).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Date *</label><input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Hours</label><input type="number" value={form.hours} onChange={(e) => setField("hours", e.target.value)} className={inputCls} placeholder="0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Pay type</label><select value={form.pay_type} onChange={(e) => setField("pay_type", e.target.value)} className={inputCls}><option value="hourly">Hourly</option><option value="flat">Flat</option><option value="salary">Salary</option></select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Rate {form.pay_type === "hourly" ? "($/hr)" : "($)"}</label><input type="number" value={form.pay_rate} onChange={(e) => setField("pay_rate", e.target.value)} className={inputCls} placeholder="0" /></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Amount ($)</label><input type="number" value={form.amount} onChange={(e) => setField("amount", e.target.value)} className={inputCls} placeholder="0.00" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Notes</label><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} className={inputCls} placeholder="Optional" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={submit} disabled={saving || !form.contractor_id || !form.amount} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : "Record Payout"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mb-3 ${accent}`}><Icon className="w-5 h-5" /></div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}