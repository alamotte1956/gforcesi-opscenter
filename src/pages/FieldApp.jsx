import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import {
  Satellite, LogOut, ArrowLeft, Navigation, Clock, MapPin,
  Play, Square, CheckCircle2, Truck, Camera, Flag, User, Briefcase,
} from "lucide-react";

const fieldRoles = ["Field Technician", "Field Pilot"];
const myStatuses = [
  { key: "available", label: "Available", color: "bg-emerald-500" },
  { key: "en_route", label: "En Route", color: "bg-blue-400" },
  { key: "on_site", label: "On Site", color: "bg-amber-400" },
  { key: "off_duty", label: "Off Duty", color: "bg-slate-500" },
];
const order = ["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"];
const statusStyles = {
  scheduled: "bg-slate-700 text-slate-300",
  en_route: "bg-blue-500/15 text-blue-300",
  on_site: "bg-amber-500/15 text-amber-300",
  scanning: "bg-purple-500/15 text-purple-300",
  processing: "bg-indigo-500/15 text-indigo-300",
  complete: "bg-emerald-500/15 text-emerald-300",
  invoiced: "bg-cyan-500/15 text-cyan-300",
};
const advanceLabel = { en_route: "En Route", on_site: "On Site", scanning: "Scanning", processing: "Processing", complete: "Complete" };

const navUrl = (job) => job.latitude != null && job.longitude != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.site_address || "")}`;

const fmtTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function FieldApp() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [contractor, setContractor] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [user, cons] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Contractor.list(),
      ]);
      setMe(user);
      setContractors(cons);
      const matched = cons.find((c) => c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase());
      if (matched) setContractor(matched);
      setLoading(false);
    })();
  }, []);

  const reload = async () => {
    if (!contractor) return;
    const [allJobs, entries, cons] = await Promise.all([
      base44.entities.Job.list(),
      base44.entities.TimeEntry.filter({ contractor_id: contractor.id }),
      base44.entities.Contractor.list(),
    ]);
    setJobs(allJobs);
    setTimeEntries(entries);
    const updated = cons.find((c) => c.id === contractor.id);
    if (updated) setContractor(updated);
  };

  useEffect(() => {
    if (!contractor) return;
    (async () => {
      const [allJobs, entries] = await Promise.all([
        base44.entities.Job.list(),
        base44.entities.TimeEntry.filter({ contractor_id: contractor.id }),
      ]);
      setJobs(allJobs);
      setTimeEntries(entries);
    })();
  }, [contractor?.id]);

  const isAdmin = me?.role === "admin";
  const myJobs = jobs
    .filter((j) => (j.assigned_contractor_ids || []).includes(contractor?.id))
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const openEntry = timeEntries.find((e) => e.status === "open" && e.contractor_id === contractor?.id);
  const activeJob = openEntry ? jobs.find((j) => j.id === openEntry.job_id) : null;

  const elapsed = openEntry ? (now - new Date(openEntry.clock_in).getTime()) : 0;
  const timerStr = `${Math.floor(elapsed / 3600000)}h ${Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, "0")}m`;
  const todayHours = timeEntries
    .filter((e) => e.contractor_id === contractor?.id)
    .reduce((s, e) => s + (e.regular_hours || (e.status === "open" ? elapsed / 3600000 : 0)), 0);

  const setMyStatus = async (s) => {
    await base44.entities.Contractor.update(contractor.id, {
      current_status: s,
      shift_status: s === "off_duty" ? "off_duty" : "on_duty",
    });
    reload();
  };

  const setJobStatus = async (job, status) => {
    await base44.entities.Job.update(job.id, { status });
    const map = {
      en_route: { current_status: "en_route" },
      on_site: { current_status: "on_site" },
      scanning: { current_status: "on_site" },
      processing: { current_status: "on_site" },
      complete: { current_status: "available", current_job_id: "", current_job_title: "" },
    };
    if (map[status]) await base44.entities.Contractor.update(contractor.id, map[status]);
    reload();
  };

  const clockIn = async (job) => {
    if (openEntry) {
      const out = new Date();
      const hours = (out - new Date(openEntry.clock_in)) / 3600000;
      await base44.entities.TimeEntry.update(openEntry.id, {
        clock_out: out.toISOString(), regular_hours: +hours.toFixed(2), status: "submitted",
      });
    }
    await base44.entities.TimeEntry.create({
      contractor_id: contractor.id, contractor_name: contractor.name,
      job_id: job.id, job_title: job.title, project_id: job.project_id, project_name: job.project_name,
      clock_in: new Date().toISOString(), status: "open",
    });
    await base44.entities.Contractor.update(contractor.id, {
      shift_status: "on_duty", current_status: "on_site", current_job_id: job.id, current_job_title: job.title,
    });
    if (["scheduled", "en_route"].includes(job.status)) await base44.entities.Job.update(job.id, { status: "on_site" });
    reload();
  };

  const clockOut = async () => {
    if (!openEntry) return;
    const out = new Date();
    const hours = (out - new Date(openEntry.clock_in)) / 3600000;
    await base44.entities.TimeEntry.update(openEntry.id, {
      clock_out: out.toISOString(), regular_hours: +hours.toFixed(2), status: "submitted",
    });
    await base44.entities.Contractor.update(contractor.id, {
      shift_status: "off_duty", current_status: "available", current_job_id: "", current_job_title: "",
    });
    reload();
  };

  const logout = async () => { await base44.auth.logout(); navigate("/login"); };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-800 border-t-cyan-400 rounded-full animate-spin" /></div>;

  if (!contractor) {
    return (
      <Shell me={me} onLogout={logout}>
        <div className="max-w-md mx-auto mt-16 text-center">
          <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{isAdmin ? "Select a field crew to preview" : "Field access not configured"}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {isAdmin ? "Preview the mobile field app as any crew member." : "Your account isn't linked to a field crew profile. Contact your dispatcher."}
          </p>
          {isAdmin && (
            <select
              value={contractor?.id || ""}
              onChange={(e) => setContractor(contractors.find((c) => c.id === e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full max-w-xs"
            >
              <option value="">Select crew member…</option>
              {contractors.filter((c) => fieldRoles.includes(c.role)).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
            </select>
          )}
        </div>
      </Shell>
    );
  }

  const next = (job) => {
    const i = order.indexOf(job.status);
    if (i < 0 || i >= 5) return null;
    return { status: order[i + 1], label: advanceLabel[order[i + 1]] };
  };

  return (
    <Shell me={me} onLogout={logout} contractor={contractor}>
      {/* Status card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500">Your status</div>
            <div className="text-sm font-medium capitalize">{contractor.current_status?.replace("_", " ")}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Shift</div>
            <div className={`text-sm font-medium ${contractor.shift_status === "on_duty" ? "text-emerald-300" : "text-slate-400"}`}>
              {contractor.shift_status === "on_duty" ? "On Duty" : "Off Duty"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {myStatuses.map((s) => (
            <button
              key={s.key}
              onClick={() => setMyStatus(s.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-medium transition-colors ${
                contractor.current_status === s.key
                  ? "bg-slate-800 border-cyan-500/40 text-slate-100"
                  : "bg-slate-800/40 border-slate-700/50 text-slate-400"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <Clock className="w-4 h-4 text-cyan-400 mb-1.5" />
          <div className="text-xl font-semibold">{todayHours.toFixed(1)}h</div>
          <div className="text-xs text-slate-500">Today</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <Briefcase className="w-4 h-4 text-cyan-400 mb-1.5" />
          <div className="text-xl font-semibold">{myJobs.length}</div>
          <div className="text-xs text-slate-500">Assigned jobs</div>
        </div>
      </div>

      {/* Active shift */}
      {openEntry && (
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-300/80 uppercase tracking-wide">Active shift</div>
              <div className="text-lg font-semibold tabular-nums">{timerStr}</div>
              <div className="text-xs text-slate-400 mt-0.5">{activeJob?.title || openEntry.job_title}</div>
            </div>
            <button onClick={clockOut} className="px-4 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-medium flex items-center gap-1.5">
              <Square className="w-4 h-4" /> Clock Out
            </button>
          </div>
        </div>
      )}

      {/* Jobs */}
      <div className="text-xs font-medium text-slate-400 mb-2">Assigned Jobs</div>
      {myJobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">No jobs assigned yet.</div>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => {
            const n = next(job);
            const isActive = openEntry?.job_id === job.id;
            return (
              <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">{job.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 shrink-0" />{job.site_address || "Remote"}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{job.project_name} {job.scheduled_start && `· ${fmtTime(job.scheduled_start)}`}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full capitalize shrink-0 ${statusStyles[job.status] || statusStyles.scheduled}`}>{job.status?.replace("_", " ")}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <a href={navUrl(job)} target="_blank" rel="noreferrer" className="flex-1 py-2.5 rounded-lg bg-blue-500/15 text-blue-300 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                    <Navigation className="w-4 h-4" /> Navigate
                  </a>
                  {n && (
                    <button onClick={() => setJobStatus(job, n.status)} className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                      {n.status === "complete" ? <CheckCircle2 className="w-4 h-4" /> : n.status === "en_route" ? <Truck className="w-4 h-4" /> : n.status === "scanning" ? <Camera className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                      {n.label}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  {isActive ? (
                    <button onClick={clockOut} className="flex-1 py-2.5 rounded-lg bg-rose-500/15 text-rose-300 text-sm font-medium flex items-center justify-center gap-1.5">
                      <Square className="w-4 h-4" /> Clock Out
                    </button>
                  ) : (
                    <button onClick={() => clockIn(job)} className="flex-1 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-medium flex items-center justify-center gap-1.5">
                      <Play className="w-4 h-4" /> Clock In
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ me, onLogout, contractor, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Satellite className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">GForceSI</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-400/80">Field App</div>
          </div>
          {contractor && <div className="ml-1 text-xs text-slate-400 truncate hidden sm:block">· {contractor.name}</div>}
          <div className="ml-auto flex items-center gap-3">
            {me?.role === "admin" && (
              <Link to="/" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Ops
              </Link>
            )}
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-4 pb-10">{children}</main>
    </div>
  );
}