import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, MapPin, Calendar, User, Camera, Building2, FolderKanban, Clock, Flag } from "lucide-react";
import { Image } from "@/components/ui/image";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setJob(await base44.entities.Job.get(id));
      } catch {}
      setLoading(false);
    })();
  }, [id]);

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
        <span className={`text-[11px] px-2 py-1 rounded-full capitalize whitespace-nowrap ${statusStyles[job.status] || statusStyles.scheduled}`}>{job.status?.replace("_", " ")}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Info icon={FolderKanban} label="Project" value={job.project_name} />
        <Info icon={Building2} label="Client" value={job.client_name} />
        <Info icon={User} label="Assigned Team" value={(job.assigned_contractor_names || []).join(", ") || "—"} />
        <Info icon={Calendar} label="Scheduled Start" value={fmt(job.scheduled_start)} />
        <Info icon={Clock} label="Scheduled End" value={fmt(job.scheduled_end)} />
        <Info icon={Flag} label="Priority" value={job.priority} />
      </div>

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

      <Section title={`Field Photos (${photos.length})`}>
        {photos.length === 0 ? (
          <p className="text-sm text-slate-500">No photos uploaded yet.</p>
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
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-cyan-400" />{title}</h2>
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