import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, Loader2, Sparkles, Plane } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const empty = {
  job_id: "", origin_city: "", destination_city: "", depart_date: "", return_date: "",
  crew_count: 1, flight_options: [], selected_flight_index: -1,
  ground_transport_cost: 0, lodging_cost_per_night: 0, lodging_nights: 0,
  per_diem_rate: 0, per_diem_days: 0, other_costs: [], status: "draft", notes: "",
  estimate_flight_typical: null, estimate_lodging_per_night: null,
  estimate_per_diem: null, estimate_notes: "",
};

export function computeTotal(t) {
  const crew = Number(t.crew_count) || 1;
  const flightIdx = Number(t.selected_flight_index);
  const flight = flightIdx >= 0 && t.flight_options[flightIdx] ? Number(t.flight_options[flightIdx].price) || 0 : 0;
  const flightTotal = flight * crew;
  const ground = Number(t.ground_transport_cost) || 0;
  const lodging = (Number(t.lodging_cost_per_night) || 0) * (Number(t.lodging_nights) || 0) * crew;
  const perdiem = (Number(t.per_diem_rate) || 0) * (Number(t.per_diem_days) || 0) * crew;
  const other = (t.other_costs || []).reduce((s, o) => s + (Number(o.amount) || 0), 0);
  return { flight, flightTotal, ground, lodging, perdiem, other, total: flightTotal + ground + lodging + perdiem + other };
}

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function TripForm({ initial, jobs, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...empty,
    ...(initial || {}),
    flight_options: (initial?.flight_options || []).map((o) => ({ ...o })),
    other_costs: (initial?.other_costs || []).map((o) => ({ ...o })),
    selected_flight_index: initial?.selected_flight_index ?? -1,
  }));
  const [saving, setSaving] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const { toast } = useToast();
  const totals = computeTotal(form);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setFlight = (i, k, v) => setForm((f) => {
    const fo = [...f.flight_options]; fo[i] = { ...fo[i], [k]: v }; return { ...f, flight_options: fo };
  });
  const addFlight = () => setForm((f) => ({ ...f, flight_options: [...f.flight_options, { airline: "", flight_no: "", depart_time: "", arrive_time: "", stops: "Nonstop", price: 0, booking_url: "", notes: "" }] }));
  const removeFlight = (i) => setForm((f) => {
    const fo = f.flight_options.filter((_, idx) => idx !== i);
    let sel = f.selected_flight_index;
    if (sel === i) sel = -1; else if (sel > i) sel = sel - 1;
    return { ...f, flight_options: fo, selected_flight_index: sel };
  });
  const setOther = (i, k, v) => setForm((f) => { const oc = [...f.other_costs]; oc[i] = { ...oc[i], [k]: v }; return { ...f, other_costs: oc }; });
  const addOther = () => setForm((f) => ({ ...f, other_costs: [...f.other_costs, { label: "", amount: 0 }] }));
  const removeOther = (i) => setForm((f) => ({ ...f, other_costs: f.other_costs.filter((_, idx) => idx !== i) }));

  const estimate = async () => {
    if (!form.origin_city || !form.destination_city) { toast({ title: "Enter origin & destination first", variant: "destructive" }); return; }
    setEstimating(true);
    try {
      const res = await base44.functions.invoke("estimateTravelCost", {
        origin_city: form.origin_city, destination_city: form.destination_city,
        depart_date: form.depart_date, return_date: form.return_date, crew_count: form.crew_count,
      });
      const e = res.data?.estimate;
      if (!e) { toast({ title: "Estimate failed", description: res.data?.error || "No estimate returned", variant: "destructive" }); return; }
      setForm((f) => ({
        ...f,
        estimate_flight_typical: e.flight_typical,
        estimate_lodging_per_night: e.lodging_per_night_typical,
        estimate_per_diem: e.per_diem_per_day,
        estimate_notes: e.notes || "",
        lodging_cost_per_night: f.lodging_cost_per_night || e.lodging_per_night_typical || f.lodging_cost_per_night,
        per_diem_rate: f.per_diem_rate || e.per_diem_per_day || f.per_diem_rate,
        status: f.status === "draft" ? "estimated" : f.status,
      }));
      toast({ title: "AI estimate ready", description: `Typical flight ${fmtMoney(e.flight_typical)} · lodging ${fmtMoney(e.lodging_per_night_typical)}/night` });
    } catch (e) { toast({ title: "Estimate failed", description: e.message, variant: "destructive" }); }
    setEstimating(false);
  };

  const save = async () => {
    if (!form.origin_city || !form.destination_city || !form.depart_date) { toast({ title: "Origin, destination and depart date required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const job = jobs.find((j) => j.id === form.job_id);
      const payload = {
        ...form,
        job_id: form.job_id || undefined,
        job_title: job?.title || form.job_title || undefined,
        project_name: job?.project_name || undefined,
        client_name: job?.client_name || undefined,
        crew_count: Number(form.crew_count) || 1,
        selected_flight_index: Number(form.selected_flight_index),
        total_cost: totals.total,
      };
      if (initial?.id) await base44.entities.Trip.update(initial.id, payload);
      else await base44.entities.Trip.create(payload);
      toast({ title: initial?.id ? "Trip updated" : "Trip created" });
      onSaved();
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><Plane className="w-4 h-4 text-cyan-400" /> {initial?.id ? "Edit Trip" : "Plan Travel"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Linked job (optional)</label>
              <select value={form.job_id} onChange={(e) => set("job_id", e.target.value)} className={inputCls}>
                <option value="">— Standalone trip —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` · ${j.client_name}` : ""}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Origin city *</label><input value={form.origin_city} onChange={(e) => set("origin_city", e.target.value)} className={inputCls} placeholder="Minneapolis, MN" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Destination city *</label><input value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} className={inputCls} placeholder="Denver, CO" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Depart date *</label><input type="date" value={form.depart_date} onChange={(e) => set("depart_date", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Return date</label><input type="date" value={form.return_date} onChange={(e) => set("return_date", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Crew size</label><input type="number" min="1" value={form.crew_count} onChange={(e) => set("crew_count", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                {["draft", "estimated", "quoted", "booked", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={estimate} disabled={estimating} className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 hover:bg-cyan-500/25 disabled:opacity-50">
              {estimating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Get AI cost estimate
            </button>
            {form.estimate_flight_typical != null && (
              <span className="text-xs text-slate-400">
                Typical: flight {fmtMoney(form.estimate_flight_typical)} · lodging {fmtMoney(form.estimate_lodging_per_night)}/night · per-diem {fmtMoney(form.estimate_per_diem)}/day
              </span>
            )}
          </div>
          {form.estimate_notes && <div className="text-[11px] text-slate-500 bg-slate-950 border border-slate-800 rounded-lg p-2">{form.estimate_notes}</div>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium">Flight options (manual entry)</label>
              <button onClick={addFlight} className="text-xs text-cyan-300 flex items-center gap-1 hover:text-cyan-200"><Plus className="w-3.5 h-3.5" /> Add flight</button>
            </div>
            <div className="space-y-2">
              {form.flight_options.length === 0 && <div className="text-xs text-slate-500">No flights added yet — add options you found and pick one to use in the total.</div>}
              {form.flight_options.map((f, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <input type="radio" name="selflight" checked={Number(form.selected_flight_index) === i} onChange={() => set("selected_flight_index", i)} className="w-4 h-4" title="Use this flight in total" />
                    <span className="text-[10px] text-slate-500">Use in total</span>
                    <button onClick={() => removeFlight(i)} className="ml-auto text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input value={f.airline} onChange={(e) => setFlight(i, "airline", e.target.value)} className={inputCls} placeholder="Airline" />
                    <input value={f.flight_no} onChange={(e) => setFlight(i, "flight_no", e.target.value)} className={inputCls} placeholder="Flight #" />
                    <input value={f.depart_time} onChange={(e) => setFlight(i, "depart_time", e.target.value)} className={inputCls} placeholder="Depart" />
                    <input value={f.arrive_time} onChange={(e) => setFlight(i, "arrive_time", e.target.value)} className={inputCls} placeholder="Arrive" />
                    <input value={f.stops} onChange={(e) => setFlight(i, "stops", e.target.value)} className={inputCls} placeholder="Stops" />
                    <input type="number" value={f.price} onChange={(e) => setFlight(i, "price", e.target.value)} className={inputCls} placeholder="Price /person" />
                    <input value={f.booking_url} onChange={(e) => setFlight(i, "booking_url", e.target.value)} className={inputCls} placeholder="Booking URL" />
                    <input value={f.notes} onChange={(e) => setFlight(i, "notes", e.target.value)} className={inputCls} placeholder="Notes" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Ground transport $</label><input type="number" value={form.ground_transport_cost} onChange={(e) => set("ground_transport_cost", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Lodging $/night</label><input type="number" value={form.lodging_cost_per_night} onChange={(e) => set("lodging_cost_per_night", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Lodging nights</label><input type="number" value={form.lodging_nights} onChange={(e) => set("lodging_nights", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Per-diem $/day</label><input type="number" value={form.per_diem_rate} onChange={(e) => set("per_diem_rate", e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Per-diem days</label><input type="number" value={form.per_diem_days} onChange={(e) => set("per_diem_days", e.target.value)} className={inputCls} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium">Other costs</label>
              <button onClick={addOther} className="text-xs text-cyan-300 flex items-center gap-1 hover:text-cyan-200"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            <div className="space-y-2">
              {form.other_costs.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={o.label} onChange={(e) => setOther(i, "label", e.target.value)} className={inputCls} placeholder="Label (e.g. rental car)" />
                  <input type="number" value={o.amount} onChange={(e) => setOther(i, "amount", e.target.value)} className={`${inputCls} w-32`} placeholder="Amount" />
                  <button onClick={() => removeOther(i)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>

          <div><label className="block text-xs text-slate-400 mb-1">Notes</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Flights ({form.crew_count} crew × {fmtMoney(totals.flight)})</span><span className="text-slate-300">{fmtMoney(totals.flightTotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ground transport</span><span className="text-slate-300">{fmtMoney(totals.ground)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Lodging</span><span className="text-slate-300">{fmtMoney(totals.lodging)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Per-diem</span><span className="text-slate-300">{fmtMoney(totals.perdiem)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Other</span><span className="text-slate-300">{fmtMoney(totals.other)}</span></div>
            <div className="flex justify-between pt-1 border-t border-slate-800 font-medium"><span className="text-slate-300">Estimated total</span><span className="text-cyan-300 text-base">{fmtMoney(totals.total)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plane className="w-4 h-4" />} {initial?.id ? "Save trip" : "Create trip"}
          </button>
        </div>
      </div>
    </div>
  );
}