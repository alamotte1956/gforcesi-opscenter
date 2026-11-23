import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Server, Smartphone } from "lucide-react";
import { resolveStoredConflict } from "./OfflineStorage";
import { CONFLICT_STRATEGIES, resolveConflict } from "./ConflictResolver";

export default function ConflictResolutionDialog({ conflict, isOpen, onResolve }) {
  const [selectedStrategy, setSelectedStrategy] = useState(CONFLICT_STRATEGIES.SERVER_WINS);
  const [isResolving, setIsResolving] = useState(false);

  if (!conflict) return null;

  const handleResolve = async (strategy) => {
    setIsResolving(true);
    try {
      const resolution = resolveConflict(conflict, strategy);
      await resolveStoredConflict(conflict.id, resolution);
      onResolve?.(conflict.id, resolution);
    } catch (error) {
      console.error("Error resolving conflict:", error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isResolving && onResolve?.(null)}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Offline Sync Conflict Detected
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            This field record was modified both offline and on the server. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(conflict.fields || []).map((field, idx) => (
              <div key={idx} className="rounded-xl border border-amber-500/30 bg-slate-950 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{field.name}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#126DFA]/10 border border-[#126DFA]/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4A9EFF] mb-1">
                      <Smartphone className="h-3.5 w-3.5" /> Field Device Version
                    </div>
                    <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(field.local, null, 2)}
                    </pre>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-1">
                      <Server className="h-3.5 w-3.5" /> Ops Center Version
                    </div>
                    <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(field.server, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedStrategy(CONFLICT_STRATEGIES.SERVER_WINS)}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                selectedStrategy === CONFLICT_STRATEGIES.SERVER_WINS
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <div className="text-sm font-medium flex items-center gap-2 text-emerald-300">
                <Server className="h-4 w-4" /> Keep Server Version
              </div>
              <p className="text-xs text-slate-400 mt-1">Discard offline edits and keep current Ops Center data.</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStrategy(CONFLICT_STRATEGIES.LOCAL_WINS)}
              className={`text-left p-3.5 rounded-xl border transition-all ${
                selectedStrategy === CONFLICT_STRATEGIES.LOCAL_WINS
                  ? "border-[#126DFA] bg-[#126DFA]/15"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <div className="text-sm font-medium flex items-center gap-2 text-[#4A9EFF]">
                <Smartphone className="h-4 w-4" /> Keep Field Device Version
              </div>
              <p className="text-xs text-slate-400 mt-1">Overwrite server with your offline technician changes.</p>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onResolve?.(null)} disabled={isResolving} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button
              onClick={() => handleResolve(selectedStrategy)}
              disabled={isResolving}
              className="bg-[#126DFA] hover:bg-[#4A9EFF] text-white"
            >
              {isResolving ? "Resolving..." : "Apply Resolution"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
