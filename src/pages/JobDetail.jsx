import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, MapPin, Calendar, User, Camera, Building2, FolderKanban, Clock, Flag, ExternalLink, Link2, ScanLine, ShieldCheck, X, ChevronLeft, ChevronRight, UploadCloud, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { parseMatterportUrl } from "@/lib/matterport";
import AssetAssessments from "@/components/AssetAssessments";

const statusStyles = {
  scheduled: "bg-slate-700 text-slate-300",
  en_route: "bg-blue-500/15 text-blue-300",
  on_site: "bg-amber-500/15 text-amber-300",
  scanning: "bg-purple-500/15 text-purple-300",
  processing: "bg-indigo-500/15 text-indigo-300",
  complete: "bg-emerald-500/15 text-emerald-300",
  invoiced: "bg-cyan-500/15 text-cyan-300",
};

const fmt = (v) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mpInput, setMpInput] = useState("");
  const [mpSaving, setMpSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploading7g, setUploading7g] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    (async () => {
      try {
        const [j, user] = await Promise.all([base44.entities.Job.get(id), base44.auth.me().catch(() => null)]);
        setJob(j);
        setMe(user);
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const saveMatterport = async () => {
    const parsed = parseMatterportUrl(mpInput);
    if (!parsed) return;
    setMpSaving(true);
    try {
      await base44.entities.Job.update(job.id, {
        matterport_model_id: parsed.modelId,
        matterport_share_url: parsed.shareUrl,
        matterport_embed_url: parsed.embedUrl,
      });
      setJob({ ...job, matterport_model_id: parsed.modelId, matterport_share_url: parsed.shareUrl, matterport_embed_url: parsed.embedUrl });
      setMpInput("");
    } finally {
      setMpSaving(false);
    }
  };

  const clearMatterport = async () => {
    await base44.entities.Job.update(job.id, { matterport_model_id: "", matterport_share_url: "", matterport_embed_url: "" });
    setJob({ ...job, matterport_model_id: "", matterport_share_url: "", matterport_embed_url: "" });
  };

  const uploadTo7G = async () => {
    setUploading7g(true); setUploadMsg("");
    try {
      const res = await base44.functions.invoke("uploadScanTo7G", { job_id: job.id });
      const data = res.data || {};
      setUploadMsg(data.ok ? "Uploaded to 7G workspace" : `Failed: ${data.error || "unknown error"}`);
    } catch (e) {
      setUploadMsg(`Failed: ${e.message || "unknown error"}`);
    } finally {
      setUploading7g(false);
      setTimeout(() => setUploadMsg(""), 5000);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
  }
  if (!job) {
    return (
      <div className="p-6">
        <p className="text-slate-400 mb-3">Job not found.</p>
        <Link to="/jobs" className="text-cyan-300 text-sm flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Jobs</Link>
      </div>
    );
  }

  const photos = job.photos || [];

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <Link to="/jobs" className="text-sm text-slate-400 hover:text-cyan-300 flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Back to Jobs</Link>

      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{job.title}</h1>
          <div className="text-sm text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" />{job.site_address || "Remote"}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2 py-1 rounded-full capitalize whitespace-nowrap ${statusStyles[job.status] || statusStyles.scheduled}`}>{job.status?.replace("_", " ")}</span>
            {isAdmin && (
              <button onClick={uploadTo7G} disabled={uploading7g} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap">
                {uploading7g ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {uploading7g ? "Uploading…" : "Upload to 7G"}
              </button>
            )}
          </div>
          {uploadMsg && <div className={`text-xs ${uploadMsg.startsWith("Uploaded") ? "text-emerald-400" : "text-rose-400"}`}>{uploadMsg}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Info icon={FolderKanban} label="Project" value={job.project_name} />
        <Info icon={Building2} label="Client" value={job.client_name} />
        <Info icon={User} label="Assigned Team" value={(job.assigned_contractor_names || []).join(", ") || "—"} />
        <Info icon={Calendar} label="Scheduled Start" value={fmt(job.scheduled_start)} />
        <Info icon={Clock} label="Scheduled End" value={fmt(job.scheduled_end)} />
        <Info icon={Flag} label="Priority" value={job.priority} />
      </div>

      <Section title="Matterport 3D Model" icon={ScanLine}>
        {job.matterport_embed_url ? (
          <>
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-800 mb-3">
              <iframe src={job.matterport_embed_url} title={job.title} className="w-full h-full" allowFullScreen allow="xr-spatial-tracking" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">Model: {job.matterport_model_id}</span>
              <div className="flex gap-3">
                <a href={job.matterport_share_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />Open in Matterport</a>
                <button onClick={clearMatterport} className="text-rose-400 hover:text-rose-300">Unlink</button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <input value={mpInput} onChange={(e) => setMpInput(e.target.value)} placeholder="Paste Matterport share URL or model ID" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
            <button onClick={saveMatterport} disabled={mpSaving || !mpInput.trim()} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm disabled:opacity-50 flex items-center gap-1.5"><Link2 className="w-4 h-4" />Link</button>
          </div>
        )}
      </Section>

      <AssetAssessments job={job} assessedByName={me?.full_name || me?.email} />

      {job.deliverables && (
        <Section title="Deliverables">
          <p className="text-sm text-slate-300">{job.deliverables}</p>
        </Section>
      )}
      {job.notes && (
        <Section title="Notes">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{job.notes}</p>
        </Section>
      )}

      <Section title={isAdmin ? `Work Quality Review (${photos.length})` : `Field Photos (${photos.length})`} icon={isAdmin ? ShieldCheck : Camera}>
        {photos.length === 0 ? (
          <p className="text-sm text-slate-500">No photos uploaded yet.</p>
        ) : isAdmin ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p, i) => (
              <button key={i} onClick={() => setLightbox(i)} className="text-left group">
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-800 border border-slate-800 group-hover:border-cyan-500/50 transition-colors">
                  <Image src={p.url} className="w-full h-full" fittingType="fill" />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-300 truncate">{p.uploaded_by_name || "Field crew"}</span>
                  <span className="text-slate-500 shrink-0">{p.uploaded_at ? fmt(p.uploaded_at) : ""}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block group">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
                  <Image src={p.url} className="w-full h-full" fittingType="fill" />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">
                  {p.uploaded_by_name || "Field"}{p.uploaded_at ? ` · ${fmt(p.uploaded_at)}` : ""}
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      {lightbox != null && photos[lightbox] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 py-3 text-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm">
              <div className="font-medium">{photos[lightbox].uploaded_by_name || "Field crew"}</div>
              <div className="text-xs text-slate-400">{photos[lightbox].uploaded_at ? fmt(photos[lightbox].uploaded_at) : ""} · Photo {lightbox + 1} of {photos.length}</div>
            </div>
            <button onClick={() => setLightbox(null)} className="text-slate-400 hover:text-slate-100 p-1.5"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-4 relative" onClick={(e) => e.stopPropagation()}>
            {lightbox > 0 && (
              <button onClick={() => setLightbox(lightbox - 1)} className="absolute left-4 text-slate-300 hover:text-white p-2 rounded-full bg-slate-800/60"><ChevronLeft className="w-6 h-6" /></button>
            )}
            <Image src={photos[lightbox].url} className="max-w-full max-h-full rounded-lg" fittingType="fit" />
            {lightbox < photos.length - 1 && (
              <button onClick={() => setLightbox(lightbox + 1)} className="absolute right-4 text-slate-300 hover:text-white p-2 rounded-full bg-slate-800/60"><ChevronRight className="w-6 h-6" /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children, icon: Icon = Camera }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Icon className="w-4 h-4 text-cyan-400" />{title}</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">{children}</div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1"><Icon className="w-3 h-3" />{label}</div>
      <div className="text-sm text-slate-200 capitalize truncate">{value || "—"}</div>
    </div>
  );
}