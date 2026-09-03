import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Navigation2, Briefcase, ChevronRight } from "lucide-react";

const statusStyles = {
  scheduled: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  en_route: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  on_site: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  scanning: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  processing: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  complete: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  invoiced: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";

export default function MySchedule() {
  const [me, setMe] = useState(null);
  const [contractor, setContractor] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        if (!user?.email) { setLoading(false); return; }
        const cons = await base44.entities.Contractor.filter({ email: user.email });
        const myContractor = cons[0] || null;
        setContractor(myContractor);
        const allJobs = await base44.entities.Job.list();
        const myJobs = myContractor
          ? allJobs.filter((j) => (j.assigned_contractor_ids || []).includes(myContractor.id))
          : [];
        setJobs(myJobs);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const byDate = {};
    jobs.forEach((j) => {
      const key = j.scheduled_start ? new Date(j.scheduled_start).toDateString() : "Unscheduled";
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(j);
    });
    return Object.entries(byDate).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [jobs]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return jobs.filter((j) => j.scheduled_start && new Date(j.scheduled_start) >= now && !["complete", "invoiced"].includes(j.status)).length;
  }, [jobs]);

  const active = useMemo(() => jobs.filter((j) => ["en_route", "on_site", "scanning", "processing"].includes(j.status)).length, [jobs]);
  const done = useMemo(() => jobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length, [jobs]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">My Schedule & Routing</h1>
          <p className="text-sm text-slate-500">{contractor ? contractor.name : me?.full_name || me?.email || "Your"} assignments</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5 mb-6">
        <StatCard icon={Clock} label="Upcoming" value={upcoming} accent="text-blue-400" />
        <StatCard icon={Navigation2} label="Active Now" value={active} accent="text-amber-400" />
        <StatCard icon={Briefcase} label="Completed" value={done} accent="text-emerald-400" />
      </div>

      {!contractor && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mb-6">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No contractor profile linked to your account.</div>
          <div className="text-xs text-slate-500 mt-1">Contact your administrator to link your contractor record.</div>
        </div>
      )}

      {contractor && grouped.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No jobs assigned to you yet.</div>
        </div>
      )}

      <div className="space-y-5">
        {grouped.map(([date, dayJobs]) => (
          <div key={date}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
              {new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div className="space-y-2">
              {dayJobs.sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start)).map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="text-center shrink-0 w-16">
                      <div className="text-lg font-semibold text-slate-200">{fmtTime(j.scheduled_start)}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{j.scheduled_end ? fmtTime(j.scheduled_end) : ""}</div>
                    </div>
                    <div className="w-px h-10 bg-slate-800" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 truncate">{j.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize shrink-0 ${statusStyles[j.status] || ""}`}>{j.status?.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{j.site_address || "—"}</span>
                      </div>
                      {j.project_name && <div className="text-xs text-cyan-400/70 mt-0.5">{j.project_name}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}