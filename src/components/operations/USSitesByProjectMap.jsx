import React, { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  MapPin, FolderKanban, RefreshCw, Radio, Layers, Navigation2,
  ExternalLink, Cpu, Users, Search, CheckCircle2, Clock, ScanLine, Globe2,
} from "lucide-react";

const PROJECT_PALETTE = [
  "#F97316", // G-Force Orange
  "#126DFA", // Electric Cobalt Blue
  "#10B981", // Emerald
  "#A855F7", // Violet
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#EF4444", // Red
  "#6366F1", // Indigo
];

const STATUS_COLORS = {
  complete: "#10B981",
  delivered: "#10B981",
  scanning: "#F97316",
  in_progress: "#F97316",
  processing: "#3B82F6",
  scheduled: "#38BDF8",
  issue: "#EF4444",
};

const STATE_CENTROIDS = {
  AL: [32.8067, -86.7911], AK: [64.2008, -149.4937], AZ: [34.0489, -111.0937], AR: [34.9697, -92.3731],
  CA: [36.7783, -119.4179], CO: [39.5501, -105.7821], CT: [41.6032, -73.0877], DE: [38.9108, -75.5277],
  FL: [27.6648, -81.5158], GA: [32.1656, -82.9001], HI: [20.7967, -156.3319], ID: [44.0682, -114.7420],
  IL: [40.6331, -89.3985], IN: [40.2672, -86.1349], IA: [41.8780, -93.0977], KS: [39.0119, -98.4842],
  KY: [37.8393, -84.2700], LA: [30.9843, -91.9623], ME: [45.2538, -69.4455], MD: [39.0458, -76.6413],
  MA: [42.4072, -71.3824], MI: [44.3148, -85.6024], MN: [46.7296, -94.6859], MS: [32.3547, -89.3985],
  MO: [37.9643, -91.8318], MT: [46.8797, -110.3626], NE: [41.4925, -99.9018], NV: [38.8026, -116.4194],
  NH: [43.1939, -71.5724], NJ: [40.0583, -74.4057], NM: [34.5199, -105.8701], NY: [43.2994, -74.2179],
  NC: [35.7596, -79.0193], ND: [47.5515, -101.0020], OH: [40.4173, -82.9071], OK: [35.4676, -97.5164],
  OR: [43.8041, -120.5542], PA: [41.2033, -77.1945], RI: [41.5801, -71.4774], SC: [33.8361, -81.1637],
  SD: [43.9695, -99.9018], TN: [35.5175, -86.5804], TX: [31.9686, -99.9018], UT: [39.3210, -111.0937],
  VT: [44.5588, -72.5778], VA: [37.4316, -78.6569], WA: [47.7511, -120.7401], WV: [38.5976, -80.4549],
  WI: [43.7844, -88.7879], WY: [43.0760, -107.2903], DC: [38.9072, -77.0369],
};

const TILE_LAYERS = {
  dark: {
    label: "Dark Command",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap",
  },
  street: {
    label: "US Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
  },
};

const REGION_VIEWS = {
  all50: { label: "All 50 States", center: [44.5, -112.0], zoom: 3 },
  conus: { label: "Contiguous US (CONUS)", center: [39.5, -98.35], zoom: 4 },
  ak: { label: "Alaska (AK)", center: [63.5, -151.0], zoom: 5 },
  hi: { label: "Hawaii (HI)", center: [20.8, -156.8], zoom: 7 },
};

function makeSitePin(color, badgeText, pulse = false, selected = false) {
  const size = selected ? 30 : 24;
  return L.divIcon({
    className: "us-site-pin",
    html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
      ${pulse ? `<span style="position:absolute;inset:-5px;border-radius:50%;background:${color};opacity:0.35;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>` : ""}
      <div style="
        position:relative;width:${size}px;height:${size}px;border-radius:50%;
        background:${color};border:${selected ? "3px solid #ffffff" : "2.5px solid #0A1628"};
        box-shadow:0 0 0 3px ${color}45, 0 4px 12px rgba(0,0,0,.6);
        display:flex;align-items:center;justify-content:center;
        font-size:${selected ? 10 : 9}px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;
      ">${badgeText}</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeCrewPin(name) {
  const initial = (name || "T").charAt(0).toUpperCase();
  return L.divIcon({
    className: "us-crew-pin",
    html: `<div style="
      width:20px;height:20px;border-radius:6px;
      background:#0D1C33;border:2px solid #22C55E;
      box-shadow:0 2px 8px rgba(0,0,0,.6);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:800;color:#4ADE80;
    ">${initial}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function resolveCoords(site) {
  const lat = Number(site.latitude);
  const lng = Number(site.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng, approx: false };
  }
  const st = String(site.state || "").trim().toUpperCase();
  if (STATE_CENTROIDS[st]) {
    return { lat: STATE_CENTROIDS[st][0], lng: STATE_CENTROIDS[st][1], approx: true };
  }
  const addrMatch = String(site.address || "").match(/,\s*([A-Z]{2})\b/);
  if (addrMatch && STATE_CENTROIDS[addrMatch[1]]) {
    return { lat: STATE_CENTROIDS[addrMatch[1]][0], lng: STATE_CENTROIDS[addrMatch[1]][1], approx: true };
  }
  return null;
}

function MapViewportController({ viewTarget, fitPoints, fitSignal }) {
  const map = useMap();

  useEffect(() => {
    if (!viewTarget) return;
    map.flyTo(viewTarget.center, viewTarget.zoom, { duration: 0.7 });
  }, [viewTarget, map]);

  useEffect(() => {
    if (!fitSignal || !fitPoints || fitPoints.length === 0) return;
    if (fitPoints.length === 1) {
      map.flyTo(fitPoints[0], 11, { duration: 0.7 });
    } else {
      map.fitBounds(L.latLngBounds(fitPoints).pad(0.18), { animate: true, maxZoom: 12 });
    }
  }, [fitSignal, fitPoints, map]);

  return null;
}

export default function USSitesByProjectMap({ compact = false }) {
  const [sites, setSites] = useState([]);
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [colorMode, setColorMode] = useState("project"); // project | status
  const [tileMode, setTileMode] = useState("dark");
  const [showRoutes, setShowRoutes] = useState(true);
  const [showCrews, setShowCrews] = useState(true);
  const [livePolling, setLivePolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [assigningSiteId, setAssigningSiteId] = useState(null);
  const [bulkAssignTarget, setBulkAssignTarget] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);
  const [fitSignal, setFitSignal] = useState(0);

  const assignSiteToProject = async (siteId, projectId) => {
    setAssigningSiteId(siteId);
    try {
      await base44.entities.Site.update(siteId, { project_id: projectId || null });
      await loadData(true);
    } finally {
      setAssigningSiteId(null);
    }
  };

  const assignUnassignedToProject = async () => {
    if (!bulkAssignTarget) return;
    const unassigned = enrichedSites.filter((s) => s.project_id === "__unassigned__" && !String(s.id).startsWith("job_site_"));
    if (!unassigned.length) return;
    setGeocoding(true);
    try {
      await Promise.all(unassigned.map((s) => base44.entities.Site.update(s.id, { project_id: bulkAssignTarget })));
      await loadData(true);
      setSelectedProjectId(bulkAssignTarget);
      setFitSignal((n) => n + 1);
    } finally {
      setGeocoding(false);
    }
  };

  const runAutoGeocode = async () => {
    setGeocoding(true);
    try {
      await base44.functions.invoke("geocodeMissingSites", {});
      await loadData(true);
      setFitSignal((n) => n + 1);
    } finally {
      setGeocoding(false);
    }
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, p, j, c, con] = await Promise.all([
        base44.entities.Site.list().catch(() => []),
        base44.entities.Project.list().catch(() => []),
        base44.entities.Job.list().catch(() => []),
        base44.entities.Client.list().catch(() => []),
        base44.entities.Contractor.list().catch(() => []),
      ]);
      setSites(Array.isArray(s) ? s.filter((item) => !item.archived) : []);
      setProjects(Array.isArray(p) ? p : []);
      setJobs(Array.isArray(j) ? j : []);
      setClients(Array.isArray(c) ? c : []);
      setContractors(Array.isArray(con) ? con : []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const unsubSite = base44.entities.Site.subscribe(() => loadData(true));
    const unsubProj = base44.entities.Project.subscribe(() => loadData(true));
    const unsubJob = base44.entities.Job.subscribe(() => loadData(true));
    return () => {
      unsubSite?.();
      unsubProj?.();
      unsubJob?.();
    };
  }, [loadData]);

  // Real-time 10-second live refresh when enabled
  useEffect(() => {
    if (!livePolling) return undefined;
    const id = setInterval(() => loadData(true), 10000);
    return () => clearInterval(id);
  }, [livePolling, loadData]);

  // Build Project lookup + distinct color map
  const projectMeta = useMemo(() => {
    const byId = {};
    const list = [];
    projects.forEach((proj, idx) => {
      const color = PROJECT_PALETTE[idx % PROJECT_PALETTE.length];
      const entry = {
        id: proj.id,
        name: proj.name || "Untitled Project",
        client_name: proj.client_name || "",
        status: proj.status || "active",
        color,
      };
      byId[proj.id] = entry;
      list.push(entry);
    });
    // Catch any sites without a project_id
    byId["__unassigned__"] = {
      id: "__unassigned__",
      name: "Unassigned / Standalone Sites",
      client_name: "",
      status: "active",
      color: "#94A3B8",
    };
    return { byId, list };
  }, [projects]);

  const clientById = useMemo(() => {
    const map = {};
    clients.forEach((c) => { map[c.id] = c; });
    return map;
  }, [clients]);

  // Enrich sites with resolved project, coordinates, and live job status
  const enrichedSites = useMemo(() => {
    const jobsBySite = {};
    jobs.forEach((j) => {
      if (j.site_id) {
        if (!jobsBySite[j.site_id]) jobsBySite[j.site_id] = [];
        jobsBySite[j.site_id].push(j);
      }
    });

    const mapped = sites.map((site) => {
      const siteJobs = jobsBySite[site.id] || [];
      const inferredProjectId = site.project_id || siteJobs.find((j) => j.project_id)?.project_id || "__unassigned__";
      const proj = projectMeta.byId[inferredProjectId] || projectMeta.byId["__unassigned__"];
      const coords = resolveCoords(site);
      const liveStatus = site.status || siteJobs[0]?.status || "scheduled";
      const client = clientById[site.client_id];
      const stateCode = String(site.state || "").trim().toUpperCase() || (String(site.address || "").match(/,\s*([A-Z]{2})\b/)?.[1] || "");

      return {
        ...site,
        project_id: inferredProjectId,
        project_name: proj.name,
        project_color: proj.color,
        client_display: site.client_name || client?.company || client?.name || proj.client_name || "Enterprise Client",
        live_status: liveStatus,
        status_color: STATUS_COLORS[liveStatus] || "#38BDF8",
        jobs_count: siteJobs.length,
        coords,
        state_code: stateCode,
      };
    });

    // Also include geocoded Jobs that don't have a matching Site record so nothing is missed on the map
    const existingSiteIds = new Set(mapped.map((s) => s.id));
    jobs.forEach((job) => {
      if (job.site_id && existingSiteIds.has(job.site_id)) return;
      const lat = Number(job.latitude);
      const lng = Number(job.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;
      const pid = job.project_id || "__unassigned__";
      const proj = projectMeta.byId[pid] || projectMeta.byId["__unassigned__"];
      mapped.push({
        id: `job_site_${job.id}`,
        name: job.title || job.site_address || "Job Site",
        branch_code: job.branch_code || "",
        address: job.site_address || "",
        region_zone: job.region_zone || "CONUS",
        project_id: pid,
        project_name: job.project_name || proj.name,
        project_color: proj.color,
        client_display: job.client_name || proj.client_name || "Enterprise Client",
        live_status: job.status || "scheduled",
        status_color: STATUS_COLORS[job.status] || "#38BDF8",
        jobs_count: 1,
        matterport_pme_url: job.matterport_pme_url || "",
        coords: { lat, lng, approx: false },
        state_code: String(job.site_address || "").match(/,\s*([A-Z]{2})\b/)?.[1] || "",
      });
    });

    return mapped;
  }, [sites, jobs, projectMeta, clientById]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedSites.filter((s) => {
      if (selectedProjectId !== "ALL" && s.project_id !== selectedProjectId) return false;
      if (statusFilter !== "ALL" && s.live_status !== statusFilter) return false;
      if (q) {
        const hay = `${s.name} ${s.branch_code || ""} ${s.address || ""} ${s.project_name} ${s.client_display} ${s.state_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSites, selectedProjectId, statusFilter, search]);

  const mappableSites = useMemo(() => filteredSites.filter((s) => Boolean(s.coords)), [filteredSites]);

  // Project summary cards (with counts)
  const projectGroups = useMemo(() => {
    const counts = {};
    enrichedSites.forEach((s) => {
      if (!counts[s.project_id]) {
        counts[s.project_id] = { total: 0, complete: 0, active: 0, states: new Set() };
      }
      counts[s.project_id].total += 1;
      if (["complete", "delivered", "invoiced"].includes(s.live_status)) counts[s.project_id].complete += 1;
      if (["scanning", "in_progress", "processing"].includes(s.live_status)) counts[s.project_id].active += 1;
      if (s.state_code) counts[s.project_id].states.add(s.state_code);
    });

    const groups = projectMeta.list.map((p) => ({
      ...p,
      total: counts[p.id]?.total || 0,
      complete: counts[p.id]?.complete || 0,
      active: counts[p.id]?.active || 0,
      statesCount: counts[p.id]?.states.size || 0,
    }));

    if (counts["__unassigned__"]?.total > 0) {
      groups.push({
        ...projectMeta.byId["__unassigned__"],
        total: counts["__unassigned__"].total,
        complete: counts["__unassigned__"].complete,
        active: counts["__unassigned__"].active,
        statesCount: counts["__unassigned__"].states.size,
      });
    }
    return groups;
  }, [enrichedSites, projectMeta]);

  // Polylines grouping sites by project
  const projectPolylines = useMemo(() => {
    if (!showRoutes) return [];
    const byProj = {};
    mappableSites.forEach((s) => {
      if (!byProj[s.project_id]) byProj[s.project_id] = { color: s.project_color, pts: [] };
      byProj[s.project_id].pts.push([s.coords.lat, s.coords.lng]);
    });
    return Object.entries(byProj)
      .filter(([, g]) => g.pts.length >= 2)
      .map(([id, g]) => ({ id, color: g.color, pts: g.pts }));
  }, [mappableSites, showRoutes]);

  const activeCrews = useMemo(
    () => contractors.filter((c) => Number.isFinite(Number(c.current_latitude)) && Number.isFinite(Number(c.current_longitude))),
    [contractors]
  );

  const statesCovered = useMemo(() => {
    const set = new Set();
    mappableSites.forEach((s) => { if (s.state_code) set.add(s.state_code); });
    return set.size;
  }, [mappableSites]);

  const fitPoints = useMemo(() => mappableSites.map((s) => [s.coords.lat, s.coords.lng]), [mappableSites]);

  // Fit bounds once after initial load
  useEffect(() => {
    if (!loading && fitPoints.length > 0 && fitSignal === 0) {
      setFitSignal(1);
    }
  }, [loading, fitPoints.length, fitSignal]);

  const jumpRegion = (key) => {
    setViewTarget({ ...REGION_VIEWS[key], _ts: Date.now() });
  };

  const focusSite = (site) => {
    setSelectedSiteId(site.id);
    if (site.coords) {
      setViewTarget({ center: [site.coords.lat, site.coords.lng], zoom: 11, _ts: Date.now() });
    }
  };

  const mapHeight = compact ? "h-[540px]" : "h-[calc(100vh-235px)] min-h-[540px]";

  return (
    <div className="space-y-4">
      {/* Top KPI & Real-Time Controls Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5 text-[#F97316]" /> Projects Mapped</div>
          <div className="text-xl font-extrabold text-white mt-1">{projectGroups.filter((g) => g.total > 0).length}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#4A9EFF]" /> Sites on US Map</div>
          <div className="text-xl font-extrabold text-[#4A9EFF] mt-1">{mappableSites.length} <span className="text-xs font-normal text-slate-400">/ {filteredSites.length}</span></div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-cyan-400" /> US States Active</div>
          <div className="text-xl font-extrabold text-white mt-1">{statesCovered}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5 text-[#FF8A3D]" /> Scanning / Complete</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {mappableSites.filter((s) => ["scanning", "in_progress", "processing"].includes(s.live_status)).length}
            <span className="text-slate-500 mx-1">/</span>
            {mappableSites.filter((s) => ["complete", "delivered", "invoiced"].includes(s.live_status)).length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${livePolling ? "animate-pulse" : "opacity-40"}`} />
              {livePolling ? "REAL-TIME LIVE" : "PAUSED"}
            </span>
            <button
              type="button"
              onClick={() => setLivePolling((v) => !v)}
              className="text-[#4A9EFF] hover:underline text-[10px]"
            >
              {livePolling ? "Pause" : "Resume"}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">
              {lastUpdated ? `Sync ${lastUpdated.toLocaleTimeString()}` : "Syncing..."}
            </span>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-1 rounded bg-[#0A1628] border border-[#1E3A5F] text-slate-300 hover:text-white"
              title="Refresh now"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Project Filter Sidebar + Real-Time United States Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Sidebar: Filter by Project & Site List */}
        <div className="xl:col-span-4 rounded-2xl bg-[#0D1C33] border border-[#1E3A5F] flex flex-col overflow-hidden max-h-[680px]">
          <div className="p-3.5 border-b border-[#1E3A5F] space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search site, branch, city, state, project..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs text-white focus:outline-none focus:border-[#4A9EFF]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {[
                { key: "ALL", label: "All Status" },
                { key: "scanning", label: "Scanning" },
                { key: "scheduled", label: "Scheduled" },
                { key: "complete", label: "Complete" },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === st.key
                      ? "bg-[#126DFA] text-white"
                      : "bg-[#0A1628] text-slate-400 hover:text-white border border-[#1E3A5F]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Projects Legend / Selector */}
          <div className="p-3 border-b border-[#1E3A5F] space-y-1.5 max-h-56 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A9EFF] px-1">
              Projects ({projectGroups.length})
            </div>
            <button
              type="button"
              onClick={() => { setSelectedProjectId("ALL"); setFitSignal((n) => n + 1); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                selectedProjectId === "ALL"
                  ? "bg-[#126DFA]/20 border border-[#126DFA]/50 text-white font-semibold"
                  : "bg-[#0A1628]/60 border border-transparent text-slate-300 hover:border-[#1E3A5F]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#126DFA]" />
                All Projects (United States)
              </span>
              <span className="text-[11px] font-mono text-[#4A9EFF]">{enrichedSites.length}</span>
            </button>

            {projectGroups.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => { setSelectedProjectId(proj.id); setFitSignal((n) => n + 1); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                  selectedProjectId === proj.id
                    ? "bg-[#F97316]/15 border border-[#F97316]/50 text-white"
                    : "bg-[#0A1628]/60 border border-transparent text-slate-300 hover:border-[#1E3A5F]"
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{proj.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {proj.statesCount} state{proj.statesCount === 1 ? "" : "s"} · {proj.complete} done · {proj.active} active
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#0A1628] border border-[#1E3A5F] text-[11px] font-bold text-white shrink-0">
                  {proj.total}
                </span>
              </button>
            ))}

            {projectGroups.some((p) => p.id === "__unassigned__" && p.total > 0) && projects.length > 0 && (
              <div className="pt-2 mt-1 border-t border-[#1E3A5F] flex items-center gap-1.5">
                <select
                  value={bulkAssignTarget}
                  onChange={(e) => setBulkAssignTarget(e.target.value)}
                  className="flex-1 px-2 py-1 rounded bg-[#0A1628] border border-[#1E3A5F] text-[11px] text-slate-200"
                >
                  <option value="">Assign unassigned to project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkAssignTarget || geocoding}
                  onClick={assignUnassignedToProject}
                  className="px-2.5 py-1 rounded bg-[#F97316] hover:bg-[#FB923C] text-white text-[11px] font-semibold disabled:opacity-40"
                >
                  Assign
                </button>
              </div>
            )}
          </div>

          {/* Filtered Sites List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1E3A5F]/60">
            {filteredSites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => focusSite(site)}
                className={`w-full text-left px-3.5 py-2.5 hover:bg-[#0A1628]/80 transition-colors flex items-start justify-between gap-2 ${
                  selectedSiteId === site.id ? "bg-[#126DFA]/15" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colorMode === "project" ? site.project_color : site.status_color }}
                    />
                    <span className="text-xs font-semibold text-white truncate">{site.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{site.address || "Address pending"}</div>
                  <div className="text-[10px] text-[#4A9EFF] truncate mt-0.5">{site.project_name}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0A1628] border border-[#1E3A5F] text-slate-300 font-semibold uppercase">
                    {site.region_zone || site.state_code || "US"}
                  </span>
                  <div className="text-[10px] text-slate-400 capitalize mt-1">{String(site.live_status || "").replace("_", " ")}</div>
                </div>
              </button>
            ))}
            {filteredSites.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No sites match your current project or search filter.
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-Time Interactive United States Map */}
        <div className="xl:col-span-8 rounded-2xl bg-[#0D1C33] border border-[#1E3A5F] overflow-hidden flex flex-col">
          {/* Map Toolbar */}
          <div className="px-3.5 py-2.5 border-b border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(REGION_VIEWS).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => jumpRegion(key)}
                  className="px-2.5 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-slate-200 hover:border-[#F97316] hover:text-white font-medium"
                >
                  {cfg.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFitSignal((n) => n + 1)}
                className="px-2.5 py-1 rounded-md bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] hover:bg-[#F97316]/25 font-semibold"
              >
                Fit Filtered Sites
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {filteredSites.length > mappableSites.length && (
                <button
                  type="button"
                  onClick={runAutoGeocode}
                  disabled={geocoding}
                  className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold"
                >
                  {geocoding ? "Geocoding..." : `Auto-Geocode (${filteredSites.length - mappableSites.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setColorMode((m) => (m === "project" ? "status" : "project"))}
                className="px-2.5 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-slate-200 hover:border-[#4A9EFF] flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5 text-[#4A9EFF]" />
                Color: {colorMode === "project" ? "By Project" : "By Status"}
              </button>
              <button
                type="button"
                onClick={() => setShowRoutes((v) => !v)}
                className={`px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                  showRoutes ? "bg-[#126DFA]/20 border-[#126DFA]/50 text-[#4A9EFF]" : "bg-[#0A1628] border-[#1E3A5F] text-slate-400"
                }`}
              >
                <Radio className="w-3.5 h-3.5" /> Project Links
              </button>
              <button
                type="button"
                onClick={() => setShowCrews((v) => !v)}
                className={`px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                  showCrews ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-[#0A1628] border-[#1E3A5F] text-slate-400"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Crews ({activeCrews.length})
              </button>
              <select
                value={tileMode}
                onChange={(e) => setTileMode(e.target.value)}
                className="px-2 py-1 rounded-md bg-[#0A1628] border border-[#1E3A5F] text-slate-200 text-xs"
              >
                {Object.entries(TILE_LAYERS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          <div className={`relative w-full ${mapHeight}`}>
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A1628]">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-[#F97316] rounded-full animate-spin" />
              </div>
            ) : (
              <MapContainer
                center={[39.5, -98.35]}
                zoom={4}
                className="w-full h-full z-0"
                style={{ background: "#0A1628" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  key={tileMode}
                  url={TILE_LAYERS[tileMode].url}
                  attribution={TILE_LAYERS[tileMode].attribution}
                  maxZoom={18}
                />
                <MapViewportController viewTarget={viewTarget} fitPoints={fitPoints} fitSignal={fitSignal} />

                {/* Optional dashed lines grouping sites belonging to the same project */}
                {projectPolylines.map((line) => (
                  <Polyline
                    key={line.id}
                    positions={line.pts}
                    pathOptions={{ color: line.color, weight: 2, opacity: 0.45, dashArray: "6 6" }}
                  />
                ))}

                {/* Site Markers color-coded by Project (or Status) */}
                {mappableSites.map((site) => {
                  const pinColor = colorMode === "project" ? site.project_color : site.status_color;
                  const badge = (site.state_code || site.branch_code?.slice(0, 2) || "US").toUpperCase();
                  const isPulsing = ["scanning", "in_progress", "processing"].includes(site.live_status);
                  return (
                    <Marker
                      key={site.id}
                      position={[site.coords.lat, site.coords.lng]}
                      icon={makeSitePin(pinColor, badge, isPulsing, selectedSiteId === site.id)}
                      eventHandlers={{ click: () => setSelectedSiteId(site.id) }}
                    >
                      <Popup>
                        <div className="text-xs min-w-[230px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                              style={{ backgroundColor: site.project_color }}
                            >
                              {site.project_name}
                            </span>
                            <span className="text-[10px] font-semibold uppercase text-slate-500">
                              {site.region_zone || site.state_code || "US"}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{site.name}</div>
                          {site.branch_code && <div className="text-[11px] font-mono text-slate-600">Branch: {site.branch_code}</div>}
                          <div className="text-slate-600">{site.address || "No street address entered"}</div>
                          {site.coords.approx && (
                            <div className="text-[10px] text-amber-600 font-medium">Approximate state center (add exact lat/lng in Sites)</div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                            <span className="font-semibold text-slate-700">{site.client_display}</span>
                            <span className="capitalize font-semibold" style={{ color: site.status_color }}>
                              {String(site.live_status || "scheduled").replace("_", " ")}
                            </span>
                          </div>
                          {site.square_footage && (
                            <div className="text-[11px] text-slate-500">
                              Area: {Number(site.square_footage).toLocaleString()} sq ft · Jobs: {site.jobs_count}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {site.matterport_pme_url && (
                              <a
                                href={site.matterport_pme_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#ffffff" }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#F97316] !text-white font-semibold text-[11px] no-underline"
                              >
                                <ExternalLink className="w-3 h-3" /> 3D Twin
                              </a>
                            )}
                            <Link
                              to="/ai-inventory"
                              style={{ color: "#ffffff" }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#126DFA] !text-white font-semibold text-[11px] no-underline"
                            >
                              <Cpu className="w-3 h-3" /> AI Studio
                            </Link>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${site.coords.lat},${site.coords.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#ffffff" }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 !text-white font-semibold text-[11px] no-underline"
                            >
                              <Navigation2 className="w-3 h-3" /> Directions
                            </a>
                          </div>
                          {!String(site.id).startsWith("job_site_") && projects.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200">
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Assign Project:</label>
                              <select
                                value={site.project_id === "__unassigned__" ? "" : site.project_id}
                                disabled={assigningSiteId === site.id}
                                onChange={(e) => assignSiteToProject(site.id, e.target.value)}
                                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-slate-800 text-[11px]"
                              >
                                <option value="">Unassigned</option>
                                {projects.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Live Field Crews overlay */}
                {showCrews && activeCrews.map((crew) => (
                  <Marker
                    key={`crew_${crew.id}`}
                    position={[Number(crew.current_latitude), Number(crew.current_longitude)]}
                    icon={makeCrewPin(crew.name)}
                  >
                    <Popup>
                      <div className="text-xs min-w-[180px] space-y-1">
                        <div className="font-bold text-slate-900">{crew.name}</div>
                        <div className="text-slate-600">{crew.role} · {crew.city}, {crew.state}</div>
                        <div className="text-emerald-600 font-semibold capitalize">
                          Status: {String(crew.current_status || "available").replace("_", " ")}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* Floating Bottom Legend */}
            <div className="absolute bottom-3 left-3 z-[400] px-3 py-2 rounded-xl bg-[#0A1628]/90 backdrop-blur border border-[#1E3A5F] text-[11px] flex flex-wrap items-center gap-3 text-slate-200 pointer-events-auto">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Complete
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-[#F97316]" /> Scanning (Pulsing)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Scheduled
              </span>
              {showCrews && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#0D1C33] border border-emerald-400 inline-block" /> Live Crew
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
