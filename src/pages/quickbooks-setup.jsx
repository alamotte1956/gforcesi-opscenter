import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Settings, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function QuickBooksSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ quickbooks: false, sheets: false });
  const [testing, setTesting] = useState(false);

  const checkStatus = async () => {
    setTesting(true);
    try {
      const res = await base44.functions.invoke("checkConnections", {});
      setStatus(res?.data || { quickbooks: false, sheets: false });
      toast({
        title: res?.data?.quickbooks ? "QuickBooks Online Connected" : "QuickBooks Not Connected",
        description: res?.data?.quickbooks
          ? "Shared OAuth token is active and ready for two-way sync."
          : "Authorize the QuickBooks connector inside your Base44 Dashboard → Connectors.",
      });
    } catch (e) {
      toast({ title: "Status check failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setTesting(false);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      <div>
        <Link to="/finance" className="text-xs text-[#4A9EFF] hover:underline inline-flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Financials
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#4A9EFF]" /> QuickBooks Online OAuth Setup
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          G-Force SI uses Base44&apos;s encrypted OAuth connector vault for Intuit QuickBooks Online two-way synchronization.
        </p>
      </div>

      <div className={`rounded-xl p-5 border ${
        status.quickbooks ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {status.quickbooks ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <h2 className="text-base font-semibold text-white">
                {loading ? "Checking QuickBooks connection..." : status.quickbooks ? "QuickBooks Online is Connected" : "QuickBooks Online Not Yet Authorized"}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {status.quickbooks
                  ? "Automatic OAuth token refresh is active for Invoices, Expenses, 1099 Payouts, and Chart of Accounts."
                  : "Authorize the shared 'quickbooks' connector in Base44 to enable two-way accounting."}
              </p>
            </div>
          </div>
          <button
            onClick={checkStatus}
            disabled={testing}
            className="px-3.5 py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Verify Connection
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4A9EFF]" /> Production Setup Checklist
        </h3>
        <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside">
          <li>Open your Base44 App Dashboard (<code className="text-cyan-300">gforcesi.base44.app</code>) and navigate to <strong>Settings → Connectors → QuickBooks Online</strong>.</li>
          <li>Sign in with your Intuit QuickBooks Online Administrator account and select the <strong>G-Force SI</strong> company file.</li>
          <li>Verify the optional environment variable <code className="text-cyan-300">QUICKBOOKS_SANDBOX=false</code> for live production accounting.</li>
          <li>Return here, click <strong>Verify Connection</strong>, and configure your GL accounts in <Link to="/quickbooks-mapping" className="text-[#4A9EFF] underline">Chart of Accounts Mapping</Link>.</li>
        </ol>
        <div className="pt-2 flex flex-wrap gap-2">
          <Link to="/quickbooks-mapping" className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white">
            Open Account Mapping
          </Link>
          <a
            href="https://app.qbo.intuit.com"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5"
          >
            Open QuickBooks Online <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
