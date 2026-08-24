import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, Upload, ArrowRight, CheckCircle2, Loader2, Link2, AlertCircle } from "lucide-react";

const entityDefs = {
  Client: {
    label: "Clients",
    fields: [
      { key: "name", label: "Client Name", type: "text", required: true },
      { key: "company", label: "Company", type: "text" },
      { key: "billing_contact_name", label: "Billing Contact", type: "text" },
      { key: "billing_email", label: "Billing Email", type: "text" },
      { key: "billing_phone", label: "Billing Phone", type: "text" },
      { key: "billing_address", label: "Billing Address", type: "text" },
      { key: "terms", label: "Terms", type: "enum", options: ["Net 15", "Net 30", "Net 45", "Due on Receipt"] },
      { key: "default_rate", label: "Default Rate", type: "number" },
      { key: "quickbooks_customer_id", label: "QB Customer ID", type: "text" },
      { key: "portal_email", label: "Portal Email", type: "text" },
      { key: "portal_access_level", label: "Portal Access", type: "enum", options: ["none", "limited", "full"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  Project: {
    label: "Projects",
    fields: [
      { key: "name", label: "Project Name", type: "text", required: true },
      { key: "client_name", label: "Client Name", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "status", label: "Status", type: "enum", options: ["active", "on_hold", "completed"] },
      { key: "region", label: "Region", type: "text" },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "end_date", label: "End Date", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  Job: {
    label: "Job Sites",
    fields: [
      { key: "title", label: "Job Title", type: "text", required: true },
      { key: "project_name", label: "Project Name", type: "text", required: true },
      { key: "client_name", label: "Client Name", type: "text" },
      { key: "site_address", label: "Site Address", type: "text", required: true },
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
      { key: "priority", label: "Priority", type: "enum", options: ["low", "medium", "high", "urgent"] },
      { key: "scheduled_start", label: "Scheduled Start", type: "datetime" },
      { key: "scheduled_end", label: "Scheduled End", type: "datetime" },
      { key: "estimated_duration_hours", label: "Est. Duration (hrs)", type: "number" },
      { key: "billable_rate_type", label: "Rate Type", type: "enum", options: ["hourly", "per_sqft", "flat", "daily"] },
      { key: "billable_rate", label: "Billable Rate", type: "number" },
      { key: "status", label: "Status", type: "enum", options: ["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"] },
      { key: "required_equipment", label: "Required Equipment", type: "list" },
      { key: "deliverables", label: "Deliverables", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
};

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function parseSheetId(input) {
  const m = (input || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}

const autoMap = (fields, headers) => {
  const map = {};
  fields.forEach((f) => {
    const keys = [norm(f.key), norm(f.label)];
    const idx = headers.findIndex((h) => keys.includes(norm(h)));
    if (idx >= 0) map[f.key] = headers[idx];
  });
  return map;
};

const coerce = (val, field) => {
  const v = (val || "").trim();
  if (!v) return undefined;
  if (field.type === "number") {
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? undefined : n;
  }
  if (field.type === "enum") return field.options.includes(v) ? v : undefined;
  if (field.type === "date") {
    const d = new Date(v);
    return isNaN(d) ? undefined : d.toISOString().slice(0, 10);
  }
  if (field.type === "datetime") {
    const d = new Date(v);
    return isNaN(d) ? undefined : d.toISOString();
  }
  if (field.type === "list") {
    const items = v.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  return v;
};

export default function DataImport() {
  const [url, setUrl] = useState("");
  const [entity, setEntity] = useState("Client");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [sheetNames, setSheetNames] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);

  const fields = entityDefs[entity].fields;

  const loadSheet = async () => {
    setError("");
    const id = parseSheetId(url);
    if (!id) { setError("Paste a valid Google Sheets URL or ID."); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("readGoogleSheet", { spreadsheet_id: id });
      const data = res.data;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSheetNames(data.sheet_names || []);
      setSheetName(data.sheet_name);
      setHeaders(data.headers || []);
      setRows(data.rows || []);
      setMapping(autoMap(entityDefs[entity].fields, data.headers || []));
    } catch (e) {
      setError(e.message || "Failed to load sheet.");
    }
    setLoading(false);
  };

  const switchEntity = (e) => {
    setEntity(e);
    setMapping(autoMap(entityDefs[e].fields, headers));
  };

  const buildRecord = (row) => {
    const rec = {};
    fields.forEach((f) => {
      const col = mapping[f.key];
      if (!col) return;
      const val = coerce(row[col], f);
      if (val !== undefined) rec[f.key] = val;
    });
    return rec;
  };

  const previewRecords = rows.slice(0, 5).map(buildRecord);
  const mappedFields = fields.filter((f) => mapping[f.key]);
  const validRows = rows.map(buildRecord).filter((r) => {
    if (entity === "Client") return r.name;
    if (entity === "Project") return r.name && r.client_name;
    if (entity === "Job") return r.title && r.site_address && r.project_name;
    return false;
  });

  const doImport = async () => {
    setError("");
    setImporting(true);
    try {
      if (entity === "Client") {
        const records = rows.map(buildRecord).filter((r) => r.name);
        const created = await base44.entities.Client.bulkCreate(records);
        setResult({ count: records.length, entity: "Client" });
      } else if (entity === "Project") {
        const clients = await base44.entities.Client.list();
        const byName = {};
        clients.forEach((c) => { byName[norm(c.name)] = c.id; });
        const missing = new Set();
        rows.forEach((r) => {
          const rec = buildRecord(r);
          if (rec.client_name && !byName[norm(rec.client_name)]) missing.add(rec.client_name);
        });
        if (missing.size) {
          const newClients = await base44.entities.Client.bulkCreate(
            [...missing].map((n) => ({ name: n, company: n }))
          );
          newClients.forEach((c) => { byName[norm(c.name)] = c.id; });
        }
        const projects = rows.map(buildRecord)
          .filter((r) => r.name && r.client_name)
          .map((r) => ({ ...r, client_id: byName[norm(r.client_name)] }))
          .filter((r) => r.client_id);
        const created = await base44.entities.Project.bulkCreate(projects);
        setResult({ count: projects.length, entity: "Project", newClients: missing.size });
      } else if (entity === "Job") {
        const [projects, clients] = await Promise.all([base44.entities.Project.list(), base44.entities.Client.list()]);
        const projByName = {};
        projects.forEach((p) => { projByName[norm(p.name)] = p; });
        const cliByName = {};
        clients.forEach((c) => { cliByName[norm(c.name)] = c.id; });
        const jobs = [];
        let skipped = 0;
        rows.forEach((r) => {
          const rec = buildRecord(r);
          if (!rec.title || !rec.site_address || !rec.project_name) { skipped++; return; }
          const proj = projByName[norm(rec.project_name)];
          if (!proj) { skipped++; return; }
          const job = { ...rec, project_id: proj.id, project_name: proj.name };
          if (rec.client_name) {
            const cid = cliByName[norm(rec.client_name)];
            if (cid) job.client_id = cid;
          }
          jobs.push(job);
        });
        await base44.entities.Job.bulkCreate(jobs);
        setResult({ count: jobs.length, entity: "Job", skipped });
      }
    } catch (e) {
      setError(e.message || "Import failed.");
    }
    setImporting(false);
  };

  const reset = () => {
    setUrl(""); setHeaders([]); setRows([]); setMapping({}); setResult(null); setError(""); setSheetNames([]); setSheetName("");
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-cyan-400" /> Import from Google Sheets</h1>
        <p className="text-sm text-slate-500">Map columns from your spreadsheet directly into clients, projects, or job sites.</p>
      </div>

      {result ? (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <div className="text-lg font-semibold">Imported {result.count} {entityDefs[result.entity].label.toLowerCase()}</div>
          {result.newClients > 0 && <div className="text-sm text-slate-400 mt-1">{result.newClients} new clients created for project linking</div>}
          {result.skipped > 0 && <div className="text-sm text-amber-300 mt-1">{result.skipped} row(s) skipped — missing title, site address, or unmatched project</div>}
          <button onClick={reset} className="mt-4 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm">Import another sheet</button>
        </div>
      ) : headers.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Google Sheets link</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button onClick={loadSheet} disabled={loading} className="px-4 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Load
            </button>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Import as</label>
            <div className="flex gap-2">
              {Object.keys(entityDefs).map((e) => (
                <button
                  key={e}
                  onClick={() => setEntity(e)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${entity === e ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}
                >
                  {entityDefs[e].label}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="mt-4 flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
          <div className="mt-4 text-xs text-slate-500 bg-slate-800/40 rounded-lg p-3">
            Make sure your sheet's first row contains column headers. The spreadsheet must be accessible to the connected Google account (sharing access recommended).
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-slate-300">
                <span className="text-slate-500">Sheet:</span> {sheetName} · <span className="text-slate-500">{rows.length} data rows · {headers.length} columns</span>
              </div>
              <div className="flex items-center gap-2">
                {sheetNames.length > 1 && (
                  <select value={sheetName} onChange={(e) => { setSheetName(e.target.value); }} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                    {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <select value={entity} onChange={(e) => switchEntity(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs">
                  {Object.keys(entityDefs).map((e) => <option key={e} value={e}>{entityDefs[e].label}</option>)}
                </select>
                <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5">Cancel</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-300 mb-3">Map columns → {entityDefs[entity].label} fields</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {fields.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="w-40 shrink-0">
                    <div className="text-sm text-slate-200">{f.label}{f.required && <span className="text-rose-400"> *</span>}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{f.key}</div>
                  </div>
                  <select
                    value={mapping[f.key] || ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-300 mb-3">Preview (first {previewRecords.length} rows)</div>
            {mappedFields.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">Map at least one column to see a preview.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      {mappedFields.map((f) => <th key={f.key} className="px-2 py-1.5 font-medium whitespace-nowrap">{f.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        {mappedFields.map((f) => <td key={f.key} className="px-2 py-1.5 text-slate-300 max-w-[200px] truncate">{String(r[f.key] ?? "—")}</td>)}
                      </tr>
                    ))}
                    {previewRecords.length === 0 && <tr><td colSpan={mappedFields.length} className="px-2 py-4 text-center text-slate-500">No valid rows</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {error && <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{validRows.length}</span> valid rows ready to import
            </div>
            <button
              onClick={doImport}
              disabled={importing || validRows.length === 0}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-2 hover:bg-cyan-400 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {validRows.length} {entityDefs[entity].label.toLowerCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}