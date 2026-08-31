import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, Loader2 } from "lucide-react";
import FormModal from "@/components/FormModal";
import DeleteRecord from "@/components/DeleteRecord";

const severityStyles = { low: "bg-slate-700 text-slate-300", medium: "bg-amber-500/15 text-amber-300", high: "bg-orange-500/15 text-orange-300", critical: "bg-rose-500/15 text-rose-300" };
const statusStyles = { open: "bg-rose-500/15 text-rose-300", in_progress: "bg-blue-500/15 text-blue-300", resolved: "bg-emerald-500/15 text-emerald-300", closed: "bg-slate-700 text-slate-400" };
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", job_id: "", location: "", severity: "medium", assigned_to_id: "", due_date: "", photo_url: "" });

  const load = async () => {
    const [i, j, c] = await Promise.all([base44.entities.Issue.list("-created_date"), base44.entities.Job.list(), base44.entities.Contractor.list()]);
    setIssues(i); setJobs(j); setContractors(c); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (filter === "all" ? issues : issues.filter((x) => x.status === filter)), [issues, filter]);
  const stats = useMemo(() => ({
    open: issues.filter((x) => x.status === "open").length,
    inProgress: issues.filter((x) => x.status === "in_progress").length,
    resolved: issues.filter((x) => x.status === "resolved").length,
    critical: issues.filter((x) => x.severity === "critical" && x.status !== "closed").length,
  }), [issues]);

  const setStatus = async (id, status) => {
    setIssues((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    const patch = { status };
    if (status === "resolved") patch.resolved_date = new Date().toISOString().slice(0, 10);
    await base44.entities.Issue.update(id, patch);
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, photo_url: file_url }));
    } catch {} finally { setUploading(false); }
  };

  const create = async () => {
    if (!form.title) return;
    const job = jobs.find((j) => j.id === form.job_id);
    const assignee = contractors.find((c) => c.id === form.assigned_to_id);
    await base44.entities.Issue.create({
      title: form.title, description: form.description,
      job_id: form.job_id || undefined, job_title: job?.title, project_id: job?.project_id, project_name: job?.project_name,
      location: form.location, severity: form.severity,
      assigned_to_id: form.assigned_to_id || undefined, assigned_to_name: assignee?.name,
      due_date: form.due_date, photo_url: form.photo_url, status: "open",
    });
    setForm({ title: "", description: "", job_id: "", location: "", severity: "medium", assigned_to_id: "", due_date: "", photo_url: "" });
    setShowForm(false); load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-cyan-400" /> Issues & Punch List</h1>
          <p className="text-sm text-slate-500">Track and resolve site issues</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"><Plus className="w-4 h-4" /> New Issue</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card label="Open" value={stats.open} accent="text-rose-300" />
        <Card label="In Progress" value={stats.inProgress} accent="text-blue-300" />
        <Card label="Resolved" value={stats.resolved} accent="text-emerald-300" />
        <Card label="Critical Open" value={stats.critical} accent="text-orange-300" />
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${filter === s ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"}`}>{s.replace("_", " ")}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div> : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Issue</th><th className="px-4 py-3 font-medium">Job / Location</th><th className="px-4 py-3 font-medium">Severity</th><th className="px-4 py-3 font-medium">Assigned</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Change</th>
            </tr></thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 align-top">
                  <td className="px-4 py-3">
                    <div className="text-slate-200 font-medium">{x.title}</div>
                    {x.description && <div className="text-xs text-slate-500 mt-0.5 max-w-[240px] truncate">{x.description}</div>}
                    {x.photo_url && <a href={x.photo_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">View photo</a>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{x.job_title || "—"}{x.location && <div className="text-xs text-slate-500">{x.location}</div>}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${severityStyles[x.severity] || severityStyles.medium}`}>{x.severity}</span></td>
                  <td className="px-4 py-3 text-slate-400">{x.assigned_to_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{x.due_date || "—"}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${statusStyles[x.status] || statusStyles.open}`}>{x.status.replace("_", " ")}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <select value={x.status} onChange={(e) => setStatus(x.id, e.target.value)} className="text-[11px] bg-slate-800 border border-slate-700 rounded px-2 py-1 capitalize">
                        {["open", "in_progress", "resolved", "closed"].map((s) => <option key={s} value={s} className="bg-slate-800">{s.replace("_", " ")}</option>)}
                      </select>
                      <DeleteRecord entityName="Issue" recordId={x.id} recordLabel={x.title} onDeleted={load} className="text-slate-500 hover:text-rose-400" />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No issues.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormModal title="New Issue" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Create Issue">
          <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Issue title" /></Field>
          <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Job (optional)"><select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className={inputCls}><option value="">— None —</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></Field>
            <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Where on site" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Severity"><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>{["low", "medium", "high", "critical"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}</select></Field>
            <Field label="Assign to"><select value={form.assigned_to_id} onChange={(e) => setForm({ ...form, assigned_to_id: e.target.value })} className={inputCls}><option value="">— Unassigned —</option>{contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Photo (optional)">
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={onPhoto} className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200" />
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              {form.photo_url && <span className="text-xs text-emerald-400">Uploaded</span>}
            </div>
          </Field>
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