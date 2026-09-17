import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Users, CalendarDays, CheckCheck, Loader2, AlertTriangle } from "lucide-react";
import { startOfWeek, format, isSameWeek } from "date-fns";

const HIGH_HOURS = 60;

export default function BulkApprovePanel({ payouts, onApproved }) {
  const { toast } = useToast();
  const [busyKey, setBusyKey] = useState(null); // which group is approving

  const pending = useMemo(() => payouts.filter((p) => p.status === "pending"), [payouts]);

  const byContractor = useMemo(() => {
    const map = {};
    pending.forEach((p) => {
      const id = p.contractor_id || "_none";
      if (!map[id]) map[id] = { id, name: p.contractor_name || "Unknown", count: 0, hours: 0, amount: 0, ids: [] };
      map[id].count++;
      map[id].hours += Number(p.hours) || 0;
      map[id].amount += Number(p.amount) || 0;
      map[id].ids.push(p.id);
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [pending]);

  const byWeek = useMemo(() => {
    const map = {};
    pending.forEach((p) => {
      if (!p.date) return;
      const d = new Date(p.date);
      const monday = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(monday, "yyyy-MM-dd");
      if (!map[key]) map[key] = { key, label: format(monday, "MMM d"), count: 0, hours: 0, amount: 0, ids: [] };
      map[key].count++;
      map[key].hours += Number(p.hours) || 0;
      map[key].amount += Number(p.amount) || 0;
      map[key].ids.push(p.id);
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [pending]);

  const approve = async (key, ids, label) => {
    if (!ids.length) return;
    setBusyKey(key);
    try {
      await base44.entities.Payout.bulkUpdate(ids.map((id) => ({ id, status: "approved" })));
      toast({ title: "Approved", description: `${ids.length} timesheet${ids.length > 1 ? "s" : ""} · ${label}` });
      onApproved?.();
    } catch (e) {
      toast({ title: "Approve failed", description: e?.message || "Permission or network error.", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  if (!pending.length) return null;

  const totalHours = pending.reduce((s, p) => s + (Number(p.hours) || 0), 0);
  const totalAmount = pending.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const allIds = pending.map((p) => p.id);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-cyan-400" /> Bulk Approve Timesheets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pending.length} pending · {totalHours.toFixed(1)} hrs · ${totalAmount.toFixed(2)} — review totals, then approve in batches.
          </p>
        </div>
        <button
          onClick={() => approve("all", allIds, "all pending")}
          disabled={busyKey === "all"}
          className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50"
        >
          {busyKey === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          Approve all pending ({pending.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By crew member */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> By Crew Member
          </div>
          <div className="space-y-2">
            {byContractor.map((c) => {
              const high = c.hours >= HIGH_HOURS;
              return (
                <div key={c.id} className="flex items-center gap-3 bg-slate-800/40 border border-slate-800 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-100 truncate">{c.name}</span>
                      {high && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300" title={`${HIGH_HOURS}+ hrs pending`}>
                          <AlertTriangle className="w-3 h-3" /> high
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.count} entries · <span className={high ? "text-amber-300 font-medium" : "text-slate-300"}>{c.hours.toFixed(1)} hrs</span> · ${c.amount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => approve(`c-${c.id}`, c.ids, c.name)}
                    disabled={!!busyKey}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {busyKey === `c-${c.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />} Approve
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* By week */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> By Week (Mon start)
          </div>
          <div className="space-y-2">
            {byWeek.map((w) => {
              const high = w.hours >= HIGH_HOURS;
              return (
                <div key={w.key} className="flex items-center gap-3 bg-slate-800/40 border border-slate-800 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-100">Week of {w.label}</span>
                      {high && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300" title={`${HIGH_HOURS}+ hrs pending`}>
                          <AlertTriangle className="w-3 h-3" /> high
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {w.count} entries · <span className={high ? "text-amber-300 font-medium" : "text-slate-300"}>{w.hours.toFixed(1)} hrs</span> · ${w.amount.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => approve(`w-${w.key}`, w.ids, `week of ${w.label}`)}
                    disabled={!!busyKey}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {busyKey === `w-${w.key}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />} Approve
                  </button>
                </div>
              );
            })}
            {byWeek.length === 0 && <div className="text-xs text-slate-600 px-1">No dated pending entries.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}