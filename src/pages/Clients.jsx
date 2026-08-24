import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Mail, FileText } from "lucide-react";

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
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => {
            const cInv = invoices.filter((i) => i.client_id === c.id);
            const outstanding = cInv.filter((i) => ["sent", "synced", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
            return (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate">{c.company}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  {c.billing_email && (
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" />{c.billing_email}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Terms</span>
                    <span>{c.terms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">QB Customer</span>
                    <span className="font-mono">{c.quickbooks_customer_id || "—"}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FileText className="w-3.5 h-3.5" /> {cInv.length} invoices
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Outstanding</div>
                    <div className="text-sm font-medium text-amber-300">${outstanding.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}