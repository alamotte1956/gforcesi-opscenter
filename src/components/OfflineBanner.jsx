import React from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function OfflineBanner({ isOnline, queueCount, onSync }) {
  if (isOnline && queueCount === 0) return null;
  return (
    <div className={`rounded-xl p-3 mb-4 flex items-center gap-2.5 text-sm ${
      isOnline
        ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-200"
        : "bg-amber-500/10 border border-amber-500/30 text-amber-200"
    }`}>
      {isOnline ? <Wifi className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
      <div className="flex-1 min-w-0">
        {isOnline
          ? <span>Back online — syncing {queueCount} queued change{queueCount === 1 ? "" : "s"}…</span>
          : <span>You're offline. Changes are saved on this device and will sync automatically when reconnected{queueCount ? ` (${queueCount} queued)` : ""}.</span>}
      </div>
      {isOnline && onSync && (
        <button onClick={onSync} className="text-xs flex items-center gap-1 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" /> Sync now
        </button>
      )}
    </div>
  );
}