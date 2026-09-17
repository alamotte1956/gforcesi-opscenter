import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { X, Loader2, FileSpreadsheet, Upload } from "lucide-react";

// Job fields we can populate from sheet columns
const JOB_FIELDS = [
  { key: "title", label: "Title", required: true },
  { key: "project_name", label: "Project (name)", required: true, resolve: "project" },
  { key: "site_address", label: "Site address", required: true },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "scheduled_start", label: "Scheduled start", type: "datetime" },
  { key: "scheduled_end", label: "Scheduled end", type: "datetime" },
  { key: "sla_due_date", label: "SLA due date", type: "datetime" },
  { key: "estimated_duration_hours", label: "Est. hours", type: "number" },
  { key: "billable_rate_type", label: "Rate type" },
  { key: "billable_rate", label: "Billable rate", type: "number" },
  { key: "deliverables", label: "Deliverables" },
  { key: "notes", label: "Notes" },
];

const ALIASES = {
  title: ["title", "job title", "job", "name"],
  project_name: ["project", "project_name", "project name"],
  site_address: ["site", "site_address", "site address", "address", "location"],
  priority: ["priority"],
  status: ["status"],
  scheduled_start: ["scheduled_start", "scheduled start", "start", "start date", "start time"],
  scheduled_end: ["scheduled_end", "scheduled end", "end", "end date", "end time"],
  sla_due_date: ["sla_due_date", "sla due date", "sla", "due date"],
  estimated_duration_hours: ["estimated_duration_hours", "est hours", "hours", "duration", "estimated hours"],
  billable_rate_type: ["billable_rate_type", "rate type", "rate_type"],
  billable_rate: ["billable_rate", "rate", "billable rate"],
  deliverables: ["deliverables", "deliverable"],
  notes: ["notes", "note"],
};

const guessField = (header) => {
  const h = header.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
};

const toIso = (v) => {
  if (!v || !String(v).trim()) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};
const toNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
};

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function ImportJobsFromSheet({ projects, onImported, onClose }) {
  const { toast } = useToast();
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [sheetNames, setSheetNames] = useState([]);
  const [mapping, setMapping] = useState({});

  const extractId = (val) => {
    const m = String(val).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : val.trim();
  };

  const fetchSheet = async () => {
    const spreadsheetId = extractId(sheetUrl);
    if (!spreadsheetId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("readGoogleSheet", { spreadsheet_id: spreadsheetId, sheet_name: sheetName || undefined });
      const data = res.data || res;
      if (data.error) {
        toast({ title: "Could not read sheet", description: data.error, variant: "destructive" });
      } else {
        const hs = data.headers || [];
        setHeaders(hs);
        setRows(data.rows || []);
        setSheetNames(data.sheet_names || []);
        setSheetName(data.sheet_name || "");
        // auto-map
        const auto = {};
        JOB_FIELDS.forEach((f) => {
          const match = hs.find((h) => guessField(h) === f.key);
          if (match) auto[f.key] = match;
        });
        setMapping(auto);
      }
    } catch (e) {
      toast({ title: "Failed to read sheet", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const projectByName = (name) => {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return projects.find((p) => p.name.trim().toLowerCase() === n) || null;
  };

  const builtJobs = () => {
    return rows.map((r) => {
      const get = (field) => (mapping[field] ? r[mapping[field]] : "");
      const projectName = get("project_name");
      const project = projectByName(projectName);
      const job = {
        title: String(get("title") || "").trim(),
        project_id: project?.id,
        project_name: project?.name || (projectName || undefined),
        client_id: project?.client_id,
        client_name: project?.client_name,
        site_address: String(get("site_address") || "").trim(),
        priority: (get("priority") || "medium").trim() || "medium",
        status: (get("status") || "scheduled").trim() || "scheduled",
        scheduled_start: toIso(get("scheduled_start")),
        scheduled_end: toIso(get("scheduled_end")),
        sla_due_date: toIso(get("sla_due_date")),
        estimated_duration_hours: toNum(get("estimated_duration_hours")),
        billable_rate_type: (get("billable_rate_type") || "hourly").trim() || "hourly",
        billable_rate: toNum(get("billable_rate")),
        deliverables: get("deliverables") || undefined,
        notes: get("notes") || undefined,
      };
      if (job.status) {
        job.status_history = [{ status: job.status, entered_at: new Date().toISOString() }];
      }
      return job;
    });
  };

  const validJobs = builtJobs().filter((j) => j.title && j.project_id && j.site_address);
  const skipped = builtJobs().length - validJobs.length;

  const doImport = async () => {
    if (!validJobs.length) return;
    setImporting(true);
    try {
      await base44.entities.Job.bulkCreate(validJobs);
      toast({ title: "Jobs imported", description: `${validJobs.length} job(s) created from Google Sheet.` });
      onImported?.();
      onClose();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl p-5 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Import jobs from Google Sheet</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Google Sheet URL or ID *</label>
            <div className="flex gap-2">
              <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className={inputCls} placeholder="https://docs.google.com/spreadsheets/d/…" />
              <button onClick={fetchSheet} disabled={loading || !sheetUrl.trim()} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Load
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Make sure the sheet is shared with the connected Google account (Viewer is fine).</p>
          </div>

          {sheetNames.length > 1 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sheet tab</label>
              <select value={sheetName} onChange={(e) => { setSheetName(e.target.value); }} className={inputCls}>
                {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={fetchSheet} className="text-xs text-cyan-400 hover:underline mt-1">Reload from this tab</button>
            </div>
          )}

          {headers.length > 0 && (
            <>
              <div className="border-t border-slate-800 pt-3">
                <div className="text-xs text-slate-400 mb-2">Map columns to job fields:</div>
                <div className="grid grid-cols-2 gap-2">
                  {JOB_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-[11px] text-slate-500 mb-0.5">{f.label}{f.required && " *"}</label>
                      <select value={mapping[f.key] || ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })} className={inputCls}>
                        <option value="">— none —</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-400">Preview ({rows.length} rows)</div>
                  <div className="text-xs">
                    <span className="text-emerald-400">{validJobs.length} ready</span>
                    {skipped > 0 && <span className="text-amber-400 ml-2">{skipped} skipped (missing title/project/address or project not found)</span>}
                  </div>
                </div>
                <div className="overflow-auto max-h-56 border border-slate-800 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-400">Title</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-400">Project</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-400">Site</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-400">Start</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-400">OK?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {builtJobs().slice(0, 50).map((j, i) => {
                        const ok = j.title && j.project_id && j.site_address;
                        return (
                          <tr key={i} className="border-t border-slate-800/60">
                            <td className="px-2 py-1.5 text-slate-300 truncate max-w-[160px]">{j.title || "—"}</td>
                            <td className="px-2 py-1.5 text-slate-400 truncate max-w-[140px]">{j.project_name || "—"}</td>
                            <td className="px-2 py-1.5 text-slate-400 truncate max-w-[140px]">{j.site_address || "—"}</td>
                            <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleString() : "—"}</td>
                            <td className="px-2 py-1.5">{ok ? <span className="text-emerald-400">✓</span> : <span className="text-rose-400" title="Missing title, project, or address — will be skipped">✗</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
                <button onClick={doImport} disabled={importing || !validJobs.length} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import {validJobs.length} job(s)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}