import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Globe, Shield, Clock } from "lucide-react";
import FormModal from "@/components/FormModal";
import BulkCsvUpload from "@/components/BulkCsvUpload";
import DeleteRecord from "@/components/DeleteRecord";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", billing_contact_name: "", billing_email: "", billing_phone: "", billing_address: "", terms: "Net 30", default_rate: "", quickbooks_customer_id: "", portal_email: "", portal_access_level: "none", notes: "" });
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [c, inv, user] = await Promise.all([base44.entities.Client.list(), base44.entities.Invoice.list(), base44.auth.me().catch(() => null)]);
    setClients(c);
    setInvoices(inv);
    setMe(user);
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

  const createClient = async () => {
    if (!form.name) return;
    const name = form.name;
    await base44.entities.Client.create({
      name,
      company: form.company || undefined,
      billing_contact_name: form.billing_contact_name || undefined,
      billing_email: form.billing_email || undefined,
      billing_phone: form.billing_phone || undefined,
      billing_address: form.billing_address || undefined,
      terms: form.terms,
      default_rate: form.default_rate ? Number(form.default_rate) : undefined,
      quickbooks_customer_id: form.quickbooks_customer_id || undefined,
      portal_email: form.portal_email || undefined,
      portal_access_level: form.portal_access_level,
      notes: form.notes || undefined,
    });
    setForm({ name: "", company: "", billing_contact_name: "", billing_email: "", billing_phone: "", billing_address: "", terms: "Net 30", default_rate: "", quickbooks_customer_id: "", portal_email: "", portal_access_level: "none", notes: "" });
    setShowForm(false);
    toast({ title: "Client created", description: name });
    load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-slate-500">{clients.length} clients</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <BulkCsvUpload
              entityName="Client"
              onImported={load}
              templateColumns={[
                { key: "name", label: "name", example: "Acme Corp", required: true },
                { key: "company", label: "company", example: "Acme Holdings" },
                { key: "billing_contact_name", label: "billing_contact_name", example: "Jane Doe" },
                { key: "billing_email", label: "billing_email", example: "billing@acme.com" },
                { key: "billing_phone", label: "billing_phone", example: "555-0100" },
                { key: "billing_address", label: "billing_address", example: "123 Main St, Minneapolis, MN" },
                { key: "terms", label: "terms", example: "Net 30" },
                { key: "default_rate", label: "default_rate", example: "150" },
                { key: "quickbooks_customer_id", label: "quickbooks_customer_id", example: "QB-001" },
                { key: "portal_email", label: "portal_email", example: "contact@acme.com" },
                { key: "portal_access_level", label: "portal_access_level", example: "limited" },
                { key: "notes", label: "notes", example: "Key account" },
              ]}
              transform={(r) => ({
                name: r.name,
                company: r.company || undefined,
                billing_contact_name: r.billing_contact_name || undefined,
                billing_email: r.billing_email || undefined,
                billing_phone: r.billing_phone || undefined,
                billing_address: r.billing_address || undefined,
                terms: ["Net 15", "Net 30", "Net 45", "Due on Receipt"].includes(r.terms) ? r.terms : "Net 30",
                default_rate: r.default_rate ? Number(r.default_rate) : undefined,
                quickbooks_customer_id: r.quickbooks_customer_id || undefined,
                portal_email: r.portal_email || undefined,
                portal_access_level: ["none", "limited", "full"].includes(r.portal_access_level) ? r.portal_access_level : "none",
                notes: r.notes || undefined,
              })}
            />
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
              <Plus className="w-4 h-4" /> New Client
            </button>
          </div>
        )}
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
                        {isAdmin && <DeleteRecord entityName="Client" recordId={c.id} recordLabel={c.name} onDeleted={load} className="text-slate-500 hover:text-rose-400" />}
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

      {showForm && (
        <FormModal title="New Client" onClose={() => setShowForm(false)} onSubmit={createClient} submitLabel="Create Client">
          <Field label="Client name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Client or contact name" /></Field>
          <Field label="Company"><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing contact"><input value={form.billing_contact_name} onChange={(e) => setForm({ ...form, billing_contact_name: e.target.value })} className={inputCls} /></Field>
            <Field label="Billing email"><input value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing phone"><input value={form.billing_phone} onChange={(e) => setForm({ ...form, billing_phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Terms">
              <select value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className={inputCls}>
                {["Net 15", "Net 30", "Net 45", "Due on Receipt"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Billing address"><input value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default rate ($)"><input type="number" value={form.default_rate} onChange={(e) => setForm({ ...form, default_rate: e.target.value })} className={inputCls} placeholder="0" /></Field>
            <Field label="QB Customer ID"><input value={form.quickbooks_customer_id} onChange={(e) => setForm({ ...form, quickbooks_customer_id: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Portal email"><input value={form.portal_email} onChange={(e) => setForm({ ...form, portal_email: e.target.value })} className={inputCls} /></Field>
            <Field label="Portal access">
              <select value={form.portal_access_level} onChange={(e) => setForm({ ...form, portal_access_level: e.target.value })} className={inputCls}>
                <option value="none">None</option>
                <option value="limited">Limited</option>
                <option value="full">Full</option>
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}