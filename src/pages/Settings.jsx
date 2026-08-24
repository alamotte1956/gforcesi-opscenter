import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, RefreshCw, Link2, Unlink, Zap, SlidersHorizontal } from "lucide-react";

export default function Settings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [connected, setConnected] = useState(false);

  const load = async () => {
    const data = await base44.entities.SyncLog.list("-timestamp");
    setLogs(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const statusIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-rose-400" />,
    pending: <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />,
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <h1 className="text-xl font-semibold mb-1">QuickBooks Settings</h1>
      <p className="text-sm text-slate-500 mb-5">Integration, mappings & sync log</p>

      {/* Connection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-medium">QuickBooks Online</div>
              <div className="text-sm text-slate-500">
                {connected ? "Connected to GForceSI company file" : "Not connected — OAuth 2.0 required"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConnected(!connected)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              connected ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
          >
            {connected ? <><Unlink className="w-4 h-4" /> Disconnect</> : <><Link2 className="w-4 h-4" /> Connect</>}
          </button>
        </div>
      </div>

      {/* Sync mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Sync Mode</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setAutoSync(true)}
            className={`text-left p-4 rounded-lg border transition-colors ${autoSync ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
          >
            <Zap className={`w-5 h-5 mb-2 ${autoSync ? "text-cyan-400" : "text-slate-500"}`} />
            <div className="font-medium text-sm">Auto-sync</div>
            <div className="text-xs text-slate-500 mt-1">Invoices & payroll sync automatically when ready</div>
          </button>
          <button
            onClick={() => setAutoSync(false)}
            className={`text-left p-4 rounded-lg border transition-colors ${!autoSync ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
          >
            <SlidersHorizontal className={`w-5 h-5 mb-2 ${!autoSync ? "text-cyan-400" : "text-slate-500"}`} />
            <div className="font-medium text-sm">Manual review</div>
            <div className="text-xs text-slate-500 mt-1">Review each item, then approve sync to QuickBooks</div>
          </button>
        </div>
      </div>

      {/* Mapping tables */}
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {[
          { title: "Clients → QB Customers", count: 2 },
          { title: "Services → QB Products", count: 4 },
          { title: "Contractors → QB Vendors", count: 4 },
        ].map((m) => (
          <div key={m.title} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-300">{m.title}</div>
            <div className="text-2xl font-semibold mt-2 text-cyan-400">{m.count}</div>
            <div className="text-xs text-slate-500 mt-1">mappings configured</div>
          </div>
        ))}
      </div>

      {/* Sync log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Sync Log</h2>
          <button onClick={load} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                {statusIcon[log.status]}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{log.entity_label || log.entity_type}</div>
                  <div className="text-xs text-slate-500">{log.message}</div>
                </div>
                <div className="text-xs text-slate-500 shrink-0">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</div>
                {log.status === "error" && (
                  <button className="text-xs text-cyan-400 hover:underline">Retry</button>
                )}
              </div>
            ))}
            {logs.length === 0 && <div className="text-center text-slate-500 text-sm py-8">No sync events yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}