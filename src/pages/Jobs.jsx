import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Search, Table as TableIcon, Clock } from "lucide-react";
import FormModal from "@/components/FormModal";
import { useToast } from "@/components/ui/use-toast";

const statusOptions = [
  "scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced",
];

const statusStyles = {
  scheduled: "bg-slate-700 text-slate-300",
  en_route: "bg-blue-500/15 text-blue-300",
  on_site: "bg-amber-500/15 text-amber-300",
  scanning: "bg-purple-500/15 text-purple-300",
  processing: "bg-indigo-500/15 text-indigo-300",
  complete: "bg-emerald-500/15 text-emerald-300",
  invoiced: "bg-cyan-500/15 text-cyan-300",
};

const priorityStyles = {
  urgent: "bg-rose-500/15 text-rose-300",
  high: "bg-amber-500/15 text-amber-300",
  medium: "bg-slate-700 text-slate-300",
  low: "bg-slate-800 text-slate-400",
};

const fmtDate = (v) => v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", site_address: "", priority: "medium", scheduled_start: "", scheduled_end: "", status: "scheduled", billable_rate_type: "hourly", billable_rate: "", notes: "" });
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [data, cls, prj, user] = await Promise.all([base44.entities.Job.list("-scheduled_start"), base44.entities.Client.list(), base44.entities.Project.list(), base44.auth.me().catch(() => null)]);
    setJobs(data);
    setClients(cls);
    setProjects(prj);
    setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createJob = async () => {
    if (!form.title || !form.project_id || !form.site_address) return;
    const project = projects.find((p) => p.id === form.project_id);
    const title = form.title;
    await base44.entities.Job.create({
      title,
      project_id: form.project_id,
      project_name: project?.name,
      client_id: project?.client_id,
      client_name: project?.client_name,
      site_address: form.site_address,
      priority: form.priority,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : undefined,
      scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : undefined,
      status: form.status,
      status_history: [{ status: form.status, entered_at: new Date().toISOString() }],
      billable_rate_type: form.billable_rate_type,
      billable_rate: form.billable_rate ? Number(form.billable_rate) : undefined,
      notes: form.notes || undefined,
    });
    setForm({ title: "", project_id: "", site_address: "", priority: "medium", scheduled_start: "", scheduled_end: "", status: "scheduled", billable_rate_type: "hourly", billable_rate: "", notes: "" });
    setShowForm(false);
    toast({ title: "Job created", description: title });
    load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!q) return true;
      return [j.title, j.project_name, j.client_name, j.site_address, ...(j.assigned_contractor_names || [])]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [jobs, query, statusFilter]);

  const updateField = async (id, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    await base44.entities.Job.update(id, patch);
  };

  const hoursInfo = (job) => {
    const client = clients.find((c) => c.id === job.client_id);
    if (!client || !client.opening_time || !client.closing_time) return { text: null, warn: false };
    const text = `${client.opening_time}–${client.closing_time}`;
    if (!job.scheduled_start) return { text, warn: false };
    const t = new Date(job.scheduled_start);
    const mins = t.getHours() * 60 + t.getMinutes();
    const [oh, om] = client.opening_time.split(":").map(Number);
    const [ch, cm] = client.closing_time.split(":").map(Number);
    return { text, warn: mins < oh * 60 + om || mins > ch * 60 + cm };
  };

  return (
    <div className="p-4 lg:p-6 h-screen lg:h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><TableIcon className="w-5 h-5 text-cyan-400" /> Jobs</h1>
          <p className="text-sm text-slate-500">{filtered.length} of {jobs.length} jobs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-sm w-48 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 capitalize"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
          </select>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
              <Plus className="w-4 h-4" /> New Job
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 overflow-auto bg-slate-900 border border-slate-800 rounded-xl">
          <table className="w-full text-sm min-w-[1400px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 bg-slate-900 border-b border-slate-800">
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Title</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Project</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Client</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Site Address</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Priority</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Assigned Team</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Equipment</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Scheduled Start</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Scheduled End</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Est. Hrs</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Rate Type</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap text-right">Rate</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Deliverables</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr key={j.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 align-top">
                  <td className="px-3 py-2.5 font-medium text-slate-200 whitespace-nowrap"><Link to={`/jobs/${j.id}`} className="text-cyan-300 hover:underline">{j.title}</Link></td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{j.project_name || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="text-slate-400">{j.client_name || "—"}</div>
                    {(() => { const h = hoursInfo(j); return h.text ? <div className={`text-[10px] flex items-center gap-1 ${h.warn ? "text-amber-400" : "text-slate-500"}`}><Clock className="w-3 h-3" />{h.text}{h.warn && " · outside"}</div> : null; })()}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap max-w-[200px] truncate" title={j.site_address}>{j.site_address || "—"}</td>
                  <td className="px-3 py-2.5">
                    <select
                      value={j.status}
                      onChange={(e) => updateField(j.id, { status: e.target.value })}
                      className={`text-[11px] px-2 py-1 rounded capitalize border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 ${statusStyles[j.status] || statusStyles.scheduled}`}
                    >
                      {statusOptions.map((s) => <option key={s} value={s} className="bg-slate-800 text-slate-200">{s.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={j.priority}
                      onChange={(e) => updateField(j.id, { priority: e.target.value })}
                      className={`text-[11px] px-2 py-1 rounded capitalize border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 ${priorityStyles[j.priority] || priorityStyles.medium}`}
                    >
                      {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p} className="bg-slate-800 text-slate-200">{p}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap max-w-[180px] truncate" title={(j.assigned_contractor_names || []).join(", ")}>
                    {(j.assigned_contractor_names || []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap max-w-[160px] truncate" title={(j.required_equipment || []).join(", ")}>
                    {(j.required_equipment || []).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(j.scheduled_start)}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(j.scheduled_end)}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-right">{j.estimated_duration_hours ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap capitalize">{j.billable_rate_type || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap text-right">{j.billable_rate != null ? `$${j.billable_rate}` : "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap max-w-[200px] truncate" title={j.deliverables}>{j.deliverables || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={14} className="px-3 py-10 text-center text-slate-500">No jobs match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormModal title="New Job" onClose={() => setShowForm(false)} onSubmit={createJob} submitLabel="Create Job">
          <Field label="Job title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Job title" /></Field>
          <Field label="Project">
            <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}>
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Site address"><input value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} className={inputCls} placeholder="Site address" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"].map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled start"><input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} className={inputCls} /></Field>
            <Field label="Scheduled end"><input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate type">
              <select value={form.billable_rate_type} onChange={(e) => setForm({ ...form, billable_rate_type: e.target.value })} className={inputCls}>
                {["hourly", "per_sqft", "flat", "daily"].map((r) => <option key={r} value={r} className="capitalize">{r.replace("_", "/")}</option>)}
              </select>
            </Field>
            <Field label="Billable rate"><input type="number" value={form.billable_rate} onChange={(e) => setForm({ ...form, billable_rate: e.target.value })} className={inputCls} placeholder="0" /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}