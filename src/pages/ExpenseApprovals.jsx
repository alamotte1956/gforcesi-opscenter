import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Flag, Check, X, Receipt, Filter, Loader2, ImageOff, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  flagged: "bg-orange-500/15 text-orange-300 border-orange-500/30",
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

export default function ExpenseApprovals() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [flagModal, setFlagModal] = useState(null);
  const [flagNote, setFlagNote] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const exp = await base44.entities.Expense.list("-date");
    setExpenses(exp);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? expenses : expenses.filter((e) => e.status === filter)),
    [expenses, filter]
  );

  const totals = useMemo(() => {
    const sum = (arr) => arr.reduce((s, e) => s + (e.amount || 0), 0);
    const byStatus = (s) => expenses.filter((e) => e.status === s);
    return {
      pending: { count: byStatus("pending").length, total: sum(byStatus("pending")) },
      flagged: { count: byStatus("flagged").length, total: sum(byStatus("flagged")) },
      approved: { count: byStatus("approved").length, total: sum(byStatus("approved")) },
      rejected: { count: byStatus("rejected").length, total: sum(byStatus("rejected")) },
    };
  }, [expenses]);

  const setStatus = async (id, status, extra = {}) => {
    setBusyId(id);
    try {
      await base44.entities.Expense.update(id, { status, ...extra });
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status, ...extra } : e)));
    } catch (e) {
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openFlag = (e) => {
    setFlagModal(e);
    setFlagNote(e.flag_note || "");
  };

  const submitFlag = async () => {
    await setStatus(flagModal.id, "flagged", { flag_note: flagNote });
    toast({ title: "Flagged for follow-up", description: flagNote || "No note added" });
    setFlagModal(null);
    setFlagNote("");
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const eligible = filtered.filter((e) => e.status === "pending").map((e) => e.id);
    setSelected((prev) => {
      const allSelected = eligible.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) eligible.forEach((id) => next.delete(id));
      else eligible.forEach((id) => next.add(id));
      return next;
    });
  };

  const bulkApprove = async () => {
    if (!selected.size) return;
    setBulkBusy(true);
    try {
      await base44.entities.Expense.bulkUpdate(
        Array.from(selected).map((id) => ({ id, status: "approved" }))
      );
      toast({ title: "Approved for payroll", description: `${selected.size} expense(s)` });
      setSelected(new Set());
      await load();
    } catch (e) {
      toast({ title: "Bulk approve failed", description: e?.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const pendingSelected = Array.from(selected).filter((id) =>
    expenses.find((e) => e.id === id)?.status === "pending"
  ).length;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-400" /> Expense Approvals
          </h1>
          <p className="text-sm text-slate-500">Review contractor-submitted expenses, flag for follow-up, or approve for payroll</p>
        </div>
        {pendingSelected > 0 && (
          <button
            onClick={bulkApprove}
            disabled={bulkBusy}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-emerald-400 disabled:opacity-50"
          >
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve {pendingSelected} for payroll
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card label="Pending" value={totals.pending.count} sub={fmtMoney(totals.pending.total)} accent="text-amber-300" />
        <Card label="Flagged" value={totals.flagged.count} sub={fmtMoney(totals.flagged.total)} accent="text-orange-300" />
        <Card label="Approved" value={totals.approved.count} sub={fmtMoney(totals.approved.total)} accent="text-emerald-300" />
        <Card label="Rejected" value={totals.rejected.count} sub={fmtMoney(totals.rejected.total)} accent="text-rose-300" />
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        <Filter className="w-4 h-4 text-slate-500" />
        {["pending", "flagged", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
              filter === s
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center">
          <Receipt className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No expenses {filter !== "all" ? `with status "${filter}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filter === "pending" && filtered.some((e) => e.status === "pending") && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" onChange={toggleSelectAll} className="accent-cyan-500" />
              <span>Select all pending</span>
            </div>
          )}
          {filtered.map((e) => (
            <div
              key={e.id}
              className={`bg-slate-900 border rounded-xl p-4 ${
                e.status === "flagged" ? "border-orange-500/40" : "border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {e.status === "pending" && (
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    className="mt-1 accent-cyan-500"
                  />
                )}
                <button
                  onClick={() => e.receipt_url && setPreviewImg(e.receipt_url)}
                  className="shrink-0"
                >
                  {e.receipt_url ? (
                    <img src={e.receipt_url} alt="Receipt" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center">
                      <ImageOff className="w-5 h-5 text-slate-700" />
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100 truncate">{e.description}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {e.date}{e.filed_by_name ? ` · ${e.filed_by_name}` : ""}{e.vendor_name ? ` · ${e.vendor_name}` : ""}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${categoryStyles[e.category] || categoryStyles.other}`}>
                          {e.category}
                        </span>
                        {e.job_title && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 truncate max-w-[180px]" title={e.job_title}>
                            {e.job_title}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize whitespace-nowrap ${statusStyles[e.status] || statusStyles.pending}`}>
                          {e.status}
                        </span>
                      </div>
                      {e.flag_note && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-300/90 bg-orange-500/5 border border-orange-500/20 rounded-lg px-2.5 py-1.5">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{e.flag_note}</span>
                        </div>
                      )}
                      {e.notes && !e.flag_note && (
                        <div className="mt-1.5 text-xs text-slate-500 italic">"{e.notes}"</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-semibold text-slate-100">{fmtMoney(e.amount)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {busyId === e.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      <>
                        {(e.status === "pending" || e.status === "flagged") && (
                          <>
                            <button
                              onClick={() => setStatus(e.id, "approved")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve for payroll
                            </button>
                            <button
                              onClick={() => openFlag(e)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                                e.status === "flagged"
                                  ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
                                  : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                              }`}
                            >
                              <Flag className="w-3.5 h-3.5" /> {e.status === "flagged" ? "Edit flag" : "Flag for follow-up"}
                            </button>
                            <button
                              onClick={() => setStatus(e.id, "rejected")}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-medium hover:bg-rose-500/20 flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {e.status === "approved" && (
                          <button
                            onClick={() => setStatus(e.id, "pending")}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-700"
                          >
                            Revoke
                          </button>
                        )}
                        {e.status === "rejected" && (
                          <button
                            onClick={() => setStatus(e.id, "pending")}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:bg-slate-700"
                          >
                            Move back to pending
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFlagModal(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-orange-400" /> Flag for follow-up
            </h2>
            <p className="text-xs text-slate-500 mb-4">{flagModal.description} · {fmtMoney(flagModal.amount)}</p>
            <label className="block text-xs text-slate-400 mb-1">Follow-up note</label>
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder="What needs clarification from the contractor?"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFlagModal(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={submitFlag} className="px-4 py-2 rounded-lg bg-orange-500 text-slate-950 font-medium text-sm hover:bg-orange-400">Flag item</button>
            </div>
          </div>
        </div>
      )}

      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="absolute inset-0 bg-black/80" />
          <img src={previewImg} alt="Receipt" className="relative max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 text-slate-300 hover:text-white">
            <X className="w-6 h-6" />
          </button>
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