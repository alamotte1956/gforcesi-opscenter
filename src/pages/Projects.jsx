import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FolderKanban } from "lucide-react";
import FormModal from "@/components/FormModal";
import DeleteRecord from "@/components/DeleteRecord";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  on_hold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-slate-700 text-slate-300 border-slate-600",
};
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
const emptyForm = () => ({ name: "", client_id: "", description: "", status: "active", region: "", start_date: "", end_date: "", notes: "" });

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [p, j, c, user] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Job.list(),
      base44.entities.Client.list(),
      base44.auth.me().catch(() => null),
    ]);
    setProjects(p); setJobs(j); setClients(c); setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.client_id) return;
    const client = clients.find((c) => c.id === form.client_id);
    const name = form.name;
    await base44.entities.Project.create({
      name,
      client_id: form.client_id,
      client_name: client?.name,
      description: form.description || undefined,
      status: form.status,
      region: form.region || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      notes: form.notes || undefined,
    });
    setForm(emptyForm());
    setShowForm(false);
    toast({ title: "Project created", description: name });
    load();
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} projects</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pJobs = jobs.filter((j) => j.project_id === p.id);
            const done = pJobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
            const pct = pJobs.length ? Math.round((done / pJobs.length) * 100) : 0;
            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.client_name}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[p.status] || statusStyles.active}`}>
                      {p.status.replace("_", " ")}
                    </span>
                    {isAdmin && <DeleteRecord entityName="Project" recordId={p.id} recordLabel={p.name} onDeleted={load} className="text-slate-500 hover:text-rose-400" />}
                  </div>
                </div>
                {p.description && <p className="text-sm text-slate-400 mt-3 line-clamp-2">{p.description}</p>}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{done}/{pJobs.length} jobs complete</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-slate-500">
                  <span>📍 {p.region || "—"}</span>
                  <span>{pJobs.length} jobs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <FormModal title="New Project" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Create Project">
          <Field label="Project name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Project name" /></Field>
          <Field label="Client">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputCls}>
              <option value="">— Select client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                {["active", "on_hold", "completed"].map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
              </select>
            </Field>
            <Field label="Region"><input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} /></Field>
            <Field label="End date"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}