import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, RefreshCw, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function QuickBooksSyncErrors() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [failedExpenses, setFailedExpenses] = useState([]);
  const [failedInvoices, setFailedInvoices] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [retryingId, setRetryingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [exp, inv, logs] = await Promise.all([
        base44.entities.Expense.list("-date", 500).catch(() => []),
        base44.entities.Invoice.list("-issue_date", 500).catch(() => []),
        base44.entities.SyncLog.list("-timestamp", 100).catch(() => []),
      ]);
      setFailedExpenses((exp || []).filter((e) => e.quickbooks_sync_error));
      setFailedInvoices((inv || []).filter((i) => i.quickbooks_sync_error));
      setErrorLogs((logs || []).filter((l) => l.status === "error" || l.status === "failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const retryExpense = async (expense) => {
    setRetryingId(expense.id);
    try {
      await base44.entities.Expense.update(expense.id, { quickbooks_sync_error: "" });
      const res = await base44.functions.invoke("syncQuickbooks", { action: "pushExpenses", ids: [expense.id] });
      const r = res?.data?.results?.[0];
      if (r && !r.ok) throw new Error(r.error || "Sync retry failed");
      toast({ title: "Expense synced", description: expense.description });
      await load();
    } catch (e) {
      toast({ title: "Retry failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const retryInvoice = async (invoice) => {
    setRetryingId(invoice.id);
    try {
      await base44.entities.Invoice.update(invoice.id, { quickbooks_sync_error: "" });
      const res = await base44.functions.invoke("exportInvoiceToQuickBooks", { invoiceId: invoice.id });
      if (res?.data?.error) throw new Error(res.data.error);
      toast({ title: "Invoice synced", description: invoice.invoice_number });
      await load();
    } catch (e) {
      toast({ title: "Retry failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" /></div>;
  }

  const totalErrors = failedExpenses.length + failedInvoices.length + errorLogs.length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <Link to="/finance" className="text-xs text-[#4A9EFF] hover:underline inline-flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Financials
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-amber-400" /> QuickBooks Sync Error Queue
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect failed QuickBooks Online API pushes and re-run them once account mappings or OAuth tokens are resolved.
        </p>
      </div>

      {totalErrors === 0 ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-white">All Clear — Zero QuickBooks Sync Errors</h2>
          <p className="text-xs text-slate-400 mt-1">Every expense, invoice, and payout sync succeeded cleanly.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {failedExpenses.length > 0 && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-rose-300">
                Failed Expenses ({failedExpenses.length})
              </div>
              <div className="divide-y divide-slate-800">
                {failedExpenses.map((e) => (
                  <div key={e.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {e.description} · ${Number(e.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-rose-400 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {e.quickbooks_sync_error}
                      </div>
                    </div>
                    <button
                      disabled={retryingId === e.id}
                      onClick={() => retryExpense(e)}
                      className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {retryingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Retry Sync
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {failedInvoices.length > 0 && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-rose-300">
                Failed Invoices ({failedInvoices.length})
              </div>
              <div className="divide-y divide-slate-800">
                {failedInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        Invoice {inv.invoice_number} · ${Number(inv.total || inv.subtotal || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-rose-400 mt-0.5">{inv.quickbooks_sync_error}</div>
                    </div>
                    <button
                      disabled={retryingId === inv.id}
                      onClick={() => retryInvoice(inv)}
                      className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {retryingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Retry Invoice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorLogs.length > 0 && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-amber-300">
                Historical Error Logs ({errorLogs.length})
              </div>
              <div className="divide-y divide-slate-800">
                {errorLogs.map((l) => (
                  <div key={l.id} className="p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-200">{l.entity_label || l.sync_type}</span>
                      <span className="text-rose-400 ml-2">{l.message}</span>
                    </div>
                    <span className="text-slate-500">{l.timestamp ? new Date(l.timestamp).toLocaleString() : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
