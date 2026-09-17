import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { MapPin, Briefcase, Clock, Loader2, Radio, Navigation } from "lucide-react";

const statusStyles = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  en_route: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  on_site: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  off_duty: "bg-slate-600/20 text-slate-400 border-slate-600/40",
};
const shiftStyles = {
  on_duty: "text-emerald-300",
  on_break: "text-amber-300",
  off_duty: "text-slate-500",
};

export default function ContractorBoard() {
  const [contractors, setContractors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const [cons, ps] = await Promise.all([
          base44.entities.Contractor.list(),
          base44.entities.Payout.list("-date", 500),
        ]);
        setContractors(cons);
        setPayouts(ps);
      } catch (e) {}
      setLoading(false);
    })();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const weekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now]);
  const weekEnd = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [now]);

  const hoursByContractor = useMemo(() => {
    const map = {};
    payouts.forEach((p) => {
      if (!p.contractor_id || !p.date) return;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) return;
      if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) return;
      map[p.contractor_id] = (map[p.contractor_id] || 0) + (Number(p.hours) || 0);
    });
    return map;
  }, [payouts, weekStart, weekEnd]);

  const sorted = useMemo(() => {
    const rank = { on_site: 0, en_route: 1, available: 2, off_duty: 3 };
    return [...contractors].sort((a, b) => (rank[a.current_status] ?? 9) - (rank[b.current_status] ?? 9) || a.name.localeCompare(b.name));
  }, [contractors]);

  const onDutyCount = contractors.filter((c) => c.shift_status === "on_duty").length;
  const onSiteCount = contractors.filter((c) => c.current_status === "on_site").length;
  const totalHours = Object.values(hoursByContractor).reduce((s, h) => s + h, 0);
  const sharingCount = contractors.filter((c) => c.location_sharing && c.current_latitude != null).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Radio className="w-5 h-5 text-cyan-400" /> Contractor Status Board</h1>
        <p className="text-sm text-slate-500">Live snapshot of every crew member — status, location, current job, and hours logged this week.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat icon={Radio} label="On duty" value={onDutyCount} accent="text-emerald-400" />
        <Stat icon={MapPin} label="On site" value={onSiteCount} accent="text-amber-400" />
        <Stat icon={Navigation} label="Sharing location" value={sharingCount} accent="text-blue-400" />
        <Stat icon={Clock} label="Hours this week" value={totalHours.toFixed(1)} accent="text-cyan-400" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Contractor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Shift</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Current job</th>
              <th className="px-4 py-3 font-medium text-right">Hrs (wk)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const hasGeo = c.current_latitude != null && c.current_longitude != null;
              const mapsUrl = hasGeo
                ? `https://www.google.com/maps?q=${c.current_latitude},${c.current_longitude}`
                : null;
              const hrs = hoursByContractor[c.id] || 0;
              return (
                <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded border capitalize ${statusStyles[c.current_status] || statusStyles.off_duty}`}>
                      {(c.current_status || "off_duty").replace("_", " ")}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium capitalize ${shiftStyles[c.shift_status] || "text-slate-500"}`}>
                    {(c.shift_status || "off_duty").replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    {hasGeo ? (
                      <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.current_latitude.toFixed(4)}, {c.current_longitude.toFixed(4)}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.current_job_title ? (
                      <span className="text-slate-300 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-500" />{c.current_job_title}</span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${hrs > 40 ? "text-amber-300" : "text-slate-100"}`}>{hrs.toFixed(1)}</span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No contractors found.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 mt-3">Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Hours over 40 are highlighted. Status & location update live from the field app.</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mb-3 ${accent}`}><Icon className="w-5 h-5" /></div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}