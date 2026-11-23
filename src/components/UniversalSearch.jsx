import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, X, ArrowRight, FolderKanban, Building2, MapPin, Boxes, Compass } from "lucide-react";

const QUICK_ROUTES = [
  { label: "Executive Business Dashboard", path: "/executive", group: "Dashboard" },
  { label: "CRM & Sales Pipeline", path: "/crm", group: "Customers" },
  { label: "Digital Twin Projects (10-Stage)", path: "/projects", group: "Projects" },
  { label: "AI Visual Inventory Studio", path: "/ai-inventory", group: "AI Inventory" },
  { label: "Digital Twin Asset Management", path: "/assets", group: "Assets" },
  { label: "AI Route & AK/HI Flight Planner", path: "/routes", group: "Scheduling" },
  { label: "QuickBooks Online & Financials", path: "/finance", group: "Billing" },
  { label: "HR, Federal/State Taxes & W-9 PDF", path: "/hr-tax-payroll", group: "Administration" },
  { label: "Social Media Marketing & Metricool", path: "/marketing", group: "Customers" },
  { label: "Multi-Tenant SaaS Super Admin", path: "/saas-admin", group: "Administration" },
  { label: "Ad Agency / Client Portal", path: "/client-portal", group: "Digital Twins" },
  { label: "Offline Field Technician PWA", path: "/field", group: "Scheduling" },
];

export default function UniversalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState({ clients: [], projects: [], sites: [], assets: [] });

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      base44.entities.Client.list().catch(() => []),
      base44.entities.Project.list().catch(() => []),
      base44.entities.Site.list().catch(() => []),
      base44.entities.AssetAssessment.list().catch(() => []),
    ]).then(([clients, projects, sites, assets]) => {
      setRecords({ clients: clients || [], projects: projects || [], sites: sites || [], assets: assets || [] });
    });
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s) => !q || String(s || "").toLowerCase().includes(q);
    return {
      routes: QUICK_ROUTES.filter((r) => match(r.label) || match(r.group)).slice(0, 6),
      clients: records.clients.filter((c) => match(c.name) || match(c.company)).slice(0, 4),
      projects: records.projects.filter((p) => match(p.name) || match(p.client_name)).slice(0, 4),
      sites: records.sites.filter((s) => match(s.name) || match(s.branch_code) || match(s.address)).slice(0, 4),
      assets: records.assets.filter((a) => match(a.asset_name || a.name) || match(a.category)).slice(0, 4),
    };
  }, [query, records]);

  const go = (path) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] hover:border-[#4A9EFF] text-xs text-slate-400 transition"
      >
        <Search className="w-3.5 h-3.5 text-[#4A9EFF]" />
        <span className="truncate">Universal Search…</span>
        <kbd className="ml-auto px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-400">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0D1C33] border border-[#1E3A5F] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-[#F97316]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, clients, projects, branches, or assets..."
                className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500"
              />
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3 text-xs">
              {results.routes.length > 0 && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#4A9EFF]">Navigation</div>
                  {results.routes.map((r) => (
                    <button key={r.path} onClick={() => go(r.path)} className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/70 flex items-center justify-between text-left">
                      <span className="text-slate-200 flex items-center gap-2"><Compass className="w-3.5 h-3.5 text-[#FF8A3D]" /> {r.label}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">{r.group} <ArrowRight className="w-3 h-3" /></span>
                    </button>
                  ))}
                </div>
              )}

              {results.clients.length > 0 && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#FF8A3D]">Customers &amp; Agencies</div>
                  {results.clients.map((c) => (
                    <button key={c.id} onClick={() => go("/crm")} className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/70 flex items-center justify-between text-left">
                      <span className="text-white flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-[#4A9EFF]" /> {c.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{c.client_type || "client"}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#4A9EFF]">Digital Twin Projects</div>
                  {results.projects.map((p) => (
                    <button key={p.id} onClick={() => go("/projects")} className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/70 flex items-center justify-between text-left">
                      <span className="text-white flex items-center gap-2"><FolderKanban className="w-3.5 h-3.5 text-[#FF8A3D]" /> {p.name}</span>
                      <span className="text-[10px] text-emerald-300 capitalize">{p.lifecycle_stage || p.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.sites.length > 0 && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#FF8A3D]">50-State Sites &amp; Scans</div>
                  {results.sites.map((s) => (
                    <button key={s.id} onClick={() => go("/sites")} className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/70 flex items-center justify-between text-left">
                      <span className="text-white flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#4A9EFF]" /> {s.name}</span>
                      <span className="text-[10px] text-[#FF8A3D] font-mono">{s.branch_code || s.region_zone}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.assets.length > 0 && (
                <div>
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#4A9EFF]">Verified Assets</div>
                  {results.assets.map((a) => (
                    <button key={a.id} onClick={() => go("/assets")} className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-800/70 flex items-center justify-between text-left">
                      <span className="text-white flex items-center gap-2"><Boxes className="w-3.5 h-3.5 text-emerald-400" /> {a.asset_name || a.name}</span>
                      <span className="text-[10px] text-slate-400">{a.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
