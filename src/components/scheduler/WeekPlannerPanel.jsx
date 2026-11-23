import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Loader2, Zap, CheckCircle2, AlertTriangle, MapPin, Clock, TrendingUp, Users, Plane } from "lucide-react";
import { runFastGreedySolver } from "./GreedySolver";
import SchedulerRouteMap from "./RouteMap";

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#4A9EFF]";

function mondayOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function WeekPlannerPanel({ projects = [], sites = [], contractors = [], onApplied }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [weekStartDate, setWeekStartDate] = useState(mondayOfWeek());
  const [horizonDays, setHorizonDays] = useState(5);
  const [honorPriority, setHonorPriority] = useState(true);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");

  const eligibleSites = sites.filter((s) => {
    if (s.archived || s.status === "complete") return false;
    if (projectId && s.project_id && s.project_id !== projectId) return false;
    if (regionFilter !== "ALL" && (s.region_zone || "CONUS") !== regionFilter) return false;
    return s.latitude != null && s.longitude != null;
  });

  const handleGenerate = async () => {
    setRunning(true);
    setResult(null);
    try {
      if (eligibleSites.length === 0) {
        throw new Error("No geocoded open sites match this filter. Geocode sites first or switch project/zone.");
      }
      if (contractors.length === 0) {
        throw new Error("No active field contractors available.");
      }
      const solved = await runFastGreedySolver({
        projectId: projectId || "all",
        weekStartDate,
        horizonDays: Number(horizonDays) || 5,
        sites: eligibleSites,
        personnel: contractors,
        honorPriority,
      });
      setResult(solved);
      setSelectedDay(solved.assignments[0]?.assigned_date || weekStartDate);
    } catch (err) {
      setResult({ error: true, message: err.message });
    } finally {
      setRunning(false);
    }
  };

  const handleApplyToJobs = async () => {
    if (!result?.assignments?.length) return;
    setApplying(true);
    try {
      const allJobs = await base44.entities.Job.list();
      for (const a of result.assignments) {
        const existingJob = allJobs.find((j) => j.site_id === a.site_id && !["complete", "invoiced"].includes(j.status));
        const isoStart = `${a.assigned_date}T${a.start_time}:00`;
        if (existingJob) {
          await base44.entities.Job.update(existingJob.id, {
            scheduled_start: isoStart,
            assigned_contractor_ids: [a.contractor_id],
            assigned_contractor_names: [a.contractor_name],
          });
        } else {
          const site = sites.find((s) => s.id === a.site_id);
          if (site) {
            await base44.entities.Job.create({
              title: `${site.branch_code ? `[${site.branch_code}] ` : ""}${site.name} 3D Scan`,
              project_id: site.project_id || projectId || "unassigned",
              project_name: site.project_name || "",
              client_id: site.client_id || "",
              client_name: site.client_name || "",
              agency_id: site.agency_id || "",
              site_id: site.id,
              branch_code: site.branch_code || "",
              region_zone: site.region_zone || "CONUS",
              site_address: site.address,
              latitude: site.latitude,
              longitude: site.longitude,
              estimated_duration_hours: a.service_hours || 2,
              scheduled_start: isoStart,
              assigned_contractor_ids: [a.contractor_id],
              assigned_contractor_names: [a.contractor_name],
              status: "scheduled",
            });
          }
        }
      }
      onApplied?.();
    } finally {
      setApplying(false);
    }
  };

  const uniqueDays = result?.assignments
    ? [...new Set(result.assignments.map((a) => a.assigned_date))].sort()
    : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#4A9EFF]" />
              Multi-Day Greedy + 2-Opt Week Planner
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Clusters branches around crew bases, runs 2-opt tour refinement, and packs multi-day shift windows across CONUS, Alaska & Hawaii.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#126DFA]/15 text-[#4A9EFF] border border-[#126DFA]/30">
            {eligibleSites.length} geocoded sites ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Region Zone</label>
            <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={inputCls}>
              <option value="ALL">All 50 States</option>
              <option value="CONUS">CONUS (Lower 48)</option>
              <option value="AK">Alaska (AK)</option>
              <option value="HI">Hawaii (HI)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Week Start</label>
            <input type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Horizon (Days)</label>
            <input type="number" min="1" max="14" value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={running}
              className="w-full py-2 px-4 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {running ? "Solving..." : "Generate Week Plan"}
            </button>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={honorPriority} onChange={(e) => setHonorPriority(e.target.checked)} className="rounded bg-slate-950 border-slate-700" />
          Prioritize SLA deadlines & high-priority enterprise branches first
        </label>
      </div>

      {result?.error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          {result.message}
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 text-sm text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Scheduled <strong>{result.summary.scheduledSites} / {result.summary.totalSites}</strong> sites ({result.summary.scheduleRate}% coverage) across {uniqueDays.length} day(s).
              </span>
            </div>
            <button
              onClick={handleApplyToJobs}
              disabled={applying || !result.assignments.length}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Commit Schedule to Jobs
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric icon={MapPin} label="Total Travel" value={`${result.kpis.total_travel_distance_km} km`} />
            <Metric icon={Clock} label="Drive Time" value={`${result.kpis.total_travel_time_hr} hr`} />
            <Metric icon={Clock} label="Scan Time" value={`${result.kpis.total_service_time_hr} hr`} />
            <Metric icon={TrendingUp} label="Balance Score" value={(1 - parseFloat(result.kpis.workload_balance_cv)).toFixed(2)} />
          </div>

          {uniqueDays.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {uniqueDays.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      selectedDay === d
                        ? "bg-[#126DFA] border-[#4A9EFF] text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d} ({result.assignments.filter((a) => a.assigned_date === d).length} stops)
                  </button>
                ))}
              </div>
              <SchedulerRouteMap
                assignments={result.assignments}
                sites={eligibleSites}
                personnel={contractors}
                selectedDate={selectedDay}
              />
            </div>
          )}

          {result.kpis.personnel_stats.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#4A9EFF]" /> Crew Workload Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.kpis.personnel_stats.map((st) => (
                  <div key={st.personnel_id} className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{st.personnel_name}</span>
                    <span className="text-slate-400">
                      {st.assignments} stops · {st.total_hours}h · {st.travel_distance_km} km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.unassigned.some((u) => ["AK", "HI"].includes(u.region_zone)) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-400 shrink-0" />
              Unscheduled Alaska/Hawaii branches detected — use the Flight & Travel Bundle drawer to attach airfare/lodging trips.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5">
      <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-[#4A9EFF]" /> {label}
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}
