import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, FolderKanban } from "lucide-react";

const statusStyles = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  on_hold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-slate-700 text-slate-300 border-slate-600",
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [p, j] = await Promise.all([base44.entities.Project.list(), base44.entities.Job.list()]);
    setProjects(p);
    setJobs(j);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">{projects.length} projects</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const pJobs = jobs.filter((j) => j.project_id === p.id);
            const done = pJobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
            const pct = pJobs.length ? Math.round((done / pJobs.length) * 100) : 0;
            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.client_name}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[p.status] || statusStyles.active}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </div>
                {p.description && <p className="text-sm text-slate-400 mt-3 line-clamp-2">{p.description}</p>}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{done}/{pJobs.length} jobs complete</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-slate-500">
                  <span>📍 {p.region || "—"}</span>
                  <span>{pJobs.length} jobs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}