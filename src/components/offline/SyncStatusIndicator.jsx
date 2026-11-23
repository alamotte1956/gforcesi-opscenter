import React from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { getPendingSyncCount, getFailedSyncCount } from "./SyncStatusManager";

export default function SyncStatusIndicator({ isOnline = true, pendingCount, failedCount }) {
  const pending = pendingCount ?? getPendingSyncCount();
  const failed = failedCount ?? getFailedSyncCount();

  if (!isOnline) {
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
        <WifiOff className="w-3 h-3 mr-1" />
        Offline Mode
      </Badge>
    );
  }

  if (failed > 0) {
    return (
      <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {failed} failed
      </Badge>
    );
  }

  if (pending > 0) {
    return (
      <Badge className="bg-[#126DFA]/20 text-[#4A9EFF] border border-[#126DFA]/40">
        <Clock className="w-3 h-3 mr-1" />
        {pending} queued
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Synced
    </Badge>
  );
}

export function SyncStatusAlert({ pending = 0, failed = 0, onRetry }) {
  if (pending === 0 && failed === 0) return null;

  return (
    <div className="space-y-2">
      {failed > 0 && (
        <Alert className="border-rose-500/40 bg-rose-950/50 text-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <AlertDescription>
            <p className="font-semibold">{failed} operation(s) failed to sync</p>
            <p className="text-xs text-rose-300/80 mt-0.5">Verify network connectivity and retry.</p>
            {onRetry && (
              <button onClick={onRetry} className="mt-2 text-xs font-semibold text-rose-300 underline hover:text-white">
                Retry Sync Now
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {pending > 0 && (
        <Alert className="border-[#126DFA]/40 bg-[#0A1628] text-slate-200">
          <Clock className="h-4 w-4 text-[#4A9EFF]" />
          <AlertDescription>
            <p className="font-semibold text-sm">{pending} change(s) queued in IndexedDB</p>
            <p className="text-xs text-slate-400">Will sync automatically once signal is restored.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
