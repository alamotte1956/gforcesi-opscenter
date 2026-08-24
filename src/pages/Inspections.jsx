import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Plus, Check, Trash2, ChevronDown, Pencil } from "lucide-react";
import FormModal from "@/components/FormModal";

const statusStyles = { scheduled: "bg-slate-700 text-slate-300", in_progress: "bg-blue-500/15 text-blue-300", passed: "bg-emerald-500/15 text-emerald-300", failed: "bg-rose-500/15 text-rose-300", needs_correction: "bg-amber-500/15 text-amber-300" };
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
const defaultChecklist = ["Equipment calibrated & tested", "Site safety briefing complete", "Data capture coverage verified", "Control points established", "Deliverables checklist reviewed"];
const emptyForm = () => ({ title: "", job_id: "", inspector_name: "", inspection_date: new Date().toISOString().slice(0, 10), items: defaultChecklist.map((i) => ({ item: i, passed: false })), notes: "" });

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = async () => {
    const [i, j] = await Promise.all([base44.entities.Inspection.list("-inspection_date"), base44.entities.Job.list()]);
    setInspections(i); setJobs(j); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    scheduled: inspections.filter((x) => x.status === "scheduled").length,
    passed: inspections.filter((x) => x.status === "passed").length,
    failed: inspections.filter((x) => ["failed", "needs_correction"].includes(x.status)).length,
    total: inspections.length,
  }), [inspections]);

  const computeStatus = (items) => {
    if (!items.length) return "scheduled";
    const allPassed = items.every((i) => i.passed);
    const anyFailed = items.some((i) => i.passed === false);
    if (allPassed) return "passed";
    if (anyFailed) return "needs_correction";
    return "in_progress";
  };

  const toggleItem = async (insp, idx) => {
    const items = (insp.checklist || []).map((it, i) => (i === idx ? { ...it, passed: !it.passed } : it));
    const status = computeStatus(items);
    setInspections((prev) => prev.map((x) => (x.id === insp.id ? { ...x, checklist: items, status } : x)));
    await base44.entities.Inspection.update(insp.id, { checklist: items, status });
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const editInspection = (x) => {
    setEditingId(x.id);
    setForm({ title: x.title || "", job_id: x.job_id || "", inspector_name: x.inspector_name || "", inspection_date: x.inspection_date || new Date().toISOString().slice(0, 10), items: (x.checklist || []).map((i) => ({ item: i.item, passed: !!i.passed })), notes: x.notes || "" });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title) return;
    const job = jobs.find((j) => j.id === form.job_id);
    const payload = {
      title: form.title, job_id: form.job_id || undefined, job_title: job?.title, project_id: job?.project_id, project_name: job?.project_name,
      inspector_name: form.inspector_name, inspection_date: form.inspection_date, checklist: form.items, notes: form.notes,
    };
    if (editingId) await base44.entities.Inspection.update(editingId, payload);
    else await base44.entities.Inspection.create({ ...payload, status: "scheduled" });
    closeForm(); load();
  };

  const deleteInspection = async (x) => {
    if (!x) return;
    await base44.entities.Inspection.delete(x.id);
    setConfirmId(null); load();
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { item: "", passed: false }] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const setItemText = (idx, text) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, item: text } : it)) }));

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-cyan-400" /> Inspections</h1>
          <p className="text-sm text-slate-500">QA checklists and site inspections</p>
        </div>
        <button onClick={openNew} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"><Plus className="w-4 h-4" /> New Inspection</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card label="Scheduled" value={stats.scheduled} accent="text-slate-300" />
        <Card label="Passed" value={stats.passed} accent="text-emerald-300" />
        <Card label="Failed / Correction" value={stats.failed} accent="text-rose-300" />
        <Card label="Total" value={stats.total} accent="text-cyan-300" />
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div> : (
        <div className="space-y-3">
          {inspections.map((x) => {
            const passed = (x.checklist || []).filter((i) => i.passed).length;
            const total = (x.checklist || []).length;
            const open = openId === x.id;
            return (
              <div key={x.id} className="bg-slate-900 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3 px-4 py-3 text-left">
                  <button onClick={() => setOpenId(open ? null : x.id)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-200 font-medium">{x.title}</div>
                      <div className="text-xs text-slate-500">{x.job_title || "—"} · {x.inspection_date} · {x.inspector_name || "—"}</div>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{passed}/{total} passed</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${statusStyles[x.status] || statusStyles.scheduled}`}>{x.status.replace("_", " ")}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  <button onClick={() => editInspection(x)} className="text-slate-500 hover:text-cyan-300 shrink-0" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmId(x.id)} className="text-slate-500 hover:text-rose-400 shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
                {open && (
                  <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                    {(x.checklist || []).map((it, idx) => (
                      <button key={idx} onClick={() => toggleItem(x, idx)} className="w-full flex items-center gap-2.5 text-left">
                        <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${it.passed ? "bg-emerald-500 text-slate-950" : "bg-slate-800 border border-slate-700"}`}>{it.passed && <Check className="w-3.5 h-3.5" />}</span>
                        <span className={`text-sm ${it.passed ? "text-slate-200" : "text-slate-400"}`}>{it.item}</span>
                      </button>
                    ))}
                    {x.notes && <div className="text-xs text-slate-500 pt-1">Notes: {x.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
          {inspections.length === 0 && <div className="text-center text-slate-500 py-10">No inspections yet.</div>}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full">
            <div className="text-slate-200 font-medium mb-1">Delete inspection?</div>
            <div className="text-sm text-slate-500 mb-4">This cannot be undone.</div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={() => deleteInspection(inspections.find((i) => i.id === confirmId))} className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-400">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <FormModal title={editingId ? "Edit Inspection" : "New Inspection"} onClose={closeForm} onSubmit={save} submitLabel={editingId ? "Save Changes" : "Create Inspection"}>
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Inspection title" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Job (optional)"><select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className={inputCls}><option value="">— None —</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></Field>
            <Field label="Inspector"><input value={form.inspector_name} onChange={(e) => setForm({ ...form, inspector_name: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Date"><input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} className={inputCls} /></Field>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">Checklist items</label>
              <button onClick={addItem} className="text-xs text-cyan-400 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={it.item} onChange={(e) => setItemText(idx, e.target.value)} className={inputCls} placeholder="Checklist item" />
                  <button onClick={() => removeItem(idx)} className="text-slate-500 hover:text-rose-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}