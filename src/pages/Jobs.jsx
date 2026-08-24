import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Table as TableIcon, Clock } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    const [data, cls] = await Promise.all([base44.entities.Job.list("-scheduled_start"), base44.entities.Client.list()]);
    setJobs(data);
    setClients(cls);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
          <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Job
          </button>
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
                  <td className="px-3 py-2.5 font-medium text-slate-200 whitespace-nowrap">{j.title}</td>
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
    </div>
  );
}