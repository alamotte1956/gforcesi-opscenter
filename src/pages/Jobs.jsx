import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { LayoutList, Calendar, Plus, GripVertical } from "lucide-react";

const columns = [
  { key: "scheduled", label: "Scheduled", color: "border-t-slate-500" },
  { key: "en_route", label: "En Route", color: "border-t-blue-500" },
  { key: "on_site", label: "On Site", color: "border-t-amber-500" },
  { key: "scanning", label: "Scanning", color: "border-t-purple-500" },
  { key: "processing", label: "Processing", color: "border-t-indigo-500" },
  { key: "complete", label: "Complete", color: "border-t-emerald-500" },
  { key: "invoiced", label: "Invoiced", color: "border-t-cyan-500" },
];

const priorityStyles = {
  urgent: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medium: "bg-slate-700 text-slate-300 border-slate-600",
  low: "bg-slate-800 text-slate-400 border-slate-700",
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");
  const [dragJob, setDragJob] = useState(null);

  const load = async () => {
    const data = await base44.entities.Job.list("-scheduled_start");
    setJobs(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const byColumn = useMemo(() => {
    const map = {};
    columns.forEach((c) => (map[c.key] = []));
    jobs.forEach((j) => { if (map[j.status]) map[j.status].push(j); });
    return map;
  }, [jobs]);

  const onDrop = async (status) => {
    if (!dragJob) return;
    setDragJob(null);
    if (dragJob.status === status) return;
    await base44.entities.Job.update(dragJob.id, { status });
    load();
  };

  return (
    <div className="p-4 lg:p-6 h-screen lg:h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-slate-500">{jobs.length} jobs across {columns.length} stages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "board" ? "bg-slate-800 text-slate-100" : "text-slate-500"}`}
            >
              <LayoutList className="w-4 h-4" /> Board
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "calendar" ? "bg-slate-800 text-slate-100" : "text-slate-500"}`}
            >
              <Calendar className="w-4 h-4" /> Calendar
            </button>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Job
          </button>
        </div>
      </div>

      {view === "board" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max h-full">
            {columns.map((col) => (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col.key)}
                className="w-72 shrink-0 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col"
              >
                <div className={`px-3 py-2.5 border-t-2 ${col.color} rounded-t-xl flex items-center justify-between`}>
                  <span className="text-sm font-medium text-slate-300">{col.label}</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{byColumn[col.key].length}</span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto flex-1">
                  {byColumn[col.key].map((job) => (
                    <div
                      key={job.id}
                      draggable
                      onDragStart={() => setDragJob(job)}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 group"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-200 leading-snug">{job.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">{job.site_address}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${priorityStyles[job.priority] || priorityStyles.medium}`}>
                          {job.priority}
                        </span>
                        <span className="text-xs text-slate-500">{job.project_name}</span>
                      </div>
                      {job.assigned_employee_names?.length > 0 && (
                        <div className="flex -space-x-1.5 mt-2">
                          {job.assigned_employee_names.slice(0, 3).map((n, i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-[10px] font-semibold">
                              {n.charAt(0)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {byColumn[col.key].length === 0 && (
                    <div className="text-center text-xs text-slate-600 py-6">Drop jobs here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <CalendarView jobs={jobs} />
      )}
    </div>
  );
}

function CalendarView({ jobs }) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  return (
    <div className="flex-1 grid grid-cols-7 gap-2 overflow-y-auto">
      {days.map((day) => {
        const dayJobs = jobs.filter((j) => j.scheduled_start && new Date(j.scheduled_start).toDateString() === day.toDateString());
        return (
          <div key={day.toISOString()} className="bg-slate-900/60 rounded-lg border border-slate-800 p-2 min-h-[200px]">
            <div className="text-xs text-slate-500 mb-2">
              {day.toLocaleDateString("en-US", { weekday: "short" })} {day.getDate()}
            </div>
            <div className="space-y-1.5">
              {dayJobs.map((j) => (
                <div key={j.id} className="bg-slate-800 border border-slate-700 rounded p-1.5 text-xs">
                  <div className="font-medium text-slate-200 truncate">{j.title}</div>
                  <div className="text-slate-500 truncate">{j.site_address}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}