import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Globe, Shield, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [c, inv] = await Promise.all([base44.entities.Client.list(), base44.entities.Invoice.list()]);
    setClients(c);
    setInvoices(inv);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const { toast } = useToast();
  const [editClient, setEditClient] = useState(null);
  const [portalForm, setPortalForm] = useState({ portal_email: "", portal_access_level: "none" });
  const [hoursClient, setHoursClient] = useState(null);
  const [hoursForm, setHoursForm] = useState({ opening_time: "", closing_time: "", access_notes: "" });

  const openHours = (c) => {
    setHoursClient(c);
    setHoursForm({ opening_time: c.opening_time || "", closing_time: c.closing_time || "", access_notes: c.access_notes || "" });
  };
  const saveHours = async () => {
    await base44.entities.Client.update(hoursClient.id, hoursForm);
    toast({ title: "Site hours updated", description: hoursClient.name });
    setHoursClient(null);
    load();
  };

  const openEdit = (c) => {
    setEditClient(c);
    setPortalForm({ portal_email: c.portal_email || "", portal_access_level: c.portal_access_level || "none" });
  };
  const savePortal = async () => {
    await base44.entities.Client.update(editClient.id, portalForm);
    toast({ title: "Portal access updated", description: `${editClient.name} — ${portalForm.portal_access_level}` });
    setEditClient(null);
    load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} clients</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-auto">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 bg-slate-900 border-b border-slate-800">
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Name</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Company</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Billing Email</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Billing Phone</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Terms</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">QB Customer ID</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Default Rate</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Invoices</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Outstanding</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Site Hours</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Portal</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const cInv = invoices.filter((i) => i.client_id === c.id);
                const outstanding = cInv.filter((i) => ["sent", "synced", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
                return (
                  <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 align-top">
                    <td className="px-3 py-2.5 font-medium text-slate-200 whitespace-nowrap">{c.name}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{c.company || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{c.billing_email || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{c.billing_phone || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{c.terms || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono whitespace-nowrap">{c.quickbooks_customer_id || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-right">{c.default_rate != null ? `$${c.default_rate}` : "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-right">{cInv.length}</td>
                    <td className="px-3 py-2.5 text-amber-300 whitespace-nowrap text-right font-medium">{outstanding ? `$${outstanding.toLocaleString()}` : "$0"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {c.opening_time && c.closing_time ? <span className="text-slate-300">{c.opening_time}–{c.closing_time}</span> : <span className="text-slate-600">Not set</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${c.portal_access_level === "full" ? "bg-emerald-500/15 text-emerald-300" : c.portal_access_level === "limited" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700 text-slate-400"}`}>{c.portal_access_level || "none"}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openHours(c)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Hours</button>
                        <button onClick={() => openEdit(c)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Manage</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr><td colSpan={12} className="px-3 py-10 text-center text-slate-500">No clients yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Portal access — {editClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Portal login email</label>
              <input
                type="email"
                value={portalForm.portal_email}
                onChange={(e) => setPortalForm((f) => ({ ...f, portal_email: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="client@example.com"
              />
              <p className="text-[11px] text-slate-500 mt-1">The client logs in with this email to access their portal.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Access level</label>
              <select
                value={portalForm.portal_access_level}
                onChange={(e) => setPortalForm((f) => ({ ...f, portal_access_level: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="none">None — no portal access</option>
                <option value="limited">Limited — view work order status only</option>
                <option value="full">Full — view work orders, projects & invoices</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditClient(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={savePortal} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400">Save</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hoursClient} onOpenChange={(v) => !v && setHoursClient(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /> Site hours — {hoursClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Opening time</label>
                <input type="time" value={hoursForm.opening_time} onChange={(e) => setHoursForm((f) => ({ ...f, opening_time: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Closing time</label>
                <input type="time" value={hoursForm.closing_time} onChange={(e) => setHoursForm((f) => ({ ...f, closing_time: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Access notes</label>
              <textarea value={hoursForm.access_notes} onChange={(e) => setHoursForm((f) => ({ ...f, access_notes: e.target.value }))} rows={2} placeholder="e.g. Call 30 min before arrival, check in at front desk" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setHoursClient(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={saveHours} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400">Save</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}