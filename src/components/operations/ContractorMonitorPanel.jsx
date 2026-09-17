import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, MapPinOff, UserX, ShieldAlert } from "lucide-react";

const EN_ROUTE_STALL_MIN = 45;
const STALE_LOCATION_MIN = 30;
const ACTIVE_JOB_STATUSES = ["en_route", "on_site", "scanning", "processing"];

export default function ContractorMonitorPanel({ contractors = [], jobs = [] }) {
  const anomalies = useMemo(() => {
    const now = Date.now();
    const out = [];
    for (const c of contractors) {
      if (!c?.id) continue;
      const myActiveJob = jobs.find((j) => ACTIVE_JOB_STATUSES.includes(j.status) && (j.assigned_contractor_ids || []).includes(c.id));

      if (c.current_status === "off_duty" && myActiveJob) {
        out.push({ c, type: "off_duty_mid_job", icon: UserX, accent: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20", msg: `Off Duty but on active job "${myActiveJob.title}"` });
      }
      if (c.current_status === "en_route" && c.last_status_at) {
        const mins = (now - new Date(c.last_status_at).getTime()) / 60000;
        if (mins >= EN_ROUTE_STALL_MIN) out.push({ c, type: "en_route_stall", icon: Clock, accent: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20", msg: `En Route for ${Math.round(mins)} min` });
      }
      if (c.location_sharing) {
        const hasCoords = c.current_latitude != null && c.current_longitude != null;
        const locAge = c.last_location_at ? (now - new Date(c.last_location_at).getTime()) / 60000 : null;
        if (!hasCoords || locAge == null || locAge >= STALE_LOCATION_MIN) {
          out.push({ c, type: "stale_location", icon: MapPinOff, accent: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20", msg: `Location stale${locAge != null ? ` · ${Math.round(locAge)} min` : " · no fix"}` });
        }
      }
    }
    return out;
  }, [contractors, jobs]);

  if (!anomalies.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-emerald-300">
        <ShieldAlert className="w-4 h-4" /> All contractors nominal — no status anomalies detected.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold">Status Monitor</span>
        <span className="text-xs text-slate-500">{anomalies.length} active alert{anomalies.length > 1 ? "s" : ""}</span>
        <Link to="/issues" className="ml-auto text-xs text-cyan-300 hover:text-cyan-200">View Issues →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {anomalies.map((a, i) => (
          <div key={i} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${a.bg}`}>
            <a.icon className={`w-4 h-4 shrink-0 ${a.accent}`} />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-100 truncate">{a.c.name}</div>
              <div className="text-xs text-slate-400 truncate">{a.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}