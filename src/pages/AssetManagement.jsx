import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Boxes, Plus, Download, FileSpreadsheet, FileText, Search, ShieldCheck,
  Building2, Layers, ExternalLink, Loader2, X, Database,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useToast } from "@/components/ui/use-toast";

const ASSET_CATEGORIES = [
  "Furniture",
  "Equipment",
  "Mechanical systems",
  "Electrical equipment",
  "Building fixtures",
  "Commercial assets",
  "Hotel room contents",
  "Insurance documentation",
  "Property management inventories",
];

const CONDITIONS = ["Excellent", "Good", "Fair", "Needs Maintenance", "Replace"];

export default function AssetManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    asset_name: "",
    category: "Commercial assets",
    project_id: "",
    building: "",
    floor: "Floor 1",
    room: "",
    condition: "Good",
    quantity: "1",
    matterport_space_id: "",
    digital_twin_location: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        base44.entities.AssetAssessment.list("-created_date").catch(() => []),
        base44.entities.Project.list().catch(() => []),
      ]);
      setAssets(a || []);
      setProjects(p || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () =>
      assets.filter((a) => {
        if (categoryFilter !== "ALL" && (a.category || "") !== categoryFilter) return false;
        if (query.trim()) {
          const hay = `${a.asset_name || a.name || ""} ${a.building || ""} ${a.room || ""} ${a.category || ""} ${a.notes || ""}`.toLowerCase();
          if (!hay.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [assets, categoryFilter, query]
  );

  const createAsset = async (e) => {
    e.preventDefault();
    if (!form.asset_name.trim()) return;
    await base44.entities.AssetAssessment.create({
      ...form,
      quantity: Number(form.quantity || 1),
      verified: true,
      status: "verified",
    });
    setShowModal(false);
    setForm({
      asset_name: "", category: "Commercial assets", project_id: "", building: "",
      floor: "Floor 1", room: "", condition: "Good", quantity: "1",
      matterport_space_id: "", digital_twin_location: "", notes: "",
    });
    toast({ title: "Asset Record Created", description: "Linked to digital twin inventory." });
    load();
  };

  const exportCsv = () => {
    const header = "ID,Asset,Category,Building,Floor,Room,Qty,Condition,SpaceID,Verified,Notes";
    const rows = filtered.map((a) =>
      [a.id, a.asset_name || a.name, a.category, a.building || a.site_name, a.floor, a.room, a.quantity || 1, a.condition, a.matterport_space_id, a.verified ? "Yes" : "Pending", (a.notes || "").replace(/,/g, ";")].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gforcesi-assets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = filtered.map((a) => ({
      Asset_ID: a.id,
      Asset_Name: a.asset_name || a.name,
      Category: a.category,
      Building: a.building || a.site_name,
      Floor: a.floor || "Floor 1",
      Room: a.room || "—",
      Quantity: a.quantity || 1,
      Condition: a.condition || "Good",
      Matterport_Space: a.matterport_space_id || "—",
      Digital_Twin_Location: a.digital_twin_location || "—",
      Verified: a.verified ? "HUMAN VERIFIED" : "UNVERIFIED",
    }));
    const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const keys = rows.length ? Object.keys(rows[0]) : ["Asset_Name"];
    const headerXml = `<Row>${keys.map((k) => `<Cell><Data ss:Type="String">${esc(k)}</Data></Cell>`).join("")}</Row>`;
    const bodyXml = rows.map((r) => `<Row>${keys.map((k) => `<Cell><Data ss:Type="String">${esc(r[k])}</Data></Cell>`).join("")}</Row>`).join("");
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Digital Twin Assets"><Table>${headerXml}${bodyXml}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gforcesi-assets-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMaximoGateway = () => {
    const maximoPayload = {
      schema: "IBM_MAXIMO_EAM_ASSET_IMPORT_V1",
      exported_at: new Date().toISOString(),
      source: "G-Force SI / TwinScan Digital Twin OS",
      assets: filtered.map((a) => ({
        ASSETNUM: `GF-${String(a.id || "").slice(-6).toUpperCase()}`,
        DESCRIPTION: a.asset_name || a.name,
        ASSETCLASS: a.category,
        LOCATION: `${a.building || "SITE"}/${a.floor || "F1"}/${a.room || "GEN"}`,
        STATUS: a.condition === "Replace" ? "DECOMMISSIONED" : "OPERATING",
        DIGITAL_TWIN_URL: a.matterport_space_id ? `https://my.matterport.com/show/?m=${a.matterport_space_id}` : a.digital_twin_location || "",
      })),
    };
    const blob = new Blob([JSON.stringify(maximoPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ibm-maximo-eam-gateway-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "IBM Maximo EAM Export Ready", description: `Exported ${filtered.length} asset(s) in Maximo gateway format.` });
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, 612, 70, "F");
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 70, 612, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("G-FORCE SI — Digital Twin Asset Registry", 40, 44);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    let y = 100;
    filtered.slice(0, 35).forEach((a, i) => {
      doc.text(`${i + 1}. ${a.asset_name || a.name} [${a.category}] · ${a.building || "Site"}/${a.floor || "F1"}/${a.room || "Room"} · Cond: ${a.condition || "Good"}`, 40, y);
      y += 18;
    });
    doc.save(`GForceSI-Asset-Registry-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#F97316] animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#F97316]" /> Digital Twin Asset Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Structured enterprise asset registry across furniture, MEP systems, commercial fixtures, hotel contents &amp; insurance documentation with IBM Maximo gateway export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportCsv} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white inline-flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={exportExcel} className="px-3 py-2 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-xs font-semibold text-white inline-flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportPdf} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={exportMaximoGateway} className="px-3 py-2 rounded-lg bg-[#126DFA]/15 border border-[#126DFA]/40 text-[#4A9EFF] hover:bg-[#126DFA]/25 text-xs font-semibold inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> IBM Maximo EAM
          </button>
          <button onClick={() => setShowModal(true)} className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Register Asset
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by asset name, building, room, or notes..."
            className="w-full bg-[#0D1C33] border border-[#1E3A5F] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#4A9EFF]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#0D1C33] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs text-white"
        >
          <option value="ALL">All 9 Asset Categories ({assets.length})</option>
          {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Asset Table */}
      <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] overflow-hidden overflow-x-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-800">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Building / Floor / Room</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3 text-right">3D Twin Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No assets logged yet. Approve detections in AI Inventory Studio or click Register Asset.</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{a.asset_name || a.name}</div>
                  {a.notes && <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{a.notes}</div>}
                </td>
                <td className="px-4 py-3 text-[#4A9EFF]">{a.category || "Commercial assets"}</td>
                <td className="px-4 py-3 text-slate-300">
                  <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-500" /> {a.building || a.site_name || "Site"}</span>
                  <span className="text-slate-500"> · </span>
                  <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3 text-slate-500" /> {a.floor || "Floor 1"} / {a.room || "General"}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-white">{a.quantity || 1}</td>
                <td className="px-4 py-3 text-slate-300">{a.condition || "Good"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {a.verified ? "Human Verified" : "Logged"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {a.matterport_space_id ? (
                    <a
                      href={`https://my.matterport.com/show/?m=${encodeURIComponent(a.matterport_space_id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#FF8A3D] hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Open 3D <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">{a.digital_twin_location || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <form onSubmit={createAsset} className="relative w-full max-w-lg rounded-2xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-3 text-xs shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Register Digital Twin Asset</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input required placeholder="Asset Name *" value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value="">Link to Project (optional)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <input placeholder="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <input placeholder="Room / Zone" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" min="1" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <input placeholder="Matterport Space ID" value={form.matterport_space_id} onChange={(e) => setForm({ ...form, matterport_space_id: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <textarea rows={2} placeholder="Condition notes / serial number / insurance ref..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 rounded-lg text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#F97316] text-white font-semibold">Save Asset</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
