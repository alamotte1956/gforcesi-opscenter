import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Plus, Loader2, Trash2, Camera } from "lucide-react";
import { Image } from "@/components/ui/image";

const conditionStyles = {
  good: "bg-emerald-500/15 text-emerald-300",
  fair: "bg-amber-500/15 text-amber-300",
  poor: "bg-orange-500/15 text-orange-300",
  critical: "bg-rose-500/15 text-rose-300",
};

const fmt = (v) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default function AssetAssessments({ job, assessedByName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ asset_name: "", location: "", condition: "good", notes: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const all = await base44.entities.AssetAssessment.filter({ job_id: job.id }, "-assessed_at");
      setItems(all);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [job.id]);

  const submit = async () => {
    if (!form.asset_name.trim()) return;
    setSaving(true);
    try {
      let photo_url;
      if (photoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
        photo_url = file_url;
      }
      await base44.entities.AssetAssessment.create({
        job_id: job.id,
        job_title: job.title,
        project_id: job.project_id,
        project_name: job.project_name,
        matterport_model_id: job.matterport_model_id,
        asset_name: form.asset_name.trim(),
        location: form.location || undefined,
        condition: form.condition,
        notes: form.notes || undefined,
        photo_url,
        assessed_by_name: assessedByName || undefined,
        assessed_at: new Date().toISOString(),
      });
      setForm({ asset_name: "", location: "", condition: "good", notes: "" });
      setPhotoFile(null);
      setAdding(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.AssetAssessment.delete(id);
    load();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-cyan-400" />Asset Condition Assessments ({items.length})</h2>
        <button onClick={() => setAdding((a) => !a)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          {adding ? "Cancel" : <><Plus className="w-3.5 h-3.5" /> Add assessment</>}
        </button>
      </div>

      {adding && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Asset name *</label>
              <input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="e.g. HVAC unit, shelving, signage" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="Where in the site / model" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Condition</label>
            <div className="flex gap-2">
              {["good", "fair", "poor", "critical"].map((c) => (
                <button key={c} onClick={() => setForm({ ...form, condition: c })} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border ${form.condition === c ? conditionStyles[c] + " border-current" : "bg-slate-800 border-slate-700 text-slate-400"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-cyan-500" placeholder="Observed damage, wear, action needed…" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Photo</label>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 cursor-pointer hover:border-cyan-500/40">
              <Camera className="w-3.5 h-3.5" /> {photoFile ? photoFile.name : "Attach photo"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button onClick={submit} disabled={saving || !form.asset_name.trim()} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save assessment
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        {loading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-2">No asset assessments recorded yet. Tag assets inside the 3D model with a condition rating and photo.</p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                {a.photo_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                    <Image src={a.photo_url} className="w-full h-full" fittingType="fill" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-100">{a.asset_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${conditionStyles[a.condition]}`}>{a.condition}</span>
                  </div>
                  {a.location && <div className="text-xs text-slate-500 mt-0.5">{a.location}</div>}
                  {a.notes && <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{a.notes}</div>}
                  <div className="text-[10px] text-slate-500 mt-1">{a.assessed_by_name || "Field"} · {fmt(a.assessed_at)}</div>
                </div>
                <button onClick={() => remove(a.id)} className="text-slate-600 hover:text-rose-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}