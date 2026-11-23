import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus, X, Loader2, TrendingUp, Trophy, XCircle, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  new: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  qualified: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  proposal_sent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  proposal: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  negotiation: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  won: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  lost: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};
const money = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

function blankLead() {
  return { name: "", company: "", email: "", phone: "", source: "referral", status: "new", estimated_value: 0, site_address: "", notes: "", next_follow_up: "", lost_reason: "" };
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blankLead());
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);
  const [lostReasonFor, setLostReasonFor] = useState(null);
  const [lostReason, setLostReason] = useState("");
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [l, c, u] = await Promise.all([
      base44.entities.Lead.list("-created_date", 200).catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setLeads(l); setClients(c); setMe(u); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(blankLead()); setEditId(null); setShowForm(true); };
  const openEdit = (lead) => { setForm({ ...blankLead(), ...lead }); setEditId(lead.id); setShowForm(true); };

  const save = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editId) await base44.entities.Lead.update(editId, form);
      else await base44.entities.Lead.create(form);
      toast({ title: editId ? "Lead updated" : "Lead created" });
      setShowForm(false); setForm(blankLead()); setEditId(null);
      load();
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const setStatus = async (lead, status) => {
    const patch = { status };
    if (status === "won") patch.won_date = new Date().toISOString().slice(0, 10);
    if (status === "lost" && lostReasonFor?.id === lead.id) patch.lost_reason = lostReason;
    try { await base44.entities.Lead.update(lead.id, patch); load(); }
    catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  const convertToClient = async (lead) => {
    setConverting(lead.id);
    try {
      const client = await base44.entities.Client.create({
        name: lead.company || lead.name,
        company: lead.company || "",
        billing_contact_name: lead.name,
        billing_email: lead.email || "",
        billing_phone: lead.phone || "",
      });
      await base44.entities.Lead.update(lead.id, { status: "won", won_date: new Date().toISOString().slice(0, 10), converted_client_id: client.id });
      toast({ title: "Lead won → client created", description: client.name });
      setConverting(null);
      load();
    } catch (e) { toast({ title: "Convert failed", description: e.message, variant: "destructive" }); setConverting(null); }
  };

  const normStatus = (l) => (l.status === "proposal" ? "proposal_sent" : l.status || l.stage || "new");
  const filtered = filter === "all" ? leads : leads.filter((l) => normStatus(l) === filter);

  const analytics = useMemo(() => {
    const open = leads.filter((l) => ["new", "qualified", "proposal_sent", "negotiation"].includes(normStatus(l)));
    const won = leads.filter((l) => normStatus(l) === "won");
    const lost = leads.filter((l) => normStatus(l) === "lost");
    const pipelineValue = open.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);
    const wonValue = won.reduce((s, l) => s + (Number(l.estimated_value) || 0), 0);
    const closed = won.length + lost.length;
    const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
    return { openCount: open.length, pipelineValue, wonCount: won.length, wonValue, lostCount: lost.length, winRate };
  }, [leads]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Target className="w-5 h-5 text-cyan-400" /> Leads & Pipeline</h1>
          <p className="text-sm text-slate-500">{leads.length} leads · {analytics.openCount} open · {analytics.winRate}% win rate</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Lead
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="Open leads" value={analytics.openCount} icon={Target} accent="text-cyan-400" />
        <Stat label="Pipeline value" value={money(analytics.pipelineValue)} icon={DollarSign} accent="text-amber-400" />
        <Stat label="Won" value={analytics.wonCount} icon={Trophy} accent="text-emerald-400" />
        <Stat label="Won value" value={money(analytics.wonValue)} icon={TrendingUp} accent="text-emerald-400" />
        <Stat label="Lost" value={analytics.lostCount} icon={XCircle} accent="text-rose-400" />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["all", "new", "qualified", "proposal_sent", "negotiation", "won", "lost"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === s ? "bg-cyan-500 text-slate-950" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"}`}>{s.replace("_", " ")}</button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium text-right">Est. value</th>
              <th className="px-4 py-3 font-medium">Next follow-up</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const st = normStatus(l);
              return (
              <tr key={l.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{l.name || l.contact_name || "Enterprise Inquiry"}</div>
                  <div className="text-xs text-slate-500">{l.email}{l.phone ? ` · ${l.phone}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-400">{l.company || "—"}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{String(l.source || "website").replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-right text-slate-200">{money(l.estimated_value)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{l.next_follow_up ? new Date(l.next_follow_up).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[st] || statusStyles.new}`}>{st.replace(/_/g, " ")}</span></td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1.5">
                      {["new", "qualified"].includes(st) && (
                        <button onClick={() => setStatus(l, "proposal_sent")} className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/25">Sent</button>
                      )}
                      {["proposal_sent", "negotiation"].includes(st) && (
                        <>
                          <button onClick={() => convertToClient(l)} disabled={converting === l.id} className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs hover:bg-emerald-500/25 disabled:opacity-50">{converting === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Won"}</button>
                          <button onClick={() => { setLostReasonFor(l); setLostReason(""); }} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:bg-slate-700">Lost</button>
                        </>
                      )}
                      <button onClick={() => openEdit({ ...l, name: l.name || l.contact_name || "", status: st })} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700">Edit</button>
                    </div>
                  )}
                </td>
              </tr>
            );})}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">No leads in this view.</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /> {editId ? "Edit Lead" : "New Lead"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Contact name" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Company</label><input value={form.company} onChange={(e) => set("company", e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Source</label>
                  <select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}>
                    {["referral", "website", "outbound", "event", "other"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-slate-400 mb-1">Est. value</label><input type="number" value={form.estimated_value} onChange={(e) => set("estimated_value", Number(e.target.value))} className={inputCls} /></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Site address</label><input value={form.site_address} onChange={(e) => set("site_address", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Next follow-up</label><input type="date" value={form.next_follow_up} onChange={(e) => set("next_follow_up", e.target.value)} className={inputCls} /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Notes</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lostReasonFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLostReasonFor(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold mb-2">Mark as lost</h3>
            <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={3} placeholder="Loss reason (price, timing, competitor...)" className={`${inputCls} resize-none mb-3`} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setLostReasonFor(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={() => { setStatus(lostReasonFor, "lost"); setLostReasonFor(null); }} className="px-4 py-2 rounded-lg bg-rose-500 text-slate-950 font-medium text-sm hover:bg-rose-400">Mark lost</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mb-2 ${accent}`}><Icon className="w-4 h-4" /></div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}