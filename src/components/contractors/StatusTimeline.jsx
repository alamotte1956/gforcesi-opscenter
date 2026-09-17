import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, History, Loader2 } from "lucide-react";

const eventStyles = {
  status_change: { color: "text-blue-300", label: "Status" },
  shift_clock_in: { color: "text-emerald-300", label: "Clock In" },
  shift_clock_out: { color: "text-slate-300", label: "Clock Out" },
  location_update: { color: "text-cyan-300", label: "Location" },
  anomaly: { color: "text-rose-300", label: "Anomaly" },
};

const fmt = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function StatusTimeline({ contractor, onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await base44.entities.ContractorStatusEvent.list("-timestamp", 100);
        setEvents((all || []).filter((e) => e.contractor_id === contractor.id));
      } catch (e) {}
      setLoading(false);
    })();
  }, [contractor.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-semibold">{contractor.name} — Status Timeline</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : events.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">No status events logged yet.</div>
        ) : (
          <ol className="relative border-l border-slate-800 ml-1 space-y-3">
            {events.map((e) => {
              const s = eventStyles[e.event_type] || eventStyles.status_change;
              return (
                <li key={e.id} className="ml-4">
                  <span className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 border-slate-900 bg-slate-700`} />
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-slate-500">{fmt(e.timestamp)}</span>
                  </div>
                  <div className="text-sm text-slate-200 mt-0.5">
                    {e.event_type === "status_change" && <>Status → <span className="capitalize">{e.status?.replace("_", " ")}</span></>}
                    {e.event_type === "shift_clock_in" && <>Clocked in {e.shift_status === "on_duty" ? "(On Duty)" : ""}</>}
                    {e.event_type === "shift_clock_out" && <>Clocked out</>}
                    {e.event_type === "location_update" && <>Location updated {e.latitude != null ? `(${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)})` : ""}</>}
                    {e.event_type === "anomaly" && e.note}
                    {e.note && e.event_type !== "anomaly" && <span className="text-slate-500"> · {e.note}</span>}
                  </div>
                  {e.job_title && <div className="text-xs text-slate-500">Job: {e.job_title}</div>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}