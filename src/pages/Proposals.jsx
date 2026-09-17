import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Send, Check, X, Calculator, Loader2, MapPin, DollarSign, TrendingUp, Receipt, ArrowRight, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  draft: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  sent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  expired: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
const tierLabels = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };
const money = (v) => v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

function blankForm() {
  return { client_id: "", project_name: "", site_address: "", scope_of_work: "", package_tier: "standard", estimated_sqft: 0, rate_per_sqft: 0, valid_until: "", notes: "" };
}

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [reconcileId, setReconcileId] = useState(null);
  const [actualSqft, setActualSqft] = useState("");
  const [busy, setBusy] = useState(null);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [p, c, u] = await Promise.all([
      base44.entities.Proposal.list("-created_date", 100).catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setProposals(p); setClients(c); setMe(u); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const estimatedTotal = useMemo(() => (Number(form.estimated_sqft) || 0) * (Number(form.rate_per_sqft) || 0), [form.estimated_sqft, form.rate_per_sqft]);
  const nextNumber = () => `PROP-${new Date().getFullYear()}-${String(proposals.length + 1).padStart(4, "0")}`;

  const create = async () => {
    if (!form.client_id || !form.site_address) { toast({ title: "Client and site address required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      await base44.entities.Proposal.create({
        ...form,
        proposal_number: nextNumber(),
        client_name: client?.name || "",
        estimated_total: estimatedTotal,
        issue_date: new Date().toISOString().slice(0, 10),
        status: "draft",
      });
      toast({ title: "Proposal created", description: nextNumber() });
      setShowCreate(false); setForm(blankForm());
      load();
    } catch (e) { toast({ title: "Create failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const setStatus = async (p, status) => {
    setBusy(p.id);
    try { await base44.entities.Proposal.update(p.id, { status }); load(); }
    catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  const accept = async (p) => {
    setBusy(p.id);
    try {
      const project = await base44.entities.Project.create({
        name: p.project_name || `${p.client_name} — 3D Scan`,
        client_id: p.client_id, client_name: p.client_name, status: "active",
      });
      const job = await base44.entities.Job.create({
        title: p.project_name || `${p.client_name} — 3D Scan`,
        project_id: project.id, project_name: project.name,
        client_id: p.client_id, client_name: p.client_name,
        site_address: p.site_address,
        billable_rate_type: "per_sqft", billable_rate: p.rate_per_sqft,
        status: "scheduled",
      });
      await base44.entities.Proposal.update(p.id, { status: "accepted", converted_project_id: project.id, converted_job_id: job.id });
      toast({ title: "Proposal accepted", description: "Project + job created from this proposal." });
      load();
    } catch (e) { toast({ title: "Convert failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  const reconcile = async (p) => {
    const sqft = Number(actualSqft);
    if (!sqft) { toast({ title: "Enter actual sqft", variant: "destructive" }); return; }
    setBusy(p.id);
    try {
      const actual_total = sqft * (p.rate_per_sqft || 0);
      await base44.entities.Proposal.update(p.id, { actual_sqft: sqft, actual_total });
      toast({ title: "Reconciled", description: `${sqft.toLocaleString()} sqft → ${money(actual_total)}` });
      setReconcileId(null); setActualSqft("");
      load();
    } catch (e) { toast({ title: "Reconcile failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  const createInvoice = async (p) => {
    setBusy(p.id);
    try {
      const sqft = p.actual_sqft || p.estimated_sqft;
      const total = p.actual_total != null ? p.actual_total : p.estimated_total;
      const invNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const created = await base44.entities.Invoice.create({
        invoice_number: invNumber,
        client_id: p.client_id, client_name: p.client_name,
        project_name: p.project_name,
        job_ids: p.converted_job_id ? [p.converted_job_id] : [],
        status: "draft",
        issue_date: new Date().toISOString().slice(0, 10),
        line_items: [{ description: `${p.project_name || "3D Scan"} — ${Number(sqft).toLocaleString()} sqft @ ${money(p.rate_per_sqft)}/sqft`, quantity: sqft, unit_price: p.rate_per_sqft, amount: total }],
        subtotal: total, total,
      });
      try { await base44.functions.invoke("notifyClientInvoiceSent", { invoice_id: created?.id || "" }); } catch {}
      toast({ title: "Invoice created", description: invNumber });
      load();
    } catch (e) { toast({ title: "Invoice failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  const variance = (p) => (p.actual_total != null ? p.actual_total - p.estimated_total : null);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Calculator className="w-5 h-5 text-cyan-400" /> Proposals & Quotes</h1>
          <p className="text-sm text-slate-500">{proposals.length} proposals · per-sqft estimator with actual-vs-estimated reconciliation</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Proposal
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : proposals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Calculator className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No proposals yet.</div>
          {isAdmin && <div className="text-xs text-slate-500 mt-1">Create a quote with the per-sqft estimator, send it, and convert accepted proposals into projects + invoices.</div>}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[1040px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Proposal</th>
                <th className="px-4 py-3 font-medium">Client / Site</th>
                <th className="px-4 py-3 font-medium text-right">Est. sqft</th>
                <th className="px-4 py-3 font-medium text-right">Rate/sqft</th>
                <th className="px-4 py-3 font-medium text-right">Est. Total</th>
                <th className="px-4 py-3 font-medium text-right">Actual</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const v = variance(p);
                return (
                  <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-300">{p.proposal_number}</div>
                      <div className="text-xs text-slate-500">{tierLabels[p.package_tier] || p.package_tier}{p.valid_until ? ` · valid until ${new Date(p.valid_until).toLocaleDateString()}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{p.client_name || "—"}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.site_address}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{Number(p.estimated_sqft).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{money(p.rate_per_sqft)}</td>
                    <td className="px-4 py-3 text-right text-slate-200 font-medium">{money(p.estimated_total)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{p.actual_sqft ? `${Number(p.actual_sqft).toLocaleString()} / ${money(p.actual_total)}` : "—"}</td>
                    <td className={`px-4 py-3 text-right ${v == null ? "text-slate-600" : v >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {v == null ? "—" : `${v >= 0 ? "+" : ""}${money(v)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[p.status] || statusStyles.draft}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {busy === p.id && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                        {isAdmin && p.status === "draft" && (
                          <button onClick={() => setStatus(p, "sent")} title="Send to client" className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-1 hover:bg-blue-500/25"><Send className="w-3 h-3" /> Send</button>
                        )}
                        {isAdmin && p.status === "sent" && (
                          <>
                            <button onClick={() => accept(p)} title="Accept & convert to project" className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1 hover:bg-emerald-500/25"><Check className="w-3 h-3" /> Accept</button>
                            <button onClick={() => setStatus(p, "rejected")} title="Reject" className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:bg-slate-700"><X className="w-3 h-3" /></button>
                          </>
                        )}
                        {isAdmin && p.status === "accepted" && (
                          <>
                            {reconcileId === p.id ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={actualSqft} onChange={(e) => setActualSqft(e.target.value)} placeholder="Actual sqft" className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" />
                                <button onClick={() => reconcile(p)} className="px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 text-xs font-medium hover:bg-cyan-400">Save</button>
                                <button onClick={() => { setReconcileId(null); setActualSqft(""); }} className="px-1.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700"><X className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => { setReconcileId(p.id); setActualSqft(p.actual_sqft || ""); }} title="Enter actual sqft" className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1 hover:bg-slate-700"><TrendingUp className="w-3 h-3" /> Reconcile</button>
                            )}
                            <button onClick={() => createInvoice(p)} title="Create invoice" className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1 hover:bg-cyan-500/25"><Receipt className="w-3 h-3" /> Invoice</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><Calculator className="w-4 h-4 text-cyan-400" /> New Proposal</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client *</label>
                <select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} className={inputCls}>
                  <option value="">— Select client —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project name</label>
                <input value={form.project_name} onChange={(e) => set("project_name", e.target.value)} className={inputCls} placeholder="Warehouse 3D Scan" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Site address *</label>
                <input value={form.site_address} onChange={(e) => set("site_address", e.target.value)} className={inputCls} placeholder="123 Main St, Minneapolis, MN" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Scope of work</label>
                <textarea value={form.scope_of_work} onChange={(e) => set("scope_of_work", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Matterport scan + floorplan deliverable" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Package tier</label>
                  <select value={form.package_tier} onChange={(e) => set("package_tier", e.target.value)} className={inputCls}>
                    {Object.entries(tierLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valid until</label>
                  <input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estimated sqft *</label>
                  <input type="number" value={form.estimated_sqft} onChange={(e) => set("estimated_sqft", e.target.value)} className={inputCls} placeholder="15000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rate per sqft *</label>
                  <input type="number" value={form.rate_per_sqft} onChange={(e) => set("rate_per_sqft", e.target.value)} className={inputCls} placeholder="0.15" />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                <span className="text-xs text-cyan-200 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Estimated total</span>
                <span className="text-lg font-semibold text-cyan-300">{money(estimatedTotal)}</span>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={create} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}