import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ScanLine, RefreshCw, Loader2, ExternalLink, AlertCircle } from "lucide-react";

export default function Matterport() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const [p, j] = await Promise.all([base44.entities.Project.list(), base44.entities.Job.list("-matterport_synced_at")]);
    setProjects(p);
    setJobs(j.filter((x) => x.matterport_model_id));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sync = async () => {
    if (!projectId) { setError("Select a project first."); return; }
    setSyncing(true); setError(""); setResult(null);
    try {
      const res = await base44.functions.invoke("syncMatterportModels", { project_id: projectId });
      setResult(res.data);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2"><ScanLine className="w-5 h-5 text-cyan-400" /> Matterport</h1>
        <p className="text-sm text-slate-500">Sync 3D models from Matterport and link them to jobs</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-sm font-medium mb-3">Sync models into a project</div>
        <div className="flex gap-2 flex-wrap">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]">
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={sync} disabled={syncing} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync now
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Requires Matterport API credentials in Settings → Environment Variables. New scans become jobs in the selected project; existing linked jobs update their model URL and status.</p>
        {error && <div className="mt-3 text-sm text-rose-300 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        {result && <div className="mt-3 text-sm text-emerald-300">Sync complete — {result.created} new, {result.updated} updated, {result.total} models found.</div>}
      </div>

      <div className="text-sm font-medium text-slate-300 mb-3">Linked models ({jobs.length})</div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">No Matterport models linked yet. Field crews can also attach a model URL from the Field App when completing a scan.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((j) => (
            <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="aspect-video bg-slate-800">
                <iframe src={j.matterport_embed_url} title={j.title} className="w-full h-full" loading="lazy" allowFullScreen allow="xr-spatial-tracking" />
              </div>
              <div className="p-3">
                <div className="font-medium text-sm truncate">{j.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{j.project_name || "—"}</div>
                <div className="flex items-center justify-between mt-2">
                  <Link to={`/jobs/${j.id}`} className="text-xs text-cyan-400 hover:text-cyan-300">Job details</Link>
                  <a href={j.matterport_share_url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />Open</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}