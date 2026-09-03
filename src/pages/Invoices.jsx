import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, RefreshCw, FileText } from "lucide-react";
import FormModal from "@/components/FormModal";
import DeleteRecord from "@/components/DeleteRecord";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  draft: "bg-slate-700 text-slate-300 border-slate-600",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  synced: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  overdue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
const emptyForm = () => ({
  invoice_number: `INV-${Date.now().toString().slice(-6)}`,
  client_id: "", project_id: "", issue_date: new Date().toISOString().slice(0, 10),
  due_date: "", status: "draft", subtotal: "", tax: "", notes: "",
});

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [syncingId, setSyncingId] = useState(null);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [data, c, p, user] = await Promise.all([
      base44.entities.Invoice.list("-issue_date"),
      base44.entities.Client.list(),
      base44.entities.Project.list(),
      base44.auth.me().catch(() => null),
    ]);
    setInvoices(data); setClients(c); setProjects(p); setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalOutstanding = invoices.filter((i) => ["sent", "synced", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);

  const create = async () => {
    if (!form.invoice_number || !form.client_id) return;
    const client = clients.find((c) => c.id === form.client_id);
    const project = projects.find((p) => p.id === form.project_id);
    const subtotal = Number(form.subtotal) || 0;
    const tax = Number(form.tax) || 0;
    const num = form.invoice_number;
    await base44.entities.Invoice.create({
      invoice_number: num,
      client_id: form.client_id,
      client_name: client?.name,
      project_id: form.project_id || undefined,
      project_name: project?.name,
      issue_date: form.issue_date,
      due_date: form.due_date || undefined,
      status: form.status,
      subtotal,
      tax,
      total: subtotal + tax,
      notes: form.notes || undefined,
    });
    setForm(emptyForm());
    setShowForm(false);
    toast({ title: "Invoice created", description: num });
    load();
  };

  const syncInvoice = async (inv) => {
    setSyncingId(inv.id);
    try {
      const res = await base44.functions.invoke("syncQuickbooks", { action: "pushInvoice", id: inv.id });
      toast({ title: "Synced to QuickBooks", description: res.data?.docNumber || inv.invoice_number });
      load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} invoices</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} accent="text-amber-300" />
        <SummaryCard label="Paid" value={`$${totalPaid.toLocaleString()}`} accent="text-emerald-300" />
        <SummaryCard label="Draft" value={invoices.filter((i) => i.status === "draft").length} accent="text-slate-300" />
        <SummaryCard label="Overdue" value={invoices.filter((i) => i.status === "overdue").length} accent="text-rose-300" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">QB</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-slate-300">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-300">{inv.client_name}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.project_name}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.due_date}</td>
                  <td className="px-4 py-3 text-right font-medium">${(inv.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[inv.status] || statusStyles.draft}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {syncingId === inv.id ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Syncing…</span>
                    ) : inv.quickbooks_invoice_id ? (
                      <button onClick={() => syncInvoice(inv)} className="text-xs text-emerald-400 hover:underline flex items-center gap-1" title="Re-sync to QuickBooks">
                        <RefreshCw className="w-3 h-3" /> Synced
                      </button>
                    ) : (
                      <button onClick={() => syncInvoice(inv)} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Sync
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && <DeleteRecord entityName="Invoice" recordId={inv.id} recordLabel={inv.invoice_number} onDeleted={load} className="text-slate-500 hover:text-rose-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormModal title="New Invoice" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Create Invoice">
          <Field label="Invoice number"><input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className={inputCls} /></Field>
          <Field label="Client">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputCls}>
              <option value="">— Select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Project (optional)">
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}>
              <option value="">— None —</option>
              {projects.filter((p) => !form.client_id || p.client_id === form.client_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue date"><input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className={inputCls} /></Field>
            <Field label="Due date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Subtotal ($)"><input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
            <Field label="Tax ($)"><input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {["draft", "sent", "synced", "paid", "overdue"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}