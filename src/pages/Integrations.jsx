import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plug, FileSpreadsheet, Calendar, Receipt, CheckCircle2, XCircle,
  Loader2, ExternalLink, AlertCircle, RefreshCw, Link2, Unlink, Download, Database,
} from "lucide-react";
import CredentialsHelp from "@/components/CredentialsHelp";
import { useToast } from "@/components/ui/use-toast";

const SHEETS_CONNECTOR_ID = "6a78afeef15cdc646169800c";

export default function Integrations() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState({ sheets: false, quickbooks: false, calendar: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "sheets-connect" | "sheets-disconnect" | ""
  const [qbBusy, setQbBusy] = useState("");
  const [qbaseBusy, setQbaseBusy] = useState(false);
  const [qbaseResult, setQbaseResult] = useState(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke("checkConnections", {});
      setStatus(res.data);
    } catch {
      setStatus({ sheets: false, quickbooks: false, calendar: false });
    }
  };

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await fetchStatus();
      }
      setLoading(false);
    })();
  }, []);

  const connectSheets = async () => {
    setBusy("sheets-connect");
    try {
      const url = await base44.connectors.connectAppUser(SHEETS_CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchStatus();
          setBusy("");
        }
      }, 500);
    } catch (e) {
      setBusy("");
    }
  };

  const disconnectSheets = async () => {
    setBusy("sheets-disconnect");
    try {
      await base44.connectors.disconnectAppUser(SHEETS_CONNECTOR_ID);
      await fetchStatus();
    } catch {}
    setBusy("");
  };

  const pullCustomers = async () => {
    setQbBusy("customers");
    try {
      const res = await base44.functions.invoke("syncQuickbooks", { action: "pullCustomers" });
      const d = res.data || {};
      toast({ title: "Customers pulled", description: `${d.pulled || 0} from QuickBooks (${d.created || 0} new, ${d.updated || 0} updated)` });
    } catch (e) {
      toast({ title: "Pull failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally { setQbBusy(""); }
  };

  const pullInvoiceStatus = async () => {
    setQbBusy("invoices");
    try {
      const res = await base44.functions.invoke("syncQuickbooks", { action: "pullInvoiceStatus" });
      const d = res.data || {};
      toast({ title: "Invoice status updated", description: `${d.paid || 0} marked paid` });
    } catch (e) {
      toast({ title: "Update failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally { setQbBusy(""); }
  };

  const pullQuickbase = async () => {
    setQbaseBusy(true); setQbaseResult(null);
    try {
      const res = await base44.functions.invoke("pullFromQuickbase", { targets: ["client", "project", "contractor", "job"] });
      const d = res.data || {};
      if (d.error) { toast({ title: "Quickbase pull failed", description: d.error, variant: "destructive" }); }
      else { setQbaseResult(d.results || {}); toast({ title: "Quickbase pull complete" }); }
    } catch (e) {
      toast({ title: "Quickbase pull failed", description: e.message, variant: "destructive" });
    } finally { setQbaseBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Plug className="w-5 h-5 text-cyan-400" /> Integrations
        </h1>
        <p className="text-sm text-slate-500">Connect the services GForceSI OpsCenter uses. Admin access required.</p>
      </div>

      <div className="space-y-4">
        {/* Google Sheets — per-admin app-user connection */}
        <IntegrationCard
          icon={FileSpreadsheet}
          accent="text-emerald-400"
          bg="bg-emerald-500/10"
          title="Google Sheets"
          subtitle="Per-admin · each admin connects their own Google account"
          connected={status.sheets}
          busy={busy === "sheets-connect" || busy === "sheets-disconnect"}
        >
          {status.sheets ? (
            <button
              onClick={disconnectSheets}
              disabled={!!busy}
              className="px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-rose-500/40 hover:text-rose-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy === "sheets-disconnect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectSheets}
              disabled={!!busy}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 text-slate-950 text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy === "sheets-connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Connect
            </button>
          )}
        </IntegrationCard>

        {/* Google Calendar — requires a workspace connector (not registered) */}
        <IntegrationCard
          icon={Calendar}
          accent="text-blue-400"
          bg="bg-blue-500/10"
          title="Google Calendar"
          subtitle="Per-admin · sync scheduled jobs to your personal calendar"
          connected={false}
          unavailable
        >
          <span className="text-xs text-amber-300/90 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Requires setup — ask the app builder to register a connector
          </span>
        </IntegrationCard>

        {/* QuickBooks — shared, status-only */}
        <IntegrationCard
          icon={Receipt}
          accent="text-cyan-400"
          bg="bg-cyan-500/10"
          title="QuickBooks Online"
          subtitle="Shared app-wide · connected by the app builder"
          connected={status.quickbooks}
          statusOnly
        >
          {status.quickbooks ? (
            <div className="flex items-center gap-2">
              <button onClick={pullCustomers} disabled={!!qbBusy} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300 flex items-center gap-1.5 disabled:opacity-50">
                {qbBusy === "customers" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Pull customers
              </button>
              <button onClick={pullInvoiceStatus} disabled={!!qbBusy} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300 flex items-center gap-1.5 disabled:opacity-50">
                {qbBusy === "invoices" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Update invoice status
              </button>
            </div>
          ) : (
            <span className="text-xs text-amber-300/90 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Not connected — connect it from the setup chat
            </span>
          )}
        </IntegrationCard>

        {/* Quickbase — pull from Quickbase tables */}
        <IntegrationCard
          icon={Database}
          accent="text-indigo-400"
          bg="bg-indigo-500/10"
          title="Quickbase"
          subtitle="Pull · import Clients, Projects, Contractors & Jobs from Quickbase tables"
          connected={false}
        >
          <div className="flex flex-col items-end gap-2">
            <button onClick={pullQuickbase} disabled={qbaseBusy} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 hover:border-indigo-500/40 hover:text-indigo-300 flex items-center gap-1.5 disabled:opacity-50">
              {qbaseBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Pull from Quickbase
            </button>
            {qbaseResult && (
              <div className="text-[10px] text-slate-400 text-right space-y-0.5">
                {Object.entries(qbaseResult).map(([k, v]) => (
                  <div key={k}>{k}: {v.error ? <span className="text-rose-400">{v.error}</span> : `${v.created || 0} new · ${v.updated || 0} updated${v.errors ? ` · ${v.errors} err` : ""}`}</div>
                ))}
              </div>
            )}
            <span className="text-[10px] text-amber-300/80 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Needs QUICKBASE_REALM, token & table IDs in Secrets</span>
          </div>
        </IntegrationCard>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={fetchStatus}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh status
        </button>
        <span className="text-xs text-slate-500">Signed in as {user?.email || "—"}</span>
      </div>

      <div className="mt-5">
        <CredentialsHelp />
      </div>
    </div>
  );
}

function IntegrationCard({ icon: Icon, accent, bg, title, subtitle, connected, busy, unavailable, statusOnly, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg ${bg} flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-100">{title}</span>
          {connected ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : unavailable ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <XCircle className="w-3.5 h-3.5" /> Unavailable
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <XCircle className="w-3.5 h-3.5" /> Not connected
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}