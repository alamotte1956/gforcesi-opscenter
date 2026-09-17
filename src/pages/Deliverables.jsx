import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Check, X, ScanLine, FileText, Loader2, Eye, CheckCircle2, RotateCcw, Send, ClipboardCheck, ShieldCheck, ExternalLink, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  processing: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  ready: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  delivered: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  rescan: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
const qaStyles = {
  pending: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  passed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  failed: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  rescan: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
const typeLabels = { "3d_model": "3D Model", floorplan: "Floorplan", pointcloud: "Point Cloud", photos: "Photos", other: "Other" };
const QA_CHECKLIST = [
  "Full coverage — all rooms and areas scanned",
  "No motion blur or people in frames",
  "Scan alignment correct (no drift)",
  "Lighting balanced, no overexposure",
  "Markers/tags placed correctly",
  "Dollhouse & floorplan generated cleanly",
];
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

function blankForm() { return { job_id: "", deliverable_type: "3d_model", matterport_model_id: "", share_url: "", embed_url: "", download_url: "", notes: "" }; }

export default function Deliverables() {
  const [deliverables, setDeliverables] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [qaFor, setQaFor] = useState(null);
  const [qaNotes, setQaNotes] = useState("");
  const [qaChecklist, setQaChecklist] = useState([]);
  const [qaAcknowledge, setQaAcknowledge] = useState(false);
  const [busy, setBusy] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";
  const jobMap = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const qaQueue = deliverables.filter((d) => d.qa_status === "pending" && !["accepted", "rejected"].includes(d.status));

  const load = async () => {
    const [d, j, u] = await Promise.all([
      base44.entities.Deliverable.list("-created_date", 100).catch(() => []),
      base44.entities.Job.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setDeliverables(d); setJobs(j); setMe(u); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedJob = jobs.find((j) => j.id === form.job_id);

  const create = async () => {
    if (!form.job_id) { toast({ title: "Select a job", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.Deliverable.create({
        ...form,
        job_title: selectedJob?.title || "",
        project_id: selectedJob?.project_id || "",
        project_name: selectedJob?.project_name || "",
        client_id: selectedJob?.client_id || "",
        client_name: selectedJob?.client_name || "",
        site_address: selectedJob?.site_address || "",
        status: "processing",
        qa_status: "pending",
      });
      toast({ title: "Deliverable created" });
      setShowCreate(false); setForm(blankForm());
      load();
    } catch (e) { toast({ title: "Create failed", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const setQA = async (d, qa_status) => {
    setBusy(d.id);
    try {
      const patch = {
        qa_status,
        qa_notes: qaNotes || d.qa_notes || "",
        status: qa_status === "rescan" ? "rescan" : qa_status === "passed" ? "ready" : d.status,
      };
      if (qa_status === "passed") {
        patch.qa_reviewer = me?.full_name || me?.email || "";
        patch.qa_signed_at = new Date().toISOString();
        patch.qa_checklist = qaChecklist;
      }
      await base44.entities.Deliverable.update(d.id, patch);
      toast({ title: qa_status === "passed" ? "QA signed off — ready to deliver" : `QA marked: ${qa_status}` });
      setQaFor(null); setQaNotes(""); setQaChecklist([]); setQaAcknowledge(false);
      load();
    } catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  const deliver = async (d) => {
    setBusy(d.id);
    try {
      await base44.entities.Deliverable.update(d.id, { status: "delivered", delivered_at: new Date().toISOString() });
      try { await base44.functions.invoke("notifyClientDeliverableReady", { deliverable_id: d.id }); } catch {}
      toast({ title: "Delivered to client", description: d.job_title });
      load();
    } catch (e) { toast({ title: "Deliver failed", description: e.message, variant: "destructive" }); }
    setBusy(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><ScanLine className="w-5 h-5 text-cyan-400" /> Deliverables & QA</h1>
          <p className="text-sm text-slate-500">{deliverables.length} deliverables · {qaQueue.length} waiting on QA · scan → process → QA → deliver → client acceptance</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Deliverable
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : deliverables.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <ScanLine className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No deliverables yet.</div>
          {isAdmin && <div className="text-xs text-slate-500 mt-1">Create a deliverable from a completed scan, run QA, then deliver it to the client for acceptance.</div>}
        </div>
      ) : (
        <>
        {qaQueue.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Waiting on QA · {qaQueue.length}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {qaQueue.map((d) => {
                const job = jobMap[d.job_id];
                const who = (job?.assigned_contractor_names || []).join(", ") || "Unassigned";
                return (
                  <div key={d.id} className="bg-slate-900 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">QA Pending</span>
                      <span className="text-[10px] text-slate-500">{typeLabels[d.deliverable_type] || d.deliverable_type}</span>
                    </div>
                    <div className="font-medium text-slate-200 text-sm truncate">{d.job_title || "—"}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{d.client_name}{d.site_address ? ` · ${d.site_address}` : ""}</div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5"><User className="w-3 h-3" /> {who}</div>
                    <button onClick={() => { setQaFor(d); setQaNotes(d.qa_notes || ""); setQaChecklist(QA_CHECKLIST.map((item) => ({ item, passed: false }))); setQaAcknowledge(false); }} className="mt-3 w-full px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-medium hover:bg-cyan-400 flex items-center justify-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Open & Review
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Job / Client</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">QA</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d) => (
                <tr key={d.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200">{d.job_title || "—"}</div>
                    <div className="text-xs text-slate-500">{d.client_name}{d.site_address ? ` · ${d.site_address}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{typeLabels[d.deliverable_type] || d.deliverable_type}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[d.status] || statusStyles.processing}`}>{d.status}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${qaStyles[d.qa_status] || qaStyles.pending}`}>{d.qa_status}</span>
                    {d.qa_reviewer && <div className="text-[10px] text-slate-500 mt-1">by {d.qa_reviewer}{d.qa_signed_at ? ` · ${new Date(d.qa_signed_at).toLocaleDateString()}` : ""}</div>}
                    {d.qa_notes && <div className="text-[10px] text-slate-500 mt-1 max-w-[180px] truncate">{d.qa_notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {busy === d.id && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                      {d.embed_url && (
                        <button onClick={() => setViewing(d)} title="View model" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"><Eye className="w-4 h-4" /></button>
                      )}
                      {isAdmin && (
                        <>
                          {["pending", "failed", "rescan"].includes(d.qa_status) && (
                            <button onClick={() => { setQaFor(d); setQaNotes(d.qa_notes || ""); setQaChecklist(QA_CHECKLIST.map((item) => ({ item, passed: false }))); setQaAcknowledge(false); }} title="Run QA" className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> QA</button>
                          )}
                          {d.qa_status === "passed" && !["delivered", "accepted", "rejected"].includes(d.status) && (
                            <button onClick={() => deliver(d)} title="Deliver to client" className="px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-1 hover:bg-cyan-500/25"><Send className="w-3 h-3" /> Deliver</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><ScanLine className="w-4 h-4 text-cyan-400" /> New Deliverable</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Job *</label>
                <select value={form.job_id} onChange={(e) => set("job_id", e.target.value)} className={inputCls}>
                  <option value="">— Select a job —</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` · ${j.client_name}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Deliverable type</label>
                <select value={form.deliverable_type} onChange={(e) => set("deliverable_type", e.target.value)} className={inputCls}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Matterport model ID</label>
                <input value={form.matterport_model_id} onChange={(e) => set("matterport_model_id", e.target.value)} className={inputCls} placeholder="e.g. AbC123..." />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Share URL</label>
                <input value={form.share_url} onChange={(e) => set("share_url", e.target.value)} className={inputCls} placeholder="https://my.matterport.com/show/..." />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Embed URL</label>
                <input value={form.embed_url} onChange={(e) => set("embed_url", e.target.value)} className={inputCls} placeholder="https://my.matterport.com/show/?m=...&play=1" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Download URL</label>
                <input value={form.download_url} onChange={(e) => set("download_url", e.target.value)} className={inputCls} placeholder="https://... (point cloud / OBJ / floorplans)" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={create} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {qaFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setQaFor(null)} />
          <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-cyan-400" /> QA Review — {qaFor.job_title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{qaFor.client_name}{qaFor.site_address ? ` · ${qaFor.site_address}` : ""}</p>
              </div>
              <button onClick={() => setQaFor(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-800">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> 3D Model</div>
                {qaFor.embed_url ? (
                  <div className="rounded-lg overflow-hidden border border-slate-800" style={{ paddingBottom: "56.25%", position: "relative" }}>
                    <iframe src={qaFor.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen allow="vr, xr, accelerometer; fullscreen; autoplay" />
                  </div>
                ) : qaFor.share_url ? (
                  <a href={qaFor.share_url} target="_blank" rel="noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Open model in Matterport</a>
                ) : (
                  <div className="text-sm text-slate-500 bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">No model URL linked. Add an embed or share URL to review inline.</div>
                )}
                {qaFor.notes && <div className="mt-3 text-xs text-slate-400 whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-lg p-3">{qaFor.notes}</div>}
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-500 mb-2">QA Checklist — confirm each meets standard</div>
                <div className="space-y-2 mb-3">
                  {qaChecklist.map((c, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={c.passed} onChange={(e) => setQaChecklist((prev) => prev.map((x, idx) => idx === i ? { ...x, passed: e.target.checked } : x))} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                      {c.item}
                    </label>
                  ))}
                </div>
                <textarea value={qaNotes} onChange={(e) => setQaNotes(e.target.value)} rows={3} placeholder="Flag problems (coverage gaps, blur, alignment...)" className={`${inputCls} resize-none mb-3`} />
                <label className="flex items-start gap-2 text-sm text-slate-300 mb-3">
                  <input type="checkbox" checked={qaAcknowledge} onChange={(e) => setQaAcknowledge(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                  I sign off that this deliverable meets our quality standard and is ready for the client.
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setQA(qaFor, "passed")} disabled={busy === qaFor.id || !qaAcknowledge || !qaChecklist.every((c) => c.passed)} className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/25 flex items-center justify-center gap-1.5 disabled:opacity-40"><ShieldCheck className="w-4 h-4" /> Sign off</button>
                  <button onClick={() => setQA(qaFor, "failed")} disabled={busy === qaFor.id} className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-medium hover:bg-rose-500/25 flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> Flag</button>
                  <button onClick={() => setQA(qaFor, "rescan")} disabled={busy === qaFor.id} className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/25 flex items-center justify-center gap-1.5"><RotateCcw className="w-4 h-4" /> Rescan</button>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">Sign-off requires all checklist items + acknowledgment. "Flag" records problems; "Rescan" sends back for rework.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setViewing(null)} />
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold">{viewing.job_title}</h3>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-800" style={{ paddingBottom: "56.25%", position: "relative" }}>
              <iframe src={viewing.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen allow="vr, xr, accelerometer; fullscreen; autoplay" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}