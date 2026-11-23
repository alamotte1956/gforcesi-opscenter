import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, ScanLine, Loader2, Eye, CheckCircle2, RotateCcw, Send, ClipboardCheck, ShieldCheck, ExternalLink, User } from "lucide-react";
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
  revision_required: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  rescan: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
const typeLabels = { "3d_model": "3D Model", matterpak: "MatterPak", floorplan: "Floorplan", pointcloud: "E57 Point Cloud", photos: "Photos", other: "Other" };
const QA_CHECKLIST = [
  "Full coverage — all rooms, vaults & common areas scanned",
  "HIPAA / Financial privacy blur verified on monitors & whiteboards",
  "Scan alignment correct (zero LiDAR drift)",
  "Lighting balanced, no overexposure or reflections",
  "Private Model Embed (PME) link verified without admin login",
  "Dollhouse, MatterPak & floorplan generated cleanly",
];
const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#4A9EFF]";

function blankForm() {
  return {
    job_id: "", deliverable_type: "3d_model", matterport_model_id: "",
    matterport_pme_url: "", share_url: "", embed_url: "", download_url: "",
    matterpak_url: "", e57_pointcloud_url: "", floorplan_url: "", notes: "",
  };
}

export default function Deliverables() {
  const [deliverables, setDeliverables] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
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

  const isAdmin = me?.role === "admin" || ["full", "ops_manager", "dispatcher"].includes(me?.access_level);

  const load = async () => {
    const [d, j, cls, u] = await Promise.all([
      base44.entities.Deliverable.list("-created_date", 200).catch(() => []),
      base44.entities.Job.list().catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setDeliverables(d);
    setJobs(j);
    setClients(cls);
    setMe(u);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // STRICT TENANT ISOLATION for non-internal users
  const visibleDeliverables = useMemo(() => {
    if (!me || isAdmin) return deliverables;
    const matched = clients.find(
      (c) => c.id === me.agency_id || c.id === me.client_id || (c.portal_email && me.email && c.portal_email.toLowerCase() === me.email.toLowerCase())
    );
    if (!matched) return [];
    if (matched.client_type === "ad_agency") {
      const allowedIds = new Set([matched.id, ...clients.filter((c) => c.parent_agency_id === matched.id).map((c) => c.id)]);
      return deliverables.filter((d) => d.agency_id === matched.id || allowedIds.has(d.client_id));
    }
    return deliverables.filter((d) => d.client_id === matched.id);
  }, [deliverables, clients, me, isAdmin]);

  const jobMap = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const qaQueue = visibleDeliverables.filter((d) => d.qa_status === "pending" && !["accepted", "rejected"].includes(d.status));

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
        agency_id: selectedJob?.agency_id || "",
        client_id: selectedJob?.client_id || "",
        client_name: selectedJob?.client_name || "",
        branch_code: selectedJob?.branch_code || "",
        region_zone: selectedJob?.region_zone || "CONUS",
        site_address: selectedJob?.site_address || "",
        status: "processing",
        qa_status: "pending",
      });
      toast({ title: "Deliverable created" });
      setShowCreate(false);
      setForm(blankForm());
      load();
    } catch (e) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
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
      if (d.job_id) {
        const jobQa = qa_status === "passed" ? "passed" : "revision_required";
        await base44.entities.Job.update(d.job_id, { qa_status: jobQa }).catch(() => {});
      }
      toast({ title: qa_status === "passed" ? "QA signed off — ready to deliver" : `QA marked: ${qa_status}` });
      setQaFor(null); setQaNotes(""); setQaChecklist([]); setQaAcknowledge(false);
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const deliver = async (d) => {
    setBusy(d.id);
    try {
      await base44.entities.Deliverable.update(d.id, { status: "delivered", delivered_at: new Date().toISOString() });
      try { await base44.functions.invoke("notifyClientDeliverableReady", { deliverable_id: d.id }); } catch {}
      toast({ title: "Delivered to client portal", description: d.job_title });
      load();
    } catch (e) {
      toast({ title: "Deliver failed", description: e.message, variant: "destructive" });
    }
    setBusy(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><ScanLine className="w-5 h-5 text-[#4A9EFF]" /> Deliverables & Enterprise QA</h1>
          <p className="text-sm text-slate-400">{visibleDeliverables.length} deliverables · {qaQueue.length} waiting on QA · PME, MatterPak, E57 & Floor Plans</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="px-3.5 py-2 rounded-lg bg-[#126DFA] text-white font-medium text-sm flex items-center gap-1.5 hover:bg-[#4A9EFF]">
            <Plus className="w-4 h-4" /> New Deliverable
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-[#4A9EFF] rounded-full animate-spin" /></div>
      ) : visibleDeliverables.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <ScanLine className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No deliverables available for your tenant yet.</div>
        </div>
      ) : (
        <>
          {isAdmin && qaQueue.length > 0 && (
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
                        <span className="text-[10px] text-slate-400">{d.region_zone || "CONUS"} · {typeLabels[d.deliverable_type] || d.deliverable_type || "3D Model"}</span>
                      </div>
                      <div className="font-medium text-slate-200 text-sm truncate">{d.job_title || d.title || "—"}</div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{d.client_name}{d.branch_code ? ` · ${d.branch_code}` : ""}</div>
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5"><User className="w-3 h-3" /> {who}</div>
                      <button
                        onClick={() => {
                          setQaFor(d);
                          setQaNotes(d.qa_notes || "");
                          setQaChecklist(QA_CHECKLIST.map((item) => ({ item, passed: false })));
                          setQaAcknowledge(false);
                        }}
                        className="mt-3 w-full px-3 py-1.5 rounded-lg bg-[#126DFA] text-white text-xs font-medium hover:bg-[#4A9EFF] flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open & Review
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-800 bg-[#0A1628]">
                  <th className="px-4 py-3 font-medium">Job / Branch / Client</th>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">QA</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeliverables.map((d) => {
                  const pme = d.matterport_pme_url || d.embed_url;
                  return (
                    <tr key={d.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{d.job_title || d.title || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {d.client_name}{d.branch_code ? ` · ${d.branch_code}` : ""}{d.site_address ? ` · ${d.site_address}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{d.region_zone || "CONUS"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{typeLabels[d.deliverable_type] || d.deliverable_type || "3D Model"}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[d.status] || statusStyles.processing}`}>{d.status}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${qaStyles[d.qa_status] || qaStyles.pending}`}>{d.qa_status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {busy === d.id && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                          {pme && (
                            <button onClick={() => setViewing({ ...d, embed_url: pme })} title="View PME model" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-[#4A9EFF] hover:bg-slate-700"><Eye className="w-4 h-4" /></button>
                          )}
                          {isAdmin && (
                            <>
                              {["pending", "failed", "rescan", "revision_required"].includes(d.qa_status) && (
                                <button onClick={() => { setQaFor(d); setQaNotes(d.qa_notes || ""); setQaChecklist(QA_CHECKLIST.map((item) => ({ item, passed: false }))); setQaAcknowledge(false); }} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> QA</button>
                              )}
                              {d.qa_status === "passed" && !["delivered", "accepted", "rejected"].includes(d.status) && (
                                <button onClick={() => deliver(d)} className="px-2 py-1 rounded-lg bg-[#126DFA]/20 border border-[#126DFA]/40 text-[#4A9EFF] text-xs flex items-center gap-1 hover:bg-[#126DFA]/30"><Send className="w-3 h-3" /> Deliver</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><ScanLine className="w-4 h-4 text-[#4A9EFF]" /> New Deliverable Package</h2>
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
                <label className="block text-xs text-slate-400 mb-1">Matterport Model ID</label>
                <input value={form.matterport_model_id} onChange={(e) => set("matterport_model_id", e.target.value)} className={inputCls} placeholder="e.g. SxQL3iGyoDo" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Private Model Embed (PME) URL</label>
                <input value={form.matterport_pme_url} onChange={(e) => set("matterport_pme_url", e.target.value)} className={inputCls} placeholder="https://my.matterport.com/show/?m=...&play=1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">MatterPak URL</label>
                  <input value={form.matterpak_url} onChange={(e) => set("matterpak_url", e.target.value)} className={inputCls} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">E57 Point Cloud URL</label>
                  <input value={form.e57_pointcloud_url} onChange={(e) => set("e57_pointcloud_url", e.target.value)} className={inputCls} placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">2D Floor Plan URL</label>
                <input value={form.floorplan_url} onChange={(e) => set("floorplan_url", e.target.value)} className={inputCls} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={create} disabled={saving} className="px-4 py-2 rounded-lg bg-[#126DFA] text-white font-medium text-sm hover:bg-[#4A9EFF] disabled:opacity-50 flex items-center gap-1.5">
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
                <h3 className="text-base font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#4A9EFF]" /> QA Review — {qaFor.job_title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{qaFor.client_name}{qaFor.site_address ? ` · ${qaFor.site_address}` : ""}</p>
              </div>
              <button onClick={() => setQaFor(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-800">
                {(qaFor.matterport_pme_url || qaFor.embed_url) ? (
                  <div className="rounded-lg overflow-hidden border border-slate-800" style={{ paddingBottom: "56.25%", position: "relative" }}>
                    <iframe src={qaFor.matterport_pme_url || qaFor.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen allow="vr, xr, accelerometer; fullscreen; autoplay" title={qaFor.job_title} />
                  </div>
                ) : qaFor.share_url ? (
                  <a href={qaFor.share_url} target="_blank" rel="noreferrer" className="text-sm text-[#4A9EFF] hover:underline flex items-center gap-1"><ExternalLink className="w-4 h-4" /> Open model in Matterport</a>
                ) : (
                  <div className="text-sm text-slate-500 bg-slate-950 border border-slate-800 rounded-lg p-6 text-center">No PME or embed URL linked yet.</div>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-400 mb-2">QA Checklist</div>
                <div className="space-y-2 mb-3">
                  {qaChecklist.map((c, i) => (
                    <label key={i} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={c.passed} onChange={(e) => setQaChecklist((prev) => prev.map((x, idx) => idx === i ? { ...x, passed: e.target.checked } : x))} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                      {c.item}
                    </label>
                  ))}
                </div>
                <textarea value={qaNotes} onChange={(e) => setQaNotes(e.target.value)} rows={3} placeholder="QA notes..." className={`${inputCls} resize-none mb-3`} />
                <label className="flex items-start gap-2 text-xs text-slate-300 mb-3">
                  <input type="checkbox" checked={qaAcknowledge} onChange={(e) => setQaAcknowledge(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                  I sign off that this deliverable meets G-Force SI enterprise quality & privacy standards.
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setQA(qaFor, "passed")} disabled={busy === qaFor.id || !qaAcknowledge || !qaChecklist.every((c) => c.passed)} className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 flex items-center justify-center gap-1 disabled:opacity-40"><ShieldCheck className="w-4 h-4" /> Sign off</button>
                  <button onClick={() => setQA(qaFor, "revision_required")} disabled={busy === qaFor.id} className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium hover:bg-rose-500/25 flex items-center justify-center gap-1"><X className="w-4 h-4" /> Revision</button>
                  <button onClick={() => setQA(qaFor, "rescan")} disabled={busy === qaFor.id} className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 flex items-center justify-center gap-1"><RotateCcw className="w-4 h-4" /> Rescan</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setViewing(null)} />
          <div className="relative w-full max-w-4xl bg-[#0A1628] border border-slate-700 rounded-2xl p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-semibold text-white">{viewing.job_title}</h3>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-800" style={{ paddingBottom: "56.25%", position: "relative" }}>
              <iframe src={viewing.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen allow="vr, xr, accelerometer; fullscreen; autoplay" title={viewing.job_title} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
