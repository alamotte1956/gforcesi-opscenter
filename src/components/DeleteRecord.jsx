import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DeleteRecord({ entityName, recordId, recordLabel, onDeleted, title = "Delete record?", message = "This action cannot be undone.", className = "" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const confirm = async () => {
    setBusy(true);
    try {
      await base44.entities[entityName].delete(recordId);
      toast({ title: "Deleted", description: recordLabel || "" });
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message || "You may not have permission to delete this record.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title="Delete" aria-label="Delete record">
        <Trash2 className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full">
            <div className="text-slate-200 font-medium mb-1">{title}</div>
            <div className="text-sm text-slate-500 mb-4">{message}</div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={confirm} disabled={busy} className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-400 disabled:opacity-50 flex items-center gap-1.5">
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}