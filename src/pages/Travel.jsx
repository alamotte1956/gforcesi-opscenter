import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useSearchParams } from "react-router-dom";
import { Plane, Plus, Pencil, Trash2, MapPin, Calendar, Users } from "lucide-react";
import TripForm from "@/components/travel/TripForm";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  draft: "bg-slate-700 text-slate-300",
  estimated: "bg-cyan-500/15 text-cyan-300",
  quoted: "bg-amber-500/15 text-amber-300",
  booked: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
};

const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";
const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

export default function Travel() {
  const [trips, setTrips] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [params] = useSearchParams();
  const presetJobId = params.get("job_id");
  const { toast } = useToast();

  const load = async () => {
    const [t, j] = await Promise.all([
      base44.entities.Trip.list("-created_date").catch(() => []),
      base44.entities.Job.list().catch(() => []),
    ]);
    setTrips(t); setJobs(j); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ job_id: presetJobId || "" }); setFormOpen(true); };
  const openEdit = (t) => { setEditing(t); setFormOpen(true); };
  const remove = async (t) => { if (!confirm(`Delete trip to ${t.destination_city}?`)) return; await base44.entities.Trip.delete(t.id); toast({ title: "Trip deleted" }); load(); };

  const totalTrips = trips.length;
  const totalSpend = trips.reduce((s, t) => s + (Number(t.total_cost) || 0), 0);
  const booked = trips.filter((t) => ["booked", "completed"].includes(t.status)).length;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Plane className="w-5 h-5 text-cyan-400" /> Travel & Logistics</h1>
          <p className="text-sm text-slate-500">{totalTrips} trips · {booked} booked · {fmtMoney(totalSpend)} estimated total spend</p>
        </div>
        <button onClick={openNew} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> Plan Trip
        </button>
      </div>

      {presetJobId && (
        <div className="mb-4 text-xs text-cyan-300/90 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2.5">
          Pre-linked to a job from the detail page — pick it in the form.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : trips.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <Plane className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No trips planned yet.</div>
          <div className="text-xs text-slate-500 mt-1">Click “Plan Trip” to estimate flight, lodging, and per-diem costs for a remote job.</div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Crew</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Est. Total</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.origin_city || "—"}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-medium">{t.destination_city || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.job_id ? (
                      <Link to={`/jobs/${t.job_id}`} className="text-cyan-400 hover:text-cyan-300 truncate block max-w-[180px]">{t.job_title || "Job"}</Link>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(t.depart_date)}{t.return_date ? ` – ${fmtDate(t.return_date)}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400"><span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.crew_count || 1}</span></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[t.status] || statusStyles.draft}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-cyan-300">{fmtMoney(t.total_cost)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(t)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <TripForm
          initial={editing}
          jobs={jobs}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}
    </div>
  );
}