import React from "react";
import { Clock, User, FileEdit, CheckCircle2, XCircle, Send, AlertCircle, DollarSign, History } from "lucide-react";
import { formatDate, safeDate } from "@/components/utils/CalculationUtils";

const ACTION_META = {
  created: { label: "Created", cls: "bg-slate-700 text-slate-200", icon: FileEdit },
  updated: { label: "Updated", cls: "bg-[#126DFA]/20 text-[#4A9EFF]", icon: FileEdit },
  submitted: { label: "Submitted", cls: "bg-blue-500/20 text-blue-300", icon: Send },
  resubmitted: { label: "Resubmitted", cls: "bg-blue-500/20 text-blue-300", icon: Send },
  approved: { label: "Approved", cls: "bg-emerald-500/20 text-emerald-300", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-rose-500/20 text-rose-300", icon: XCircle },
  changes_requested: { label: "Changes Requested", cls: "bg-amber-500/20 text-amber-300", icon: AlertCircle },
  synced: { label: "Synced to QuickBooks", cls: "bg-cyan-500/20 text-cyan-300", icon: DollarSign },
  paid: { label: "Marked Paid", cls: "bg-emerald-600/25 text-emerald-200", icon: DollarSign },
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "number") return `$${value.toFixed(2)}`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "(none)";
  return String(value);
}

export default function AuditTrail({ expense }) {
  const auditLog = expense?.approval_history || [];

  if (auditLog.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-500" />
        No audit history recorded yet for this expense.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 bg-[#0A1628] border-b border-slate-800 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <History className="w-4 h-4 text-[#4A9EFF]" />
        Audit Trail ({auditLog.length} events)
      </div>
      <div className="p-4 space-y-3">
        {auditLog.map((entry, idx) => {
          const meta = ACTION_META[entry.action] || { label: entry.action, cls: "bg-slate-800 text-slate-300", icon: History };
          const Icon = meta.icon;
          const ts = safeDate(entry.timestamp);

          return (
            <div key={idx} className="relative pl-8">
              {idx > 0 && <div className="absolute left-3 -top-3 w-px h-6 bg-slate-800" />}
              <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${meta.cls}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${meta.cls}`}>{meta.label}</span>
                    {entry.user && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> {entry.user}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ts ? `${formatDate(ts, "short")} ${ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "—"}
                  </span>
                </div>
                {entry.notes && <p className="text-xs text-slate-300 mt-1.5 italic">“{entry.notes}”</p>}
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <div key={field} className="text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400 capitalize">{field.replace(/_/g, " ")}:</span>
                        <span className="text-rose-400 line-through">{formatValue(change?.old)}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-emerald-300 font-medium">{formatValue(change?.new)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
