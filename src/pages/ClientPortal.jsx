import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import {
  Satellite, LogOut, ArrowLeft, Building2, MapPin, Calendar, FileText,
  CheckCircle2, Clock, Activity, Loader2, Send, MessageSquare, ScanLine,
  Search, Download, Eye, X, ShieldCheck, Globe2, Layers, KeyRound,
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import GuideDownload from "@/components/GuideDownload";

const TYPE_LABEL = {
  "3d_model": "3D Digital Twin",
  matterpak: "MatterPak Bundle",
  floorplan: "2D Floor Plan",
  pointcloud: "E57 Point Cloud",
  photos: "Site Photography",
  other: "Deliverable",
};

const PORTAL_STAGES = [
  { key: "scheduled", label: "Scheduled", match: ["scheduled", "en_route", "on_site"] },
  { key: "scanned", label: "Scanned", match: ["scanning", "processing"] },
  { key: "qa_review", label: "QA Review", match: ["qa_review"] },
  { key: "delivered", label: "Delivered", match: ["complete", "invoiced"] },
];

function resolvePortalStage(job) {
  if (["complete", "invoiced"].includes(job.status) && job.qa_status === "passed") return 3;
  if (["complete", "invoiced"].includes(job.status)) return 3;
  if (job.status === "processing" || job.qa_status === "pending" && job.status === "scanning") return 1;
  if (job.qa_status === "revision_required") return 2;
  if (job.status === "scanning") return 1;
  return 0;
}

export default function ClientPortal() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [cMessages, setCMessages] = useState([]);

  const [previewId, setPreviewId] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [cReply, setCReply] = useState("");
  const [cSending, setCSending] = useState(false);
  const [delivBusy, setDelivBusy] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pmeModal, setPmeModal] = useState(null);

  useEffect(() => {
    (async () => {
      const [user, cls, allSites, allJobs, allProjects, allInv, allMsgs, allDeliv] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Client.list().catch(() => []),
        base44.entities.Site.list().catch(() => []),
        base44.entities.Job.list().catch(() => []),
        base44.entities.Project.list().catch(() => []),
        base44.entities.Invoice.list().catch(() => []),
        base44.entities.Message.list("created_date").catch(() => []),
        base44.entities.Deliverable.list().catch(() => []),
      ]);
      setMe(user);
      setClients(cls);
      setSites(allSites);
      setJobs(allJobs);
      setProjects(allProjects);
      setInvoices(allInv);
      setCMessages(allMsgs);
      setDeliverables(allDeliv);
      setLoading(false);
    })();

    const unsubJob = base44.entities.Job.subscribe((event) => {
      setJobs((prev) => {
        if (event.type === "delete") return prev.filter((j) => j.id !== event.id);
        const idx = prev.findIndex((j) => j.id === event.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = event.data;
          return copy;
        }
        return [...prev, event.data];
      });
    });
    const unsubMsg = base44.entities.Message.subscribe(() => {
      base44.entities.Message.list("created_date").then(setCMessages).catch(() => {});
    });
    return () => { unsubJob(); unsubMsg(); };
  }, []);

  const isAdmin = me?.role === "admin";

  // STRICT TENANT ISOLATION: Match authenticated user to their Agency or Enterprise Client record
  const matchedClient = useMemo(() => {
    if (!me) return null;
    if (me.agency_id) {
      const byAgency = clients.find((c) => c.id === me.agency_id);
      if (byAgency) return byAgency;
    }
    if (me.client_id) {
      const byClient = clients.find((c) => c.id === me.client_id);
      if (byClient) return byClient;
    }
    return clients.find(
      (c) => c.portal_email && me.email && c.portal_email.toLowerCase() === me.email.toLowerCase()
    ) || null;
  }, [clients, me]);

  const activeClient = isAdmin
    ? clients.find((c) => c.id === previewId) || matchedClient || clients[0] || null
    : matchedClient;

  const isAgency = activeClient?.client_type === "ad_agency";

  // Subsidiary brands managed by this Ad Agency (e.g., Bank of America)
  const managedBrands = useMemo(() => {
    if (!activeClient) return [];
    if (!isAgency) return [activeClient];
    const subs = clients.filter((c) => c.parent_agency_id === activeClient.id);
    return [activeClient, ...subs];
  }, [activeClient, clients, isAgency]);

  const allowedClientIds = useMemo(() => new Set(managedBrands.map((b) => b.id)), [managedBrands]);

  // Tenant-isolated datasets
  const tenantJobs = useMemo(() => {
    if (!activeClient) return [];
    return jobs.filter((j) => {
      if (isAgency) {
        return j.agency_id === activeClient.id || allowedClientIds.has(j.client_id);
      }
      return j.client_id === activeClient.id;
    });
  }, [jobs, activeClient, isAgency, allowedClientIds]);

  const tenantSites = useMemo(() => {
    if (!activeClient) return [];
    return sites.filter((s) => {
      if (isAgency) return s.agency_id === activeClient.id || allowedClientIds.has(s.client_id);
      return s.client_id === activeClient.id;
    });
  }, [sites, activeClient, isAgency, allowedClientIds]);

  const tenantDeliverables = useMemo(() => {
    if (!activeClient) return [];
    return deliverables.filter((d) => {
      if (isAgency) return d.agency_id === activeClient.id || allowedClientIds.has(d.client_id);
      return d.client_id === activeClient.id;
    });
  }, [deliverables, activeClient, isAgency, allowedClientIds]);

  const tenantProjects = useMemo(() => {
    if (!activeClient) return [];
    return projects.filter((p) => allowedClientIds.has(p.client_id));
  }, [projects, activeClient, allowedClientIds]);

  const tenantInvoices = useMemo(() => {
    if (!activeClient) return [];
    return invoices.filter((i) => {
      if (isAgency) return i.agency_id === activeClient.id || allowedClientIds.has(i.client_id);
      return i.client_id === activeClient.id;
    });
  }, [invoices, activeClient, isAgency, allowedClientIds]);

  const filteredJobs = useMemo(() => {
    return tenantJobs.filter((j) => {
      if (brandFilter !== "ALL" && j.client_id !== brandFilter) return false;
      const zone = j.region_zone || tenantSites.find((s) => s.id === j.site_id)?.region_zone || "CONUS";
      if (regionFilter !== "ALL" && zone !== regionFilter) return false;
      const stageIdx = resolvePortalStage(j);
      if (stageFilter !== "ALL" && PORTAL_STAGES[stageIdx]?.key !== stageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${j.title || ""} ${j.branch_code || ""} ${j.site_address || ""} ${j.client_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tenantJobs, tenantSites, brandFilter, regionFilter, stageFilter, searchQuery]);

  const stats = useMemo(() => {
    const counts = { scheduled: 0, scanned: 0, qa_review: 0, delivered: 0, akHi: 0 };
    tenantJobs.forEach((j) => {
      const idx = resolvePortalStage(j);
      const key = PORTAL_STAGES[idx]?.key || "scheduled";
      counts[key] += 1;
      if (["AK", "HI"].includes(j.region_zone)) counts.akHi += 1;
    });
    return counts;
  }, [tenantJobs]);

  const respondDeliverable = async (d, response, reason) => {
    setDelivBusy(d.id);
    try {
      await base44.functions.invoke("respondToDeliverable", {
        deliverable_id: d.id,
        response,
        rejected_reason: reason || undefined,
      });
      const updated = await base44.entities.Deliverable.list().catch(() => []);
      setDeliverables(updated);
    } finally {
      setDelivBusy(null);
      setRejectFor(null);
      setRejectReason("");
    }
  };

  const downloadInvoiceSummary = (inv) => {
    const lines = [
      `G-Force SI Inc. (GForcesi.com) — Invoice Statement`,
      `Invoice #: ${inv.invoice_number}`,
      `Client: ${inv.client_name || activeClient?.company || activeClient?.name}`,
      `Issued: ${inv.issue_date || "—"} | Due: ${inv.due_date || "—"}`,
      `Status: ${String(inv.status || "").toUpperCase()}`,
      `Total: $${Number(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoice_number || "GForceSI-Invoice"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cThread = useMemo(
    () =>
      activeClient
        ? cMessages
            .filter((m) => m.sender_id === activeClient.id || m.recipient_id === activeClient.id)
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
        : [],
    [cMessages, activeClient]
  );

  const cPartner = useMemo(() => {
    if (!activeClient) return null;
    const inbound = cMessages
      .filter((m) => m.recipient_id === activeClient.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    return inbound ? inbound.sender_id : null;
  }, [cMessages, activeClient]);

  const sendClientReply = async () => {
    if (!cReply.trim() || !cPartner || !activeClient) return;
    setCSending(true);
    const partnerMsg = cMessages.find((m) => m.sender_id === cPartner);
    await base44.entities.Message.create({
      sender_id: activeClient.id,
      sender_name: activeClient.company || activeClient.name,
      recipient_id: cPartner,
      recipient_name: partnerMsg?.sender_name,
      body: cReply.trim(),
      channel: "app",
      read: false,
    });
    setCReply("");
    setCSending(false);
  };

  const logout = async () => {
    await base44.auth.logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-[#4A9EFF] rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeClient) {
    return (
      <PortalShell me={me} onLogout={logout} summary={{}}>
        <div className="max-w-md mx-auto mt-20 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            {isAdmin ? "No clients configured yet" : "Portal access not configured"}
          </h2>
          <p className="text-sm text-slate-400">
            {isAdmin
              ? "Add an Ad Agency or Enterprise Client record under Clients to preview their white-label portal."
              : "Your account is not linked to an agency or enterprise client tenant. Contact G-Force SI support."}
          </p>
        </div>
      </PortalShell>
    );
  }

  if (activeClient.portal_access_level === "none" && !isAdmin) {
    return (
      <PortalShell me={me} onLogout={logout} client={activeClient} summary={{}}>
        <div className="max-w-md mx-auto mt-20 text-center">
          <Clock className="w-12 h-12 text-amber-400/70 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Portal Access Pending</h2>
          <p className="text-sm text-slate-400">
            Your enterprise tenant is provisioned and awaiting activation by your G-Force SI account director.
          </p>
        </div>
      </PortalShell>
    );
  }

  const accentColor = activeClient.portal_branding?.primary_color || "#126DFA";
  const limited = activeClient.portal_access_level === "limited";

  return (
    <PortalShell
      me={me}
      onLogout={logout}
      client={activeClient}
      accentColor={accentColor}
      clients={isAdmin ? clients : []}
      previewId={activeClient.id}
      onPreviewChange={setPreviewId}
      summary={{
        client: activeClient.company || activeClient.name,
        clientType: activeClient.client_type,
        totalBranches: tenantJobs.length,
        delivered: stats.delivered,
        slaHours: activeClient.sla_turnaround_hours || 48,
      }}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">
              {activeClient.portal_branding?.custom_header_text || activeClient.company || activeClient.name}
            </h1>
            <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#126DFA]/20 text-[#4A9EFF] border border-[#126DFA]/40 font-semibold">
              {isAgency ? "Ad Agency Multi-Brand Portal" : "Enterprise Client Portal"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
            <span>SLA Guarantee: {activeClient.sla_turnaround_hours || 48}h Turnaround</span>
            <span>·</span>
            <span>Strict Tenant Isolation Active</span>
            {isAgency && <span>· Managing {managedBrands.length - 1} Enterprise Brand(s)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live 50-State Feed
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiBox label="Scheduled" value={stats.scheduled} icon={Calendar} />
        <KpiBox label="Scanned" value={stats.scanned} icon={Activity} />
        <KpiBox label="QA Review" value={stats.qa_review} icon={ShieldCheck} />
        <KpiBox label="Delivered" value={stats.delivered} icon={CheckCircle2} highlight />
        <KpiBox label="AK / HI Remote" value={stats.akHi} icon={Globe2} />
      </div>

      {/* Bulk Branch Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branch code, city, address..."
            className="w-full bg-[#0A1628] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#4A9EFF]"
          />
        </div>
        {isAgency && (
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#4A9EFF]"
          >
            <option value="ALL">All Agency Brands ({managedBrands.length})</option>
            {managedBrands.map((b) => (
              <option key={b.id} value={b.id}>{b.company || b.name}</option>
            ))}
          </select>
        )}
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#4A9EFF]"
        >
          <option value="ALL">All 50 States (CONUS + HI + AK)</option>
          <option value="CONUS">Contiguous US (CONUS)</option>
          <option value="AK">Alaska (AK)</option>
          <option value="HI">Hawaii (HI)</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#4A9EFF]"
        >
          <option value="ALL">All Pipeline Stages</option>
          {PORTAL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Real-Time Branch Scan Pipeline */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4A9EFF]" />
            Branch Scan Tracker ({filteredJobs.length})
          </h2>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
            No branch scans match your current filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const stageIdx = resolvePortalStage(job);
              const pmeUrl = job.matterport_pme_url || job.matterport_embed_url;
              return (
                <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {job.branch_code && (
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0A1628] border border-slate-700 text-[#4A9EFF]">
                            {job.branch_code}
                          </span>
                        )}
                        <span className="font-semibold text-slate-100">{job.title}</span>
                        {job.region_zone && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            job.region_zone === "AK" ? "bg-amber-500/15 text-amber-300"
                            : job.region_zone === "HI" ? "bg-cyan-500/15 text-cyan-300"
                            : "bg-slate-800 text-slate-400"
                          }`}>
                            {job.region_zone}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.site_address || "Remote"}</span>
                        {job.scheduled_start && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(job.scheduled_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {job.client_name && <span>Brand: {job.client_name}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pmeUrl && (
                        <button
                          onClick={() => setPmeModal({ title: job.title, url: pmeUrl, branch: job.branch_code })}
                          className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Open PME 3D Twin
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4-Stage Enterprise Progress Stepper */}
                  <div className="flex items-center mt-4">
                    {PORTAL_STAGES.map((st, idx) => (
                      <React.Fragment key={st.key}>
                        <div className="flex flex-col items-center w-20 shrink-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                              idx < stageIdx
                                ? "bg-emerald-500 border-emerald-500 text-slate-950"
                                : idx === stageIdx
                                ? "bg-[#126DFA]/25 border-[#4A9EFF] text-[#4A9EFF]"
                                : "bg-slate-800 border-slate-700 text-slate-500"
                            }`}
                          >
                            {idx < stageIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-[10px] mt-1 font-medium ${idx <= stageIdx ? "text-slate-200" : "text-slate-600"}`}>
                            {st.label}
                          </span>
                        </div>
                        {idx < PORTAL_STAGES.length - 1 && (
                          <div className={`flex-1 h-0.5 -mt-4 ${idx < stageIdx ? "bg-emerald-500" : "bg-slate-800"}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Digital Twin Deliverables & Sign-Off */}
      {tenantDeliverables.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#4A9EFF]" />
            Deliverables & Stakeholder Sign-Off ({tenantDeliverables.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tenantDeliverables.map((d) => {
              const pmeUrl = d.matterport_pme_url || d.embed_url;
              return (
                <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{d.job_title || d.title || TYPE_LABEL[d.deliverable_type] || "3D Digital Twin"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {TYPE_LABEL[d.deliverable_type] || d.deliverable_type || "3D Digital Twin"}
                          {d.branch_code ? ` · ${d.branch_code}` : ""}
                          {d.site_address ? ` · ${d.site_address}` : ""}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                        d.status === "accepted"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : d.status === "rejected"
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : "bg-[#126DFA]/15 text-[#4A9EFF] border-[#126DFA]/30"
                      }`}>
                        {d.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {pmeUrl && (
                        <button
                          onClick={() => setPmeModal({ title: d.job_title || d.title || "3D Digital Twin", url: pmeUrl, branch: d.branch_code })}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#126DFA] text-white hover:bg-[#4A9EFF] font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> Launch PME Viewer
                        </button>
                      )}
                      {d.matterpak_url && (
                        <a href={d.matterpak_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
                          <Download className="w-3.5 h-3.5" /> MatterPak
                        </a>
                      )}
                      {d.e57_pointcloud_url && (
                        <a href={d.e57_pointcloud_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
                          <Download className="w-3.5 h-3.5" /> E57 Point Cloud
                        </a>
                      )}
                      {(d.floorplan_url || d.download_url) && (
                        <a href={d.floorplan_url || d.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
                          <FileText className="w-3.5 h-3.5" /> Floor Plan / Assets
                        </a>
                      )}
                    </div>
                  </div>

                  {d.status === "delivered" && (
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => respondDeliverable(d, "accept")}
                        disabled={delivBusy === d.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Approve Deliverable
                      </button>
                      <button
                        onClick={() => setRejectFor(d)}
                        disabled={delivBusy === d.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50"
                      >
                        Request Revision
                      </button>
                    </div>
                  )}
                  {d.status === "accepted" && (
                    <div className="pt-3 border-t border-slate-800 text-xs text-emerald-300">
                      Approved {d.accepted_at ? new Date(d.accepted_at).toLocaleDateString() : ""}
                      {d.accepted_by_name ? ` by ${d.accepted_by_name}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Invoices */}
      {!limited && tenantInvoices.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4A9EFF]" /> Invoices & Statements
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800 bg-[#0A1628]">
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Issued</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {tenantInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-800/60">
                    <td className="px-4 py-3 font-mono text-slate-200">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-slate-400">{inv.issue_date}</td>
                    <td className="px-4 py-3 text-slate-400">{inv.due_date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full capitalize text-[10px] font-medium ${
                        inv.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-300"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-100">${Number(inv.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadInvoiceSummary(inv)}
                        className="inline-flex items-center gap-1 text-[#4A9EFF] hover:text-white"
                      >
                        <Download className="w-3.5 h-3.5" /> Statement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Direct Dispatch Messaging */}
      <section>
        <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4A9EFF]" /> Direct Operations Desk
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 flex flex-col min-h-[260px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-64">
            {cThread.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-8">
                No messages yet. Your G-Force SI Account Director will message you here with rollout updates.
              </div>
            ) : (
              cThread.map((m) => {
                const mine = m.sender_id === activeClient.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${mine ? "bg-[#126DFA] text-white" : "bg-slate-800 text-slate-200"}`}>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className="text-[10px] mt-1 opacity-70">
                        {new Date(m.created_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 border-t border-slate-800 flex gap-2">
            <input
              value={cReply}
              onChange={(e) => setCReply(e.target.value)}
              placeholder={cPartner ? "Reply to G-Force SI Operations..." : "Awaiting dispatcher thread..."}
              className="flex-1 bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#4A9EFF]"
            />
            <button
              onClick={sendClientReply}
              disabled={cSending || !cReply.trim() || !cPartner}
              className="px-4 py-2 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {cSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send
            </button>
          </div>
        </div>
      </section>

      {/* Private Model Embed (PME) Modal */}
      {pmeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setPmeModal(null)} />
          <div className="relative w-full max-w-5xl rounded-2xl border border-slate-700 bg-[#0A1628] p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-[#4A9EFF]" />
                  {pmeModal.title}
                  {pmeModal.branch && <span className="font-mono text-xs text-[#4A9EFF]">({pmeModal.branch})</span>}
                </div>
                <div className="text-[11px] text-slate-400">Private Model Embed (PME) — No Matterport admin seat required</div>
              </div>
              <button onClick={() => setPmeModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-slate-800" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={pmeModal.url}
                title={pmeModal.title}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="xr-spatial-tracking; vr; accelerometer; fullscreen; autoplay"
              />
            </div>
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRejectFor(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Request Deliverable Revision</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Specify rooms, blur zones, or alignment areas needing rework..."
              className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4A9EFF] resize-none"
            />
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setRejectFor(null)} className="px-4 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
              <button
                onClick={() => respondDeliverable(rejectFor, "reject", rejectReason)}
                disabled={delivBusy === rejectFor.id}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-400 disabled:opacity-50"
              >
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function PortalShell({ me, onLogout, client, accentColor = "#126DFA", clients = [], previewId, onPreviewChange, children, summary }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100">
      <header className="border-b border-slate-800 bg-[#0A1628]/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          {client?.portal_branding?.logo_url ? (
            <img src={client.portal_branding.logo_url} alt={client.company || client.name} className="h-8 w-auto rounded" />
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: accentColor }}>
              <Satellite className="w-5 h-5 text-white" strokeWidth={2.3} />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-bold text-sm text-white">G-Force SI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#4A9EFF]">Enterprise Client Portal</div>
          </div>

          {clients.length > 0 && (
            <select
              value={previewId || ""}
              onChange={(e) => onPreviewChange?.(e.target.value)}
              className="ml-3 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 max-w-[220px]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Preview: {c.company || c.name} ({c.client_type || "enterprise"})
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto flex items-center gap-4">
            <GuideDownload label="Guide" className="text-xs text-slate-400 hover:text-[#4A9EFF]" />
            <Link to="/forgot-password" className="text-xs text-slate-400 hover:text-[#FF8A3D] flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
            </Link>
            {me?.role === "admin" && (
              <Link to="/ops" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Ops Center
              </Link>
            )}
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6">{children}</main>
      <AiAdvisor page="Client Portal" summary={summary} />
    </div>
  );
}

function KpiBox({ label, value, icon: Icon, highlight = false }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-900"}`}>
      <Icon className={`w-4 h-4 mb-2 ${highlight ? "text-emerald-400" : "text-[#4A9EFF]"}`} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
