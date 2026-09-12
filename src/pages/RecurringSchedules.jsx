import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Repeat, Plus, X, Calendar, Power, MapPin } from "lucide-react";
import DeleteRecord from "@/components/DeleteRecord";

const cadenceLabels = { weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", quarterly: "Quarterly" };
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

const blank = {
  name: "", client_id: "", client_name: "", project_id: "", project_name: "", site_address: "",
  cadence: "monthly", required_equipment: [],
  assigned_contractor_ids: [], assigned_contractor_names: [],
  billable_rate_type: "flat", billable_rate: "", priority: "medium",
  estimated_duration_hours: "", next_run_date: "", active: true, notes: "",
};

export default function RecurringSchedules() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [user, schs, cls, prjs, cons] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.RecurringSchedule.list("-next_run_date"),
        base44.entities.Client.list(),
        base44.entities.Project.list(),
        base44.entities.Contractor.list(),
      ]);
      setMe(user); setSchedules(schs); setClients(cls); setProjects(prjs); setContractors(cons);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isAdmin = me?.role === "admin";
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onClientChange = (id) => {
    const c = clients.find((cl) => cl.id === id);
    setForm((f) => ({ ...f, client_id: id, client_name: c?.name || "" }));
  };
  const onProjectChange = (id) => {
    const p = projects.find((pr) => pr.id === id);
    setForm((f) => ({ ...f, project_id: id, project_name: p?.name || "", client_id: f.client_id || p?.client_id || "", client_name: f.client_name || p?.client_name || "" }));
  };
  const toggleContractor = (c) => {
    setForm((f) => {
      const has = f.assigned_contractor_ids.includes(c.id);
      const ids = has ? f.assigned_contractor_ids.filter((x) => x !== c.id) : [...f.assigned_contractor_ids, c.id];
      const names = has ? f.assigned_contractor_names.filter((x) => x !== c.name) : [...f.assigned_contractor_names, c.name];
      return { ...f, assigned_contractor_ids: ids, assigned_contractor_names: names };
    });
  };

  const openNew = () => { setForm(blank); setEditingId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...blank, ...s }); setEditingId(s.id); setShowForm(true); };

  const submit = async () => {
    if (!form.name || !form.client_id || !form.site_address || !form.next_run_date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        billable_rate: Number(form.billable_rate) || 0,
        estimated_duration_hours: Number(form.estimated_duration_hours) || undefined,
      };
      if (editingId) {
        await base44.entities.RecurringSchedule.update(editingId, payload);
        toast({ title: "Schedule updated" });
      } else {
        await base44.entities.RecurringSchedule.create(payload);
        toast({ title: "Schedule created", description: `Next run ${form.next_run_date}` });
      }
      setShowForm(false); setEditingId(null); setForm(blank);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (s) => {
    try {
      await base44.entities.RecurringSchedule.update(s.id, { active: !s.active });
      load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const runNow = async () => {
    try {
      const res = await base44.functions.invoke("generateRecurringJobs", {});
      toast({ title: "Generated jobs", description: `${res.data?.created || 0} job(s) created from due schedules.` });
      load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Recurring Scan Schedules</h1>
          <p className="text-sm text-slate-500">Auto-generate jobs on a cadence (progress captures, periodic re-scans)</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={runNow} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700"><Calendar className="w-4 h-4" /> Run now</button>
            <button onClick={openNew} className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center gap-1.5 hover:bg-cyan-400"><Plus className="w-4 h-4" /> New Schedule</button>
          </div>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Repeat className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No recurring schedules yet.</div>
          <div className="text-xs text-slate-500 mt-1">Create one to auto-generate jobs on a weekly, monthly, or quarterly cadence.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className={`bg-slate-900 border rounded-xl p-4 ${s.active ? "border-slate-800" : "border-slate-800 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-100">{s.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${s.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>{s.active ? "Active" : "Paused"}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.site_address}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.client_name} · {cadenceLabels[s.cadence]}</div>
                  <div className="text-xs text-cyan-300/80 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />Next run: {s.next_run_date}</div>
                  {s.assigned_contractor_names?.length > 0 && <div className="text-xs text-slate-500 mt-0.5">Crew: {s.assigned_contractor_names.join(", ")}</div>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(s)} title={s.active ? "Pause" : "Activate"} className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800"><Power className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(s)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-slate-800 hover:bg-slate-700">Edit</button>
                    <DeleteRecord entityName="RecurringSchedule" recordId={s.id} recordLabel={s.name} onDeleted={load} className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">{editingId ? "Edit Schedule" : "New Recurring Schedule"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs text-slate-400 mb-1">Schedule name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Monthly progress scan — Bldg A" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Client *</label><select value={form.client_id} onChange={(e) => onClientChange(e.target.value)} className={inputCls}><option value="">Select…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Project</label><select value={form.project_id} onChange={(e) => onProjectChange(e.target.value)} className={inputCls}><option value="">— None —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Site address *</label><input value={form.site_address} onChange={(e) => set("site_address", e.target.value)} className={inputCls} placeholder="123 Main St, Minneapolis, MN" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Cadence *</label><select value={form.cadence} onChange={(e) => set("cadence", e.target.value)} className={inputCls}>{Object.entries(cadenceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">First run date *</label><input type="date" value={form.next_run_date} onChange={(e) => set("next_run_date", e.target.value)} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Priority</label><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputCls}>{["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Est. duration (hrs)</label><input type="number" value={form.estimated_duration_hours} onChange={(e) => set("estimated_duration_hours", e.target.value)} className={inputCls} placeholder="4" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Billable rate type</label><select value={form.billable_rate_type} onChange={(e) => set("billable_rate_type", e.target.value)} className={inputCls}>{["hourly", "per_sqft", "flat", "daily"].map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-xs text-slate-400 mb-1">Billable rate ($)</label><input type="number" value={form.billable_rate} onChange={(e) => set("billable_rate", e.target.value)} className={inputCls} placeholder="0" /></div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Assigned crew</label>
                <div className="flex flex-wrap gap-1.5">
                  {contractors.filter((c) => ["Field Technician", "Field Pilot"].includes(c.role)).map((c) => {
                    const on = form.assigned_contractor_ids.includes(c.id);
                    return <button key={c.id} type="button" onClick={() => toggleContractor(c)} className={`px-2.5 py-1 rounded-md text-xs border ${on ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>{c.name}</button>;
                  })}
                  {contractors.filter((c) => ["Field Technician", "Field Pilot"].includes(c.role)).length === 0 && <span className="text-xs text-slate-500">No field contractors available.</span>}
                </div>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Notes</label><input value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} placeholder="Optional" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
              <button onClick={submit} disabled={saving || !form.name || !form.client_id || !form.site_address || !form.next_run_date} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save Changes" : "Create Schedule"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}