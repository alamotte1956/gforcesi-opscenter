import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Simple CSV parser: handles quoted fields, embedded commas, and "" escapes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Convert rows to objects keyed by header row, trimming values.
function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
    return obj;
  });
}

export default function BulkCsvUpload({
  entityName,
  templateColumns,   // [{ key, label, example, required }]
  transform,          // optional: (rowObj, ctx) => entityPayload; ctx = { clients, ... }
  ctx,                // optional context object passed to transform
  onImported,
  buttonLabel = "Bulk Upload CSV",
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const header = templateColumns.map((c) => c.label).join(",");
    const example = templateColumns.map((c) => c.example || "").join(",");
    const csv = `${header}\n${example}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName.toLowerCase()}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = rowsToObjects(parseCSV(String(reader.result)));
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    try {
      const payloads = rows.map((r) => (transform ? transform(r, ctx) : r)).filter(Boolean);
      if (!payloads.length) {
        setResult({ success: 0, errors: ["No valid rows to import."] });
        setImporting(false);
        return;
      }
      const created = await base44.entities[entityName].bulkCreate(payloads);
      setResult({ success: created.length, errors: [] });
      toast({ title: "Import complete", description: `${created.length} ${entityName.toLowerCase()}(s) added.` });
      setTimeout(() => {
        setOpen(false);
        setRows([]);
        setFileName("");
        setResult(null);
        onImported?.();
      }, 1200);
    } catch (err) {
      setResult({ success: 0, errors: [err.message || "Import failed"] });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700"
      >
        <Upload className="w-4 h-4" /> {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={reset} />
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Bulk upload {entityName}s
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Upload a CSV file to create multiple {entityName.toLowerCase()}s at once. Download the template for the correct column format.
            </p>

            <button
              onClick={downloadTemplate}
              className="self-start mb-4 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV template
            </button>

            <div className="mb-4">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-slate-950 file:font-medium file:cursor-pointer hover:file:bg-cyan-400"
              />
              {fileName && <p className="text-xs text-slate-500 mt-1.5">Loaded: {fileName} · {rows.length} row(s)</p>}
            </div>

            {rows.length > 0 && (
              <div className="flex-1 overflow-auto border border-slate-800 rounded-lg mb-4">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800">
                    <tr>
                      {Object.keys(rows[0]).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-slate-800/60">
                        {Object.keys(rows[0]).map((h) => (
                          <td key={h} className="px-2 py-1.5 text-slate-300 whitespace-nowrap">{r[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && <p className="text-center text-xs text-slate-500 py-2">…and {rows.length - 50} more rows</p>}
              </div>
            )}

            {result && (
              <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${result.errors.length ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                {result.errors.length ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  {result.success > 0 && <div>{result.success} record(s) created successfully.</div>}
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={reset} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button
                onClick={doImport}
                disabled={!rows.length || importing}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5"
              >
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import {rows.length || ""} row(s)</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}