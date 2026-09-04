import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, ChevronDown, ChevronRight, Users, Clock, DollarSign, CheckCircle2 } from "lucide-react";

function weekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function weekLabel(mondayStr) {
  const d = new Date(mondayStr + "T00:00:00");
  const end = new Date(mondayStr + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(d)} – ${fmt(end)}`;
}

export default function PayoutReview() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [weekFilter, setWeekFilter] = useState("all");
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    try {
      const [user, ps, cs] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Payout.list("-date"),
        base44.entities.Contractor.list(),
      ]);
      setMe(user); setPayouts(ps); setContractors(cs);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isAdmin = me?.role === "admin";
  const contractorById = (id) => contractors.find((c) => c.id === id);

  const ready = useMemo(() => payouts.filter((p) => p.status === "approved" && !p.quickbooks_id), [payouts]);

  const weekOptions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weeks = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - i * 7);
      weeks.push(weekStart(d.toISOString().slice(0, 10)));
    }
    return weeks;
  }, []);

  const filtered = useMemo(() => {
    if (weekFilter === "all") return ready;
    return ready.filter((p) => weekStart(p.date) === weekFilter);
  }, [ready, weekFilter]);

  const byContractor = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      if (!map[p.contractor_id]) {
        const c = contractorById(p.contractor_id);
        map[p.contractor_id] = {
          contractor_id: p.contractor_id,
          name: p.contractor_name,
          pay_type: c?.pay_type || p.pay_type || "hourly",
          pay_rate: c?.pay_rate ?? p.pay_rate ?? 0,
          entries: [],
          totalHours: 0,
          totalAmount: 0,
        };
      }
      map[p.contractor_id].entries.push(p);
      map[p.contractor_id].totalHours += Number(p.hours) || 0;
      map[p.contractor_id].totalAmount += Number(p.amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filtered]);

  const totals = useMemo(() => ({
    contractors: byContractor.length,
    hours: byContractor.reduce((s, r) => s + r.totalHours, 0),
    amount: byContractor.reduce((s, r) => s + r.totalAmount, 0),
  }), [byContractor]);

  const syncToQb = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncApprovedPayouts", {});
      const d = res.data || {};
      if (d.error) { toast({ title: "Sync failed", description: d.error, variant: "destructive" }); }
      else { toast({ title: "Synced to QuickBooks", description: `${d.pushed || 0} of ${d.found || 0} payouts pushed.` }); load(); }
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Payout Review</h1>
          <p className="text-sm text-slate-500">Aggregate approved contractor time and review before syncing to QuickBooks</p>
        </div>
        {isAdmin && (
          <button onClick={syncToQb} disabled={syncing || ready.length === 0} className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-violet-400 disabled:opacity-50">
            {syncing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync to QuickBooks
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat icon={Users} label="Contractors" value={totals.contractors} accent="text-cyan-400" />
        <Stat icon={Clock} label="Total hours" value={totals.hours.toFixed(1)} accent="text-amber-400" />
        <Stat icon={DollarSign} label="Ready to sync" value={`$${totals.amount.toFixed(2)}`} accent="text-violet-400" />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-slate-500">Week:</span>
        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200">
          <option value="all">All approved</option>
          {weekOptions.map((w) => <option key={w} value={w}>{weekLabel(w)}</option>)}
        </select>
        {weekFilter !== "all" && (
          <span className="text-xs text-slate-500">{filtered.length} of {ready.length} approved entries</span>
        )}
      </div>

      {byContractor.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No approved payouts to review.</div>
          <div className="text-xs text-slate-500 mt-1">Approve payouts on the Contractor Payouts page, then review them here before syncing.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {byContractor.map((row) => {
            const open = expanded[row.contractor_id];
            return (
              <div key={row.contractor_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => toggle(row.contractor_id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/40">
                  {open ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-100 truncate">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.entries.length} entr{row.entries.length === 1 ? "y" : "ies"} · {row.pay_type === "hourly" ? `$${row.pay_rate.toFixed(2)}/hr` : row.pay_type}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500">{row.totalHours.toFixed(1)} hrs</div>
                    <div className="font-semibold text-slate-100">${row.totalAmount.toFixed(2)}</div>
                  </div>
                </button>
                {open && (
                  <div className="border-t border-slate-800 overflow-x-auto">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 bg-slate-800/30">
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Job</th>
                          <th className="px-4 py-2 font-medium text-right">Hours</th>
                          <th className="px-4 py-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.entries.map((p) => (
                          <tr key={p.id} className="border-t border-slate-800/50">
                            <td className="px-4 py-2 text-slate-300">{p.date}</td>
                            <td className="px-4 py-2 text-slate-400">{p.job_title || "—"}</td>
                            <td className="px-4 py-2 text-right text-slate-300">{p.hours || "—"}</td>
                            <td className="px-4 py-2 text-right text-slate-100">${(p.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
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