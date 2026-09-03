import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, Check, Download, Loader2 } from "lucide-react";
import FormModal from "@/components/FormModal";
import DeleteRecord from "@/components/DeleteRecord";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  draft: "bg-slate-700 text-slate-300",
  submitted: "bg-amber-500/15 text-amber-300",
  reviewed: "bg-emerald-500/15 text-emerald-300",
};
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function DailyReports() {
  const [reports, setReports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ report_date: new Date().toISOString().slice(0, 10), job_id: "", filed_by_name: "", weather: "", work_completed: "", hours_worked: "", crew_count: "1", delays: "", notes: "" });
  const [exportingId, setExportingId] = useState(null);
  const { toast } = useToast();

  const exportPdf = async (r) => {
    setExportingId(r.id);
    try {
      const res = await base44.functions.invoke("exportDailyReport", { report_id: r.id });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DailyReport-${r.report_date}-${(r.job_title || "site").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Export failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setExportingId(null);
    }
  };

  const load = async () => {
    const [r, j] = await Promise.all([base44.entities.DailyReport.list("-report_date"), base44.entities.Job.list()]);
    setReports(r); setJobs(j); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (filter === "all" ? reports : reports.filter((r) => r.status === filter)), [reports, filter]);
  const stats = useMemo(() => ({
    submitted: reports.filter((r) => r.status === "submitted").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    hours: reports.reduce((s, r) => s + (r.hours_worked || 0), 0),
    today: reports.filter((r) => r.report_date === new Date().toISOString().slice(0, 10)).length,
  }), [reports]);

  const setStatus = async (id, status) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await base44.entities.DailyReport.update(id, { status });
  };

  const create = async () => {
    if (!form.work_completed) return;
    const job = jobs.find((j) => j.id === form.job_id);
    await base44.entities.DailyReport.create({
      report_date: form.report_date,
      job_id: form.job_id || undefined,
      job_title: job?.title,
      project_id: job?.project_id,
      project_name: job?.project_name,
      filed_by_name: form.filed_by_name,
      weather: form.weather,
      work_completed: form.work_completed,
      hours_worked: Number(form.hours_worked) || 0,
      crew_count: Number(form.crew_count) || 1,
      delays: form.delays,
      notes: form.notes,
      status: "submitted",
    });
    setForm({ report_date: new Date().toISOString().slice(0, 10), job_id: "", filed_by_name: "", weather: "", work_completed: "", hours_worked: "", crew_count: "1", delays: "", notes: "" });
    setShowForm(false); load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><ClipboardList className="w-5 h-5 text-cyan-400" /> Daily Reports</h1>
          <p className="text-sm text-slate-500">Field daily logs filed by crews</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"><Plus className="w-4 h-4" /> New Report</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card label="Filed Today" value={stats.today} accent="text-cyan-300" />
        <Card label="Pending Review" value={stats.submitted} accent="text-amber-300" />
        <Card label="Reviewed" value={stats.reviewed} accent="text-emerald-300" />
        <Card label="Total Hours" value={stats.hours} accent="text-blue-300" />
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {["all", "submitted", "reviewed", "draft"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs capitalize ${filter === s ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"}`}>{s}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div> : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Job</th><th className="px-4 py-3 font-medium">Filed by</th><th className="px-4 py-3 font-medium">Weather</th><th className="px-4 py-3 font-medium">Work Completed</th><th className="px-4 py-3 font-medium text-right">Hours</th><th className="px-4 py-3 font-medium text-right">Crew</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 align-top">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.report_date}</td>
                  <td className="px-4 py-3 text-slate-200">{r.job_title || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{r.filed_by_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{r.weather || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[260px]"><div className="truncate" title={r.work_completed}>{r.work_completed}</div>{r.delays && <div className="text-xs text-amber-400/80 truncate">Delays: {r.delays}</div>}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.hours_worked || 0}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{r.crew_count || 0}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${statusStyles[r.status] || statusStyles.submitted}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "submitted" && (
                        <button onClick={() => setStatus(r.id, "reviewed")} className="text-xs text-emerald-400 hover:underline flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Review</button>
                      )}
                      <button onClick={() => exportPdf(r)} disabled={exportingId === r.id} className="text-xs text-cyan-400 hover:underline flex items-center gap-1 disabled:opacity-50">
                        {exportingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                      </button>
                      <DeleteRecord entityName="DailyReport" recordId={r.id} recordLabel={r.job_title || r.report_date} onDeleted={load} className="text-slate-500 hover:text-rose-400" />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No daily reports.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormModal title="New Daily Report" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Submit Report">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} className={inputCls} /></Field>
            <Field label="Filed by"><input value={form.filed_by_name} onChange={(e) => setForm({ ...form, filed_by_name: e.target.value })} className={inputCls} placeholder="Crew name" /></Field>
          </div>
          <Field label="Job (optional)"><select value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className={inputCls}><option value="">— None —</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Weather"><input value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} className={inputCls} placeholder="Sunny" /></Field>
            <Field label="Hours"><input type="number" value={form.hours_worked} onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} className={inputCls} /></Field>
            <Field label="Crew"><input type="number" value={form.crew_count} onChange={(e) => setForm({ ...form, crew_count: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Work completed"><textarea value={form.work_completed} onChange={(e) => setForm({ ...form, work_completed: e.target.value })} rows={3} className={inputCls} /></Field>
          <Field label="Delays / issues"><input value={form.delays} onChange={(e) => setForm({ ...form, delays: e.target.value })} className={inputCls} /></Field>
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