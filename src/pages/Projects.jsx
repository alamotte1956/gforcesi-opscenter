import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, FolderKanban, Archive, Building2, Layers, ScanLine, Calendar,
  DollarSign, ShieldCheck, ExternalLink, X, ArrowRight, Cpu,
} from "lucide-react";
import FormModal from "@/components/FormModal";
import BulkCsvUpload from "@/components/BulkCsvUpload";
import CrudActions from "@/components/CrudActions";
import { useToast } from "@/components/ui/use-toast";

const LIFECYCLE_STAGES = [
  { key: "lead", label: "Lead" },
  { key: "estimate", label: "Estimate" },
  { key: "contract", label: "Contract" },
  { key: "scheduling", label: "Scheduling" },
  { key: "scanning", label: "Scanning" },
  { key: "processing", label: "Processing" },
  { key: "quality_review", label: "QA Review" },
  { key: "delivery", label: "Delivery" },
  { key: "invoicing", label: "Invoicing" },
  { key: "archive", label: "Archive" },
];

const statusStyles = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  on_hold: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-slate-700 text-slate-300 border-slate-600",
};

const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4A9EFF]";
const emptyForm = () => ({
  name: "", client_id: "", description: "", status: "active", lifecycle_stage: "scheduling",
  region: "", start_date: "", end_date: "", deadline: "", budget: "", estimated_cost: "",
  client_permissions: "approve", notes: "",
});
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showArchived, setShowArchived] = useState(false);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [activeProject, setActiveProject] = useState(null);
  const [wsTab, setWsTab] = useState("buildings");

  // Workspace sub-forms
  const [bldgForm, setBldgForm] = useState({ name: "", address: "", region_zone: "CONUS", square_footage: "", floor_name: "Floor 1", floorplan_url: "" });
  const [scanForm, setScanForm] = useState({ label: "", space_id: "", pme_url: "", ai_inventory_enabled: true });
  const [sessionForm, setSessionForm] = useState({ date: new Date().toISOString().slice(0, 10), contractor_name: "", duration_hours: "3", status: "scheduled", notes: "" });

  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [p, j, c, exp, inv, user] = await Promise.all([
      base44.entities.Project.list().catch(() => []),
      base44.entities.Job.list().catch(() => []),
      base44.entities.Client.list().catch(() => []),
      base44.entities.Expense.list().catch(() => []),
      base44.entities.Invoice.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setProjects(p || []);
    setJobs(j || []);
    setClients(c || []);
    setExpenses(exp || []);
    setInvoices(inv || []);
    setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.client_id) return;
    const client = clients.find((c) => c.id === form.client_id);
    const name = form.name;
    await base44.entities.Project.create({
      name,
      client_id: form.client_id,
      client_name: client?.name,
      description: form.description || undefined,
      status: form.status,
      lifecycle_stage: form.lifecycle_stage || "scheduling",
      region: form.region || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      deadline: form.deadline || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
      client_permissions: form.client_permissions || "approve",
      buildings: [],
      matterport_scans: [],
      scanning_sessions: [],
      notes: form.notes || undefined,
    });
    setForm(emptyForm());
    setShowForm(false);
    toast({ title: "Digital Twin Project Created", description: name });
    load();
  };

  const updateProjectField = async (proj, patch, toastMsg) => {
    const updated = { ...proj, ...patch };
    setProjects((prev) => prev.map((x) => (x.id === proj.id ? updated : x)));
    if (activeProject?.id === proj.id) setActiveProject(updated);
    await base44.entities.Project.update(proj.id, patch);
    if (toastMsg) toast({ title: toastMsg });
  };

  const addBuildingAndFloor = async (e) => {
    e.preventDefault();
    if (!activeProject || !bldgForm.name) return;
    const buildings = [...(activeProject.buildings || [])];
    const existingIdx = buildings.findIndex((b) => b.name.toLowerCase() === bldgForm.name.trim().toLowerCase());
    const floorEntry = { name: bldgForm.floor_name || "Floor 1", sq_ft: Number(bldgForm.square_footage || 0), floorplan_url: bldgForm.floorplan_url || "" };
    if (existingIdx >= 0) {
      buildings[existingIdx] = {
        ...buildings[existingIdx],
        floors: [...(buildings[existingIdx].floors || []), floorEntry],
      };
    } else {
      buildings.push({
        id: `bldg_${Date.now()}`,
        name: bldgForm.name.trim(),
        address: bldgForm.address,
        region_zone: bldgForm.region_zone,
        square_footage: Number(bldgForm.square_footage || 0),
        floors: [floorEntry],
      });
    }
    await updateProjectField(activeProject, { buildings }, "Building & Floor added");
    setBldgForm({ name: "", address: "", region_zone: "CONUS", square_footage: "", floor_name: "Floor 1", floorplan_url: "" });
  };

  const addMatterportScan = async (e) => {
    e.preventDefault();
    if (!activeProject || (!scanForm.space_id && !scanForm.pme_url)) return;
    const pme = scanForm.pme_url || `https://my.matterport.com/show/?m=${encodeURIComponent(scanForm.space_id)}&play=1&qs=1`;
    const matterport_scans = [
      ...(activeProject.matterport_scans || []),
      { id: `mp_${Date.now()}`, label: scanForm.label || scanForm.space_id || "Matterport Scan", space_id: scanForm.space_id, pme_url: pme, ai_inventory_enabled: scanForm.ai_inventory_enabled },
    ];
    await updateProjectField(activeProject, { matterport_scans, matterport_model_id: activeProject.matterport_model_id || scanForm.space_id }, "Matterport Scan linked");
    setScanForm({ label: "", space_id: "", pme_url: "", ai_inventory_enabled: true });
  };

  const addScanningSession = async (e) => {
    e.preventDefault();
    if (!activeProject || !sessionForm.date) return;
    const scanning_sessions = [
      ...(activeProject.scanning_sessions || []),
      { id: `ses_${Date.now()}`, ...sessionForm, duration_hours: Number(sessionForm.duration_hours || 2) },
    ];
    await updateProjectField(activeProject, { scanning_sessions }, "Scanning session scheduled");
    setSessionForm({ date: new Date().toISOString().slice(0, 10), contractor_name: "", duration_hours: "3", status: "scheduled", notes: "" });
  };

  const visibleProjects = useMemo(
    () =>
      projects
        .filter((p) => (showArchived ? p.archived : !p.archived))
        .filter((p) => stageFilter === "ALL" || (p.lifecycle_stage || (p.status === "completed" ? "delivery" : "scheduling")) === stageFilter),
    [projects, showArchived, stageFilter]
  );

  const projectEconomics = (p) => {
    const pJobs = jobs.filter((j) => j.project_id === p.id);
    const pInv = invoices.filter((i) => i.project_id === p.id);
    const pExp = expenses.filter((e) => e.project_id === p.id);
    const revenue = Math.max(
      Number(p.budget || 0),
      pInv.reduce((s, i) => s + Number(i.total || i.subtotal || 0), 0),
      pJobs.reduce((s, j) => s + Number(j.price || j.billable_rate || 0), 0)
    );
    const cost = Math.max(Number(p.estimated_cost || 0), pExp.reduce((s, e) => s + Number(e.amount || 0), 0));
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { revenue, cost, profit, margin, jobCount: pJobs.length, doneCount: pJobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length };
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#F97316]" /> Digital Twin Project Management
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Full 10-stage lifecycle (Lead → Archive) with Multi-Building, Multi-Floor, Multi-Scan &amp; Multi-Session tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowArchived((v) => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${showArchived ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"}`}>
            <Archive className="w-3.5 h-3.5" /> {showArchived ? "Showing archived" : "Show archived"}
          </button>
          {isAdmin && (
            <>
              <BulkCsvUpload
                entityName="Project"
                onImported={load}
                ctx={{ clients }}
                templateColumns={[
                  { key: "name", label: "name", example: "Bank of America Northeast Rollout", required: true },
                  { key: "client_name", label: "client_name", example: "Bank of America", required: true },
                  { key: "description", label: "description", example: "Multi-building Pro3 LiDAR rollout" },
                  { key: "lifecycle_stage", label: "lifecycle_stage", example: "scheduling" },
                  { key: "region", label: "region", example: "CONUS" },
                  { key: "budget", label: "budget", example: "45000" },
                  { key: "deadline", label: "deadline", example: "2026-12-30" },
                ]}
                transform={(r, ctx) => {
                  const client = ctx.clients.find((c) => c.name.toLowerCase() === (r.client_name || "").toLowerCase());
                  if (!client) return null;
                  return {
                    name: r.name,
                    client_id: client.id,
                    client_name: client.name,
                    description: r.description || undefined,
                    status: "active",
                    lifecycle_stage: LIFECYCLE_STAGES.some((s) => s.key === r.lifecycle_stage) ? r.lifecycle_stage : "scheduling",
                    region: r.region || undefined,
                    budget: r.budget ? Number(r.budget) : undefined,
                    deadline: r.deadline || undefined,
                  };
                }}
              />
              <button onClick={() => setShowForm(true)} className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-semibold text-xs flex items-center gap-1.5 hover:from-[#FB923C]">
                <Plus className="w-4 h-4" /> New Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* 10-Stage Lifecycle Filter Strip */}
      <div className="flex flex-wrap gap-1.5 pb-1">
        <button
          onClick={() => setStageFilter("ALL")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${stageFilter === "ALL" ? "bg-[#126DFA] border-[#126DFA] text-white" : "bg-[#0D1C33] border-[#1E3A5F] text-slate-400 hover:text-white"}`}
        >
          All Stages ({projects.filter((p) => (showArchived ? p.archived : !p.archived)).length})
        </button>
        {LIFECYCLE_STAGES.map((st) => {
          const cnt = projects.filter((p) => (showArchived ? p.archived : !p.archived) && (p.lifecycle_stage || (p.status === "completed" ? "delivery" : "scheduling")) === st.key).length;
          return (
            <button
              key={st.key}
              onClick={() => setStageFilter(st.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${stageFilter === st.key ? "bg-[#F97316] border-[#F97316] text-white" : "bg-[#0D1C33] border-[#1E3A5F] text-slate-400 hover:text-white"}`}
            >
              {st.label} {cnt > 0 && <span className="ml-1 opacity-80">({cnt})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-[#F97316] rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((p) => {
            const econ = projectEconomics(p);
            const pct = econ.jobCount ? Math.round((econ.doneCount / econ.jobCount) * 100) : 0;
            const stage = p.lifecycle_stage || (p.status === "completed" ? "delivery" : "scheduling");
            const stageIdx = Math.max(0, LIFECYCLE_STAGES.findIndex((s) => s.key === stage));
            const nextStage = LIFECYCLE_STAGES[stageIdx + 1];
            const bldgCount = (p.buildings || []).length;
            const floorCount = (p.buildings || []).reduce((s, b) => s + (b.floors?.length || 0), 0);
            const scanCount = (p.matterport_scans || []).length + (p.matterport_model_id && !(p.matterport_scans || []).length ? 1 : 0);

            return (
              <div key={p.id} className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] hover:border-[#4A9EFF]/60 p-4 transition space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-white">{p.name}</h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${statusStyles[p.status] || statusStyles.active}`}>{p.status}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] font-semibold uppercase">
                        Stage {stageIdx + 1}/10: {LIFECYCLE_STAGES[stageIdx]?.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                      <span>{p.client_name || "Enterprise Client"}</span>
                      {p.region && <span>· {p.region}</span>}
                      {p.deadline && <span className="text-amber-300">· Deadline: {p.deadline}</span>}
                      <span className="text-[#4A9EFF]">· {bldgCount} Bldg / {floorCount} Floors / {scanCount} Scans / {(p.scanning_sessions || []).length} Sessions</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-right text-xs mr-2">
                      <div className="font-bold text-emerald-400">{fmtMoney(econ.revenue)} <span className="text-slate-400 font-normal">({econ.margin}% margin)</span></div>
                      <div className="text-[11px] text-slate-400">{econ.doneCount}/{econ.jobCount} jobs ({pct}%)</div>
                    </div>
                    {nextStage && isAdmin && (
                      <button
                        onClick={() => updateProjectField(p, { lifecycle_stage: nextStage.key, ...(nextStage.key === "archive" ? { archived: true } : {}) }, `Moved to ${nextStage.label}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#126DFA]/20 hover:bg-[#126DFA] text-[#4A9EFF] hover:text-white text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        {nextStage.label} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveProject(p); setWsTab("buildings"); }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-semibold"
                    >
                      Open 3D Workspace
                    </button>
                    {isAdmin && <CrudActions entityName="Project" record={p} onChanged={load} />}
                  </div>
                </div>

                {/* Visual 10-stage progress bar */}
                <div className="grid grid-cols-10 gap-1">
                  {LIFECYCLE_STAGES.map((st, idx) => (
                    <div
                      key={st.key}
                      title={st.label}
                      className={`h-1.5 rounded-full ${idx <= stageIdx ? (idx === stageIdx ? "bg-[#F97316]" : "bg-[#126DFA]") : "bg-slate-800"}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {visibleProjects.length === 0 && (
            <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-10 text-center text-sm text-slate-500">
              No projects match this lifecycle stage.
            </div>
          )}
        </div>
      )}

      {/* Multi-Building / Multi-Floor / Multi-Scan / Multi-Session Workspace Modal */}
      {activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setActiveProject(null)} />
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#0A1628] border border-[#1E3A5F] p-5 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{activeProject.name}</h2>
                <p className="text-xs text-slate-400">
                  {activeProject.client_name} · Client Access: <strong className="text-[#4A9EFF] uppercase">{activeProject.client_permissions || "approve"}</strong>
                  {activeProject.deadline && ` · Deadline: ${activeProject.deadline}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://studio.twinscanstudio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" /> TwinScan AI Studio <ExternalLink className="w-3 h-3" />
                </a>
                <button onClick={() => setActiveProject(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {LIFECYCLE_STAGES.map((st) => {
                const active = (activeProject.lifecycle_stage || "scheduling") === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => updateProjectField(activeProject, { lifecycle_stage: st.key }, `Stage set to ${st.label}`)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${active ? "bg-[#F97316] text-white" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"}`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Workspace Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2.5 text-xs">
              {[
                { id: "buildings", label: `Buildings & Floors (${(activeProject.buildings || []).length})`, icon: Building2 },
                { id: "scans", label: `Matterport Scans (${(activeProject.matterport_scans || []).length})`, icon: ScanLine },
                { id: "sessions", label: `Scanning Sessions (${(activeProject.scanning_sessions || []).length})`, icon: Calendar },
                { id: "profitability", label: "Costs, Permissions & Margin", icon: DollarSign },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setWsTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 ${wsTab === t.id ? "bg-[#126DFA] text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {wsTab === "buildings" && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {(activeProject.buildings || []).length === 0 ? (
                    <p className="text-xs text-slate-500">No buildings added yet. Add multiple buildings &amp; floors below.</p>
                  ) : (activeProject.buildings || []).map((b, i) => (
                    <div key={b.id || i} className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#4A9EFF]" /> {b.name}
                          <span className="px-2 py-0.5 rounded bg-[#F97316]/15 text-[#FF8A3D] text-[10px]">{b.region_zone || "CONUS"}</span>
                        </div>
                        <span className="text-slate-400">{b.address}</span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {(b.floors || []).map((fl, fi) => (
                          <div key={fi} className="p-2 rounded-lg bg-[#0A1628] border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-1"><Layers className="w-3 h-3 text-[#4A9EFF]" /> {fl.name}</div>
                              <div className="text-[11px] text-slate-500">{fl.sq_ft ? `${fl.sq_ft.toLocaleString()} sq ft` : "Area TBD"}</div>
                            </div>
                            {fl.floorplan_url && (
                              <a href={fl.floorplan_url} target="_blank" rel="noreferrer" className="text-[11px] text-[#4A9EFF] underline">Plan</a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={addBuildingAndFloor} className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] space-y-3 text-xs">
                  <div className="font-bold text-white">Add Building / Floor &amp; Floor Plan</div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input required placeholder="Building Name (match to add floor)" value={bldgForm.name} onChange={(e) => setBldgForm({ ...bldgForm, name: e.target.value })} className={inputCls} />
                    <input placeholder="Address" value={bldgForm.address} onChange={(e) => setBldgForm({ ...bldgForm, address: e.target.value })} className={inputCls} />
                    <select value={bldgForm.region_zone} onChange={(e) => setBldgForm({ ...bldgForm, region_zone: e.target.value })} className={inputCls}>
                      <option value="CONUS">CONUS</option>
                      <option value="AK">Alaska (AK)</option>
                      <option value="HI">Hawaii (HI)</option>
                    </select>
                    <input placeholder="Floor Name (e.g., Floor 2 / Vault)" value={bldgForm.floor_name} onChange={(e) => setBldgForm({ ...bldgForm, floor_name: e.target.value })} className={inputCls} />
                    <input type="number" placeholder="Square Footage" value={bldgForm.square_footage} onChange={(e) => setBldgForm({ ...bldgForm, square_footage: e.target.value })} className={inputCls} />
                    <input placeholder="Floor Plan URL (optional)" value={bldgForm.floorplan_url} onChange={(e) => setBldgForm({ ...bldgForm, floorplan_url: e.target.value })} className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white font-semibold">+ Add Building / Floor</button>
                </form>
              </div>
            )}

            {wsTab === "scans" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(activeProject.matterport_scans || []).map((sc, i) => (
                    <div key={sc.id || i} className="p-3 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-white">{sc.label} {sc.space_id && <span className="text-[#4A9EFF] font-mono ml-1">({sc.space_id})</span>}</div>
                        <div className="text-[11px] text-slate-400">{sc.ai_inventory_enabled ? "AI Object Recognition Enabled (TwinScan Studio)" : "Standard 3D Digital Twin"}</div>
                      </div>
                      <div className="flex gap-2">
                        <a href={sc.pme_url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-[#126DFA] text-white font-semibold inline-flex items-center gap-1">
                          Open 3D PME <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href="https://studio.twinscanstudio.com" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded bg-[#F97316] text-white font-semibold inline-flex items-center gap-1">
                          Run AI Inventory <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={addMatterportScan} className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] space-y-3 text-xs">
                  <div className="font-bold text-white">Link Matterport Scan / Space ID</div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input placeholder="Scan Label (e.g., Main Lobby)" value={scanForm.label} onChange={(e) => setScanForm({ ...scanForm, label: e.target.value })} className={inputCls} />
                    <input placeholder="Matterport Space ID" value={scanForm.space_id} onChange={(e) => setScanForm({ ...scanForm, space_id: e.target.value })} className={inputCls} />
                    <input placeholder="PME URL (auto-built from Space ID)" value={scanForm.pme_url} onChange={(e) => setScanForm({ ...scanForm, pme_url: e.target.value })} className={inputCls} />
                  </div>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input type="checkbox" checked={scanForm.ai_inventory_enabled} onChange={(e) => setScanForm({ ...scanForm, ai_inventory_enabled: e.target.checked })} />
                    Enable TwinScan Studio AI Object Recognition &amp; Multi-Scan Inventory Counting
                  </label>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#126DFA] text-white font-semibold">+ Link Matterport Scan</button>
                </form>
              </div>
            )}

            {wsTab === "sessions" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(activeProject.scanning_sessions || []).map((ses, i) => (
                    <div key={ses.id || i} className="p-3 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-white">{ses.date} · {ses.contractor_name || "Assigned Crew"} ({ses.duration_hours}h)</div>
                        {ses.notes && <div className="text-slate-400">{ses.notes}</div>}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 capitalize">{ses.status}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={addScanningSession} className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] space-y-3 text-xs">
                  <div className="font-bold text-white">Schedule Multi-Session Capture</div>
                  <div className="grid sm:grid-cols-4 gap-2">
                    <input type="date" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} className={inputCls} />
                    <input placeholder="Crew / Subcontractor" value={sessionForm.contractor_name} onChange={(e) => setSessionForm({ ...sessionForm, contractor_name: e.target.value })} className={inputCls} />
                    <input type="number" placeholder="Hours" value={sessionForm.duration_hours} onChange={(e) => setSessionForm({ ...sessionForm, duration_hours: e.target.value })} className={inputCls} />
                    <input placeholder="Session Notes" value={sessionForm.notes} onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })} className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#F97316] text-white font-semibold">+ Add Scanning Session</button>
                </form>
              </div>
            )}

            {wsTab === "profitability" && (() => {
              const econ = projectEconomics(activeProject);
              return (
                <div className="space-y-4 text-xs">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
                      <div className="text-slate-400">Project Revenue / Budget</div>
                      <div className="text-xl font-bold text-[#4A9EFF] mt-1">{fmtMoney(econ.revenue)}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
                      <div className="text-slate-400">Tracked Field &amp; Travel Costs</div>
                      <div className="text-xl font-bold text-amber-300 mt-1">{fmtMoney(econ.cost)}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-emerald-300">Net Project Profitability</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{fmtMoney(econ.profit)} ({econ.margin}%)</div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#4A9EFF]" />
                      <span className="font-semibold text-white">Client Portal Access Level:</span>
                    </div>
                    <select
                      value={activeProject.client_permissions || "approve"}
                      onChange={(e) => updateProjectField(activeProject, { client_permissions: e.target.value }, "Client permissions updated")}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    >
                      <option value="view">View Only (PME &amp; Progress)</option>
                      <option value="approve">View + Approve Deliverables &amp; Download</option>
                      <option value="admin">Full Agency Stakeholder Admin</option>
                    </select>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showForm && (
        <FormModal title="New Digital Twin Project" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Create Project">
          <div className="space-y-3">
            <div><label className="block text-xs text-slate-400 mb-1">Project Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Bank of America 50-State Rollout" /></div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Client *</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputCls}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Lifecycle Stage</label>
                <select value={form.lifecycle_stage} onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })} className={inputCls}>
                  {LIFECYCLE_STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-slate-400 mb-1">Region / Zone</label><input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputCls} placeholder="CONUS / AK / HI" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-slate-400 mb-1">Budget ($)</label><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputCls} placeholder="25000" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Est. Cost ($)</label><input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className={inputCls} placeholder="9500" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Deadline</label><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} /></div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
