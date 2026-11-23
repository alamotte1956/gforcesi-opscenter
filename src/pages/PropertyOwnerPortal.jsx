import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  MapPin, Box, FileText, Search, ExternalLink, Navigation2,
  Download, Send, CheckCircle2, Clock, ScanLine, KeyRound, LogOut,
  ShieldCheck, Sparkles, ArrowUpRight, Layers, RefreshCw,
} from "lucide-react";
import { GForceLogo } from "@/components/brand/GForceGraphics";

const STATUS_META = {
  complete: { label: "3D Twin Ready", color: "#10B981", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35" },
  delivered: { label: "3D Twin Ready", color: "#10B981", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35" },
  invoiced: { label: "3D Twin Ready", color: "#10B981", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35" },
  scanning: { label: "Scanning Now", color: "#F97316", pill: "bg-[#F97316]/15 text-[#FF8A3D] border-[#F97316]/40" },
  processing: { label: "Processing 3D", color: "#3B82F6", pill: "bg-blue-500/15 text-blue-300 border-blue-500/35" },
  scheduled: { label: "Scheduled", color: "#38BDF8", pill: "bg-sky-500/15 text-sky-300 border-sky-500/35" },
};

function makePropertyPin(color, selected = false) {
  const size = selected ? 28 : 20;
  return L.divIcon({
    className: "owner-prop-pin",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:${selected ? "3px solid #ffffff" : "2.5px solid #0A1628"};
      box-shadow:0 0 0 4px ${color}40, 0 3px 10px rgba(0,0,0,.55);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitPropertyBounds({ points, focusPoint }) {
  const map = useMap();

  useEffect(() => {
    if (focusPoint) {
      map.flyTo(focusPoint, 12, { duration: 0.65 });
    }
  }, [focusPoint, map]);

  useEffect(() => {
    if (focusPoint || !points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      map.fitBounds(L.latLngBounds(points).pad(0.18), { animate: true, maxZoom: 11 });
    }
  }, [points, focusPoint, map]);

  return null;
}

export default function PropertyOwnerPortal() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [sites, setSites] = useState([]);
  const [projects, setProjects] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("properties"); // properties | walkthrough | inventory | reports
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);
  const [mapStyle, setMapStyle] = useState("street"); // street | dark | satellite

  // Simple support / rescan request form
  const [reqSiteId, setReqSiteId] = useState("");
  const [reqType, setReqType] = useState("Update / Rescan Property");
  const [reqNotes, setReqNotes] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [reqSent, setReqSent] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [user, s, p, d, a] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Site.list().catch(() => []),
        base44.entities.Project.list().catch(() => []),
        base44.entities.Deliverable.list().catch(() => []),
        base44.entities.AssetAssessment.list().catch(() => []),
      ]);
      setMe(user);
      const activeSites = Array.isArray(s) ? s.filter((x) => !x.archived) : [];
      setSites(activeSites);
      setProjects(Array.isArray(p) ? p : []);
      setDeliverables(Array.isArray(d) ? d : []);
      setAssets(Array.isArray(a) ? a : []);
      if (activeSites.length > 0 && !selectedSiteId) {
        const withTwin = activeSites.find((x) => x.matterport_pme_url) || activeSites[0];
        setSelectedSiteId(withTwin.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const projectById = useMemo(() => {
    const m = {};
    projects.forEach((p) => { m[p.id] = p; });
    return m;
  }, [projects]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (projectFilter !== "ALL") {
        if (projectFilter === "__unassigned__") {
          if (s.project_id) return false;
        } else if (s.project_id !== projectFilter) {
          return false;
        }
      }
      if (q) {
        const hay = `${s.name || ""} ${s.address || ""} ${s.city || ""} ${s.state || ""} ${s.branch_code || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sites, projectFilter, search]);

  const mappableSites = useMemo(
    () =>
      filteredSites.filter(
        (s) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)) && (Number(s.latitude) !== 0 || Number(s.longitude) !== 0)
      ),
    [filteredSites]
  );

  const mapPoints = useMemo(
    () => mappableSites.map((s) => [Number(s.latitude), Number(s.longitude)]),
    [mappableSites]
  );

  const selectedSite = useMemo(
    () => filteredSites.find((s) => s.id === selectedSiteId) || sites.find((s) => s.id === selectedSiteId) || filteredSites[0] || null,
    [filteredSites, sites, selectedSiteId]
  );

  const readyCount = useMemo(
    () => filteredSites.filter((s) => ["complete", "delivered", "invoiced"].includes(s.status) || Boolean(s.matterport_pme_url)).length,
    [filteredSites]
  );

  const handleSelectProperty = (site, open3D = false) => {
    setSelectedSiteId(site.id);
    if (Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude))) {
      setFocusCoords([Number(site.latitude), Number(site.longitude)]);
    }
    if (open3D) setTab("walkthrough");
  };

  const exportInventoryCsv = () => {
    const rows = [
      ["Property", "Address", "City", "State", "Status", "Sq Ft", "3D Twin Link"],
      ...filteredSites.map((s) => [
        s.name || "",
        s.address || "",
        s.city || "",
        s.state || "",
        s.status || "scheduled",
        s.square_footage || "",
        s.matterport_pme_url || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-properties-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!reqNotes.trim()) return;
    setReqBusy(true);
    try {
      const target = sites.find((s) => s.id === reqSiteId);
      await base44.entities.Message.create({
        sender_id: me?.id || "owner",
        sender_name: me?.full_name || me?.email || "Property Owner",
        recipient_id: "ops_team",
        recipient_name: "G-Force SI Support",
        body: `[${reqType}] ${target ? `${target.name} (${target.address})` : "Portfolio Request"} — ${reqNotes.trim()}`,
        channel: "portal",
        read: false,
      });
      setReqSent(true);
      setReqNotes("");
      setTimeout(() => setReqSent(false), 5000);
    } finally {
      setReqBusy(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate("/login");
  };

  const tileUrl =
    mapStyle === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : mapStyle === "dark"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="w-9 h-9 border-4 border-slate-800 border-t-[#F97316] border-r-[#126DFA] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100 flex flex-col">
      {/* Ultra-Clean Top Header — Zero Clutter */}
      <header className="sticky top-0 z-30 border-b border-[#1E3A5F] bg-[#0D1C33]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GForceLogo size={32} subtitle="Property Portal" />
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" /> Private Portfolio
            </span>
          </div>

          {/* 4 Simple Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0A1628] p-1 rounded-xl border border-[#1E3A5F]">
            {[
              { id: "properties", label: "My Properties", icon: MapPin },
              { id: "walkthrough", label: "3D Walkthrough", icon: ScanLine },
              { id: "inventory", label: "Inventory", icon: Box },
              { id: "reports", label: "Reports & Help", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    tab === item.id
                      ? "bg-[#F97316] text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-[#1E3A5F]/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-xs">
            {me?.role === "admin" && (
              <a
                href="https://gforcesi.twinscanstudio.com/executive"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#126DFA]/15 border border-[#126DFA]/40 text-[#4A9EFF] hover:bg-[#126DFA]/25 font-semibold"
              >
                Full Ops <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
            <Link to="/forgot-password" className="text-slate-400 hover:text-[#FF8A3D] flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset Password</span>
            </Link>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-300 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile 4-Tab Bar */}
        <div className="md:hidden grid grid-cols-4 border-t border-[#1E3A5F] bg-[#0A1628] text-[11px]">
          {[
            { id: "properties", label: "Properties", icon: MapPin },
            { id: "walkthrough", label: "3D Tour", icon: ScanLine },
            { id: "inventory", label: "Inventory", icon: Box },
            { id: "reports", label: "Reports", icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`py-2.5 flex flex-col items-center gap-1 font-semibold ${
                  tab === item.id ? "text-[#FF8A3D] border-b-2 border-[#F97316]" : "text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Compact Welcome + Portfolio Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl p-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              Welcome{me?.full_name ? `, ${me.full_name.split(" ")[0]}` : ""} — Your Properties at a Glance
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredSites.length} properties · {readyCount} with 3D Digital Twins ready · Click any location to explore
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => { setProjectFilter(e.target.value); setFocusCoords(null); }}
                className="px-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white"
              >
                <option value="ALL">All Portfolios ({sites.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {sites.some((s) => !s.project_id) && (
                  <option value="__unassigned__">Other Properties ({sites.filter((s) => !s.project_id).length})</option>
                )}
              </select>
            )}
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-slate-300 hover:text-white"
              title="Refresh properties"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: MY PROPERTIES + INTERACTIVE MAP */}
        {tab === "properties" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Simple Property List */}
            <div className="lg:col-span-5 bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl flex flex-col overflow-hidden max-h-[620px]">
              <div className="p-3.5 border-b border-[#1E3A5F]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a property by name, city, or address..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white focus:outline-none focus:border-[#4A9EFF]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#1E3A5F]/60">
                {filteredSites.map((site) => {
                  const meta = STATUS_META[site.status] || (site.matterport_pme_url ? STATUS_META.complete : STATUS_META.scheduled);
                  const isSel = selectedSite?.id === site.id;
                  return (
                    <div
                      key={site.id}
                      onClick={() => handleSelectProperty(site, false)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSel ? "bg-[#126DFA]/15 border-l-4 border-l-[#F97316]" : "hover:bg-[#0A1628]/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-white truncate">{site.name}</div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {[site.address, site.city, site.state].filter(Boolean).join(", ")}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${meta.pill}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400">
                          {site.square_footage ? `${Number(site.square_footage).toLocaleString()} sq ft` : site.state || "US Property"}
                        </span>
                        <div className="flex items-center gap-2">
                          {site.matterport_pme_url && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSelectProperty(site, true); }}
                              className="px-2.5 py-1 rounded-md bg-[#F97316] hover:bg-[#FB923C] text-white font-semibold"
                            >
                              Open 3D Tour
                            </button>
                          )}
                          {Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude)) && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-[#4A9EFF] hover:text-white inline-flex items-center gap-1"
                            >
                              <Navigation2 className="w-3 h-3" /> Map
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredSites.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No properties found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Clean Property Map */}
            <div className="lg:col-span-7 bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-[#1E3A5F] flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#F97316]" /> Property Locations ({mappableSites.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFocusCoords(null)}
                    className="px-2.5 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-slate-200 hover:border-[#F97316]"
                  >
                    Show All
                  </button>
                  <select
                    value={mapStyle}
                    onChange={(e) => setMapStyle(e.target.value)}
                    className="px-2 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-slate-200 text-xs"
                  >
                    <option value="street">Street Map</option>
                    <option value="satellite">Satellite</option>
                    <option value="dark">Dark Map</option>
                  </select>
                </div>
              </div>
              <div className="h-[560px] w-full relative">
                <MapContainer
                  center={[38.7, -120.8]}
                  zoom={7}
                  className="w-full h-full z-0"
                  style={{ background: "#0A1628" }}
                >
                  <TileLayer key={mapStyle} url={tileUrl} maxZoom={18} />
                  <FitPropertyBounds points={mapPoints} focusPoint={focusCoords} />
                  {mappableSites.map((site) => {
                    const meta = STATUS_META[site.status] || (site.matterport_pme_url ? STATUS_META.complete : STATUS_META.scheduled);
                    return (
                      <Marker
                        key={site.id}
                        position={[Number(site.latitude), Number(site.longitude)]}
                        icon={makePropertyPin(meta.color, selectedSite?.id === site.id)}
                        eventHandlers={{ click: () => setSelectedSiteId(site.id) }}
                      >
                        <Popup>
                          <div className="text-xs min-w-[200px] space-y-1.5">
                            <div className="font-bold text-slate-900 text-sm">{site.name}</div>
                            <div className="text-slate-600">{[site.address, site.city, site.state].filter(Boolean).join(", ")}</div>
                            <div className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</div>
                            <div className="flex gap-1.5 pt-1">
                              {site.matterport_pme_url && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectProperty(site, true)}
                                  className="px-2.5 py-1 rounded bg-[#F97316] text-white font-semibold text-[11px]"
                                >
                                  Open 3D Tour
                                </button>
                              )}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#ffffff" }}
                                className="px-2.5 py-1 rounded bg-slate-800 !text-white font-semibold text-[11px] no-underline"
                              >
                                Directions
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 3D DIGITAL TWIN WALKTHROUGH */}
        {tab === "walkthrough" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3 bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl p-3 space-y-1.5 max-h-[600px] overflow-y-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#4A9EFF] px-2 py-1">
                Select Property
              </div>
              {filteredSites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    selectedSite?.id === site.id
                      ? "bg-[#F97316]/20 border border-[#F97316]/50 text-white"
                      : "bg-[#0A1628]/60 border border-transparent text-slate-300 hover:border-[#1E3A5F]"
                  }`}
                >
                  <div className="font-semibold truncate">{site.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{site.city || site.address}</div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-9 bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl overflow-hidden">
              {selectedSite ? (
                <>
                  <div className="px-4 py-3 border-b border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm">{selectedSite.name}</div>
                      <div className="text-xs text-slate-400">
                        {[selectedSite.address, selectedSite.city, selectedSite.state].filter(Boolean).join(", ")}
                        {selectedSite.project_id && projectById[selectedSite.project_id] ? ` · ${projectById[selectedSite.project_id].name}` : ""}
                      </div>
                    </div>
                    {selectedSite.matterport_pme_url && (
                      <a
                        href={selectedSite.matterport_pme_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        Full Screen <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {selectedSite.matterport_pme_url ? (
                    <iframe
                      title={selectedSite.name}
                      src={selectedSite.matterport_pme_url}
                      className="w-full h-[540px] border-0 bg-black"
                      allowFullScreen
                    />
                  ) : (
                    <div className="h-[460px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <ScanLine className="w-12 h-12 text-[#4A9EFF]/60" />
                      <div className="font-semibold text-white">3D Digital Twin Pending Scan</div>
                      <p className="text-xs text-slate-400 max-w-md">
                        This property is in your portfolio and ready to be scheduled for a Matterport Pro3 3D capture.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setReqSiteId(selectedSite.id); setTab("reports"); }}
                        className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-xs font-semibold"
                      >
                        Request 3D Scan for This Property
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-sm text-slate-400">Select a property to view its 3D tour.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SIMPLE PROPERTY & ASSET INVENTORY */}
        {tab === "inventory" && (
          <div className="bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1E3A5F] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-base">Property &amp; Asset Inventory</h2>
                <p className="text-xs text-slate-400">
                  {filteredSites.length} properties · {assets.length} cataloged building assets
                </p>
              </div>
              <button
                type="button"
                onClick={exportInventoryCsv}
                className="px-3.5 py-2 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Spreadsheet (.CSV)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1628] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3 text-right">3D Twin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3A5F]/60">
                  {filteredSites.map((s) => {
                    const meta = STATUS_META[s.status] || (s.matterport_pme_url ? STATUS_META.complete : STATUS_META.scheduled);
                    return (
                      <tr key={s.id} className="hover:bg-[#0A1628]/50">
                        <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                        <td className="px-4 py-3 text-slate-300">{[s.address, s.city, s.state].filter(Boolean).join(", ")}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.pill}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{s.square_footage ? `${Number(s.square_footage).toLocaleString()} sq ft` : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {s.matterport_pme_url ? (
                            <button
                              type="button"
                              onClick={() => handleSelectProperty(s, true)}
                              className="text-[#FF8A3D] hover:underline font-semibold"
                            >
                              View 3D →
                            </button>
                          ) : (
                            <span className="text-slate-500">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS, DELIVERABLES & SIMPLE REQUEST FORM */}
        {tab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Deliverables / Downloads */}
            <div className="bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#4A9EFF]" /> Floor Plans &amp; 3D Deliverables
                </h2>
                <span className="text-xs text-slate-400">{deliverables.length} files</span>
              </div>
              <div className="space-y-2.5">
                {deliverables.map((d) => (
                  <div key={d.id} className="p-3.5 rounded-xl bg-[#0A1628] border border-[#1E3A5F] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{d.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        {d.status === "delivered" ? (
                          <span className="text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                        ) : (
                          <span className="text-amber-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> In QA Review</span>
                        )}
                        {d.delivered_date && <span>· {d.delivered_date}</span>}
                      </div>
                    </div>
                    {d.matterport_pme_url && (
                      <a
                        href={d.matterport_pme_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-xs font-semibold shrink-0"
                      >
                        Open
                      </a>
                    )}
                  </div>
                ))}
                {deliverables.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-[#0A1628] rounded-xl border border-[#1E3A5F]">
                    Completed floor plans, 3D bundles, and reports will appear here as soon as scans finish.
                  </div>
                )}
              </div>
            </div>

            {/* 1-Click Support / Rescan Request */}
            <form onSubmit={submitRequest} className="bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl p-5 space-y-3.5">
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F97316]" /> Request a Scan or Update
              </h2>
              <p className="text-xs text-slate-400">
                Need a new property scanned, an updated floor plan, or an asset count? Send a quick note directly to your G-Force SI team.
              </p>
              {reqSent && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Request sent! Your G-Force SI coordinator will follow up shortly.
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Property</label>
                <select
                  value={reqSiteId}
                  onChange={(e) => setReqSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white"
                >
                  <option value="">General Portfolio / New Property</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.city || s.address}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Request Type</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white"
                >
                  <option>Update / Rescan Property</option>
                  <option>Schedule New Property Scan</option>
                  <option>Request Floor Plan / CAD Export</option>
                  <option>AI Equipment / Asset Count</option>
                  <option>General Support Question</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Details</label>
                <textarea
                  rows={3}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Tell us what you need and any preferred dates..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={reqBusy}
                className="w-full py-2.5 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> {reqBusy ? "Sending..." : "Send Request to G-Force SI"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
