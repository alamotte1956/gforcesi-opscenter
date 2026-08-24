import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, RefreshCw, FileText } from "lucide-react";

const statusStyles = {
  draft: "bg-slate-700 text-slate-300 border-slate-600",
  sent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  synced: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  overdue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.Invoice.list("-issue_date");
    setInvoices(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalOutstanding = invoices
    .filter((i) => ["sent", "synced", "overdue"].includes(i.status))
    .reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-slate-500">{invoices.length} invoices</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
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
                    {inv.quickbooks_invoice_id ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Synced</span>
                    ) : (
                      <button className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Sync
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}