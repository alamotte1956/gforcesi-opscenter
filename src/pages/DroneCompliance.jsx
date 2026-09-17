import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plane, Plus, X, Loader2, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { contractorCompliance } from "@/lib/contractorCompliance";

const expiryStatus = (date) => {
  if (!date) return { label: "No cert", tone: "text-rose-400" };
  const days = (new Date(date) - new Date()) / 86400000;
  if (days < 0) return { label: "Expired", tone: "text-rose-400" };
  if (days <= 30) return { label: `Expires in ${Math.ceil(days)}d`, tone: "text-amber-400" };
  return { label: new Date(date).toLocaleDateString(), tone: "text-emerald-400" };
};

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

const defaultChecklist = [
  "Pilot certificate current", "Drone registered", "Battery charged (aircraft + controller)",
  "Propellers inspected", "SD card installed", "GPS lock acquired", "Airspace/LAANC approved", "Weather minimums met",
];

function blankLog(pilotId, pilotName) {
  return {
    contractor_id: pilotId || "", contractor_name: pilotName || "", job_id: "", job_title: "",
    flight_date: new Date().toISOString().slice(0, 10), location: "", duration_minutes: 0,
    airspace_class: "uncontrolled", laanc_approved: false, weather_conditions: "", weather_minimums_met: false,
    preflight_checklist: defaultChecklist.map((item) => ({ item, passed: false })),
    jha_completed: false, incidents: "", notes: "",
  };
}

export default function DroneCompliance() {
  const [contractors, setContractors] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState(blankLog());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [c, j, l, u] = await Promise.all([
      base44.entities.Contractor.list().catch(() => []),
      base44.entities.Job.list().catch(() => []),
      base44.entities.FlightLog.list("-flight_date", 100).catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setContractors(c); setJobs(j); setLogs(l); setMe(u); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pilots = contractors.filter((c) => c.role === "Field Pilot");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCheck = (i) => setForm((f) => {
    const cl = [...f.preflight_checklist];
    cl[i] = { ...cl[i], passed: !cl[i].passed };
    return { ...f, preflight_checklist: cl };
  });

  const saveLog = async () => {
    if (!form.contractor_id || !form.flight_date) { toast({ title: "Pilot and date required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.FlightLog.create(form);
      toast({ title: "Flight log recorded" });
      setShowLog(false); setForm(blankLog());
      load();
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Plane className="w-5 h-5 text-cyan-400" /> Drone & Field Compliance</h1>
          <p className="text-sm text-slate-500">Part 107 pilot currency · pre-flight checklists · flight logs · JHA</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm(blankLog(pilots[0]?.id, pilots[0]?.name)); setShowLog(true); }} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> Log Flight
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-400" /> Part 107 Pilot Currency</h2>
        {pilots.length === 0 ? (
          <div className="text-sm text-slate-500">No Field Pilots on file. Assign the "Field Pilot" role to a contractor to track their Part 107 currency.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pilots.map((p) => {
              const exp = expiryStatus(p.part107_expiry);
              const comp = contractorCompliance(p);
              return (
                <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-200 text-sm">{p.name}</div>
                    {exp.label === "Expired" ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : exp.label === "No cert" ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Cert #: {p.part107_cert_number || "—"}</div>
                  <div className={`text-xs mt-0.5 ${exp.tone}`}>{exp.label}</div>
                  {!comp.canReceiveOffers && <div className="text-[10px] text-rose-400 mt-1">Compliance issues — offers blocked</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-400" /> Flight Logs</h2>
      {logs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Plane className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No flight logs recorded yet.</div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Pilot</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Airspace</th>
                <th className="px-4 py-3 font-medium text-right">Duration</th>
                <th className="px-4 py-3 font-medium">Preflight</th>
                <th className="px-4 py-3 font-medium">JHA</th>
                <th className="px-4 py-3 font-medium">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const passed = (l.preflight_checklist || []).filter((c) => c.passed).length;
                const total = (l.preflight_checklist || []).length;
                return (
                  <tr key={l.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-300">{new Date(l.flight_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-200">{l.contractor_name}</td>
                    <td className="px-4 py-3 text-slate-400">{l.location || "—"}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{l.airspace_class?.replace("_", " ")}{l.laanc_approved ? " · LAANC ✓" : ""}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{l.duration_minutes || 0}m</td>
                    <td className="px-4 py-3"><span className={passed === total ? "text-emerald-400" : "text-amber-400"}>{passed}/{total}</span></td>
                    <td className="px-4 py-3">{l.jha_completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}</td>
                    <td className="px-4 py-3 text-xs text-rose-300">{l.incidents || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLog(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><Plane className="w-4 h-4 text-cyan-400" /> Log a Flight</h2>
              <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pilot *</label>
                  <select value={form.contractor_id} onChange={(e) => { const p = pilots.find((x) => x.id === e.target.value); set("contractor_id", e.target.value); set("contractor_name", p?.name || ""); }} className={inputCls}>
                    <option value="">— Select pilot —</option>
                    {pilots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Job (optional)</label>
                  <select value={form.job_id} onChange={(e) => { const j = jobs.find((x) => x.id === e.target.value); set("job_id", e.target.value); set("job_title", j?.title || ""); }} className={inputCls}>
                    <option value="">— None —</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Flight date *</label>
                  <input type="date" value={form.flight_date} onChange={(e) => set("flight_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duration (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={(e) => set("duration_minutes", Number(e.target.value))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Location</label>
                <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} placeholder="Site address / coordinates" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Airspace</label>
                  <select value={form.airspace_class} onChange={(e) => set("airspace_class", e.target.value)} className={inputCls}>
                    <option value="uncontrolled">Uncontrolled</option>
                    <option value="controlled_laanc">Controlled (LAANC)</option>
                    <option value="controlled">Controlled (no LAANC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Weather</label>
                  <input value={form.weather_conditions} onChange={(e) => set("weather_conditions", e.target.value)} className={inputCls} placeholder="Clear, 5mph wind" />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.laanc_approved} onChange={(e) => set("laanc_approved", e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800" /> LAANC approved</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.weather_minimums_met} onChange={(e) => set("weather_minimums_met", e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800" /> Weather minimums met</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.jha_completed} onChange={(e) => set("jha_completed", e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-800" /> JHA completed</label>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pre-flight checklist</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {form.preflight_checklist.map((c, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded px-2 py-1.5">
                      <input type="checkbox" checked={c.passed} onChange={() => toggleCheck(i)} className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800" /> {c.item}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Incidents / anomalies</label>
                <textarea value={form.incidents} onChange={(e) => set("incidents", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Any incidents, near-misses, or equipment issues" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowLog(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={saveLog} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}