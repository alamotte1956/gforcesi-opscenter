import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Archive, ArchiveRestore, X, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DeleteRecord from "@/components/DeleteRecord";

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

// Reusable Edit / Archive / Delete controls for any entity row.
// fields: [{ key, label, type: 'text'|'number'|'date'|'time'|'textarea'|'select'|'tags'|'boolean', options?, placeholder?, rows? }]
export default function CrudActions({ entityName, record, fields, onSaved, canArchive = true, canDelete = true, label }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    const init = {};
    fields.forEach((f) => {
      let v = record[f.key];
      if (f.type === "tags" && Array.isArray(v)) v = v.join(", ");
      else if (f.type === "datetime" && v) v = String(v).slice(0, 16);
      else if (v == null) v = "";
      init[f.key] = v;
    });
    setEditing(init);
  };

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  const save = async () => {
    setSaving(true);
    const patch = {};
    fields.forEach((f) => {
      let v = editing[f.key];
      if (f.type === "tags") {
        patch[f.key] = String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
      } else if (f.type === "number") {
        patch[f.key] = v === "" || v == null ? undefined : Number(v);
      } else if (f.type === "boolean") {
        patch[f.key] = !!v;
      } else if (f.type === "datetime") {
        patch[f.key] = v ? new Date(v).toISOString() : undefined;
      } else {
        patch[f.key] = v || undefined;
      }
    });
    try {
      await base44.entities[entityName].update(record.id, patch);
      toast({ title: "Saved", description: label || record.name || "" });
      setEditing(null);
      onSaved?.();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleArchive = async () => {
    try {
      await base44.entities[entityName].update(record.id, { archived: !record.archived });
      toast({ title: record.archived ? "Restored" : "Archived", description: label || record.name || "" });
      onSaved?.();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button onClick={openEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800" title="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        {canArchive && (
          <button onClick={toggleArchive} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800" title={record.archived ? "Restore" : "Archive"}>
            {record.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
        )}
        {canDelete && (
          <DeleteRecord entityName={entityName} recordId={record.id} recordLabel={label || record.name} onDeleted={onSaved} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800" />
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Edit {label || record.name || ""}</h2>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  {f.type === "select" ? (
                    <select value={editing[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={editing[f.key] || ""} onChange={(e) => setField(f.key, e.target.value)} rows={f.rows || 2} className={`${inputCls} resize-none`} placeholder={f.placeholder || ""} />
                  ) : f.type === "boolean" ? (
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setField(f.key, e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800" />
                      {f.placeholder || "Yes"}
                    </label>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "datetime" ? "datetime-local" : "text"}
                      value={editing[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className={inputCls}
                      placeholder={f.placeholder || ""}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}