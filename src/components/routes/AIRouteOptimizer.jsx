import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { Loader2, Sparkles, TrendingUp, MapPin, DollarSign, CheckCircle2, AlertCircle, Plane } from "lucide-react";
import { base44 } from "@/api/base44Client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CREW_COLORS = ["#126DFA", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const createPin = (color, label = "") =>
  L.divIcon({
    className: "ai-route-pin",
    html: `<div style="background:${color};width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

export default function AIRouteOptimizer({
  projectId,
  startDate,
  endDate,
  regionZone = "ALL",
  personnel = [],
  sites = [],
  onApplySchedule,
  onCreateTripBundle,
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleCrew = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setError("");
    try {
      const response = await base44.functions.invoke("optimizeRouteWithAI", {
        projectId: projectId || undefined,
        startDate,
        endDate,
        regionZone,
        contractorIds: selectedIds.length > 0 ? selectedIds : personnel.map((p) => p.id),
      });
      if (response.data?.error) throw new Error(response.data.error);
      setOptimization(response.data?.optimization || null);
    } catch (err) {
      setError(err.message || "AI route optimization failed");
    } finally {
      setOptimizing(false);
    }
  };

  const geocodedSites = sites.filter((s) => s.latitude != null && s.longitude != null);
  const mapCenter = geocodedSites.length
    ? [
        geocodedSites.reduce((s, x) => s + x.latitude, 0) / geocodedSites.length,
        geocodedSites.reduce((s, x) => s + x.longitude, 0) / geocodedSites.length,
      ]
    : [39.8283, -98.5795];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#126DFA]/40 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4A9EFF]" />
              AI 50-State Dispatch & Route Optimizer
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Balances CONUS drive clusters and flags Alaska / Hawaii multi-branch flight bundles using live SLA & site windows.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {startDate} → {endDate}
          </span>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-2">Included Field Technicians (leave unselected for all active):</div>
          <div className="flex flex-wrap gap-2">
            {personnel.map((p, idx) => {
              const active = selectedIds.length === 0 || selectedIds.includes(p.id);
              const color = CREW_COLORS[idx % CREW_COLORS.length];
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleCrew(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    active ? "text-white border-transparent" : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                  style={active ? { backgroundColor: color } : undefined}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={handleOptimize}
          disabled={optimizing}
          className="w-full py-2.5 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {optimizing ? "Analyzing branches, SLAs & AK/HI flight bundles..." : "Generate AI-Optimized Schedule"}
        </button>
      </div>

      {optimization && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={CheckCircle2} label="Sites Scheduled" value={optimization.summary?.total_sites_scheduled ?? 0} accent="text-emerald-400" />
            <KpiCard icon={MapPin} label="Total Travel" value={`${Number(optimization.summary?.total_travel_km || 0).toFixed(1)} km`} accent="text-[#4A9EFF]" />
            <KpiCard icon={TrendingUp} label="Efficiency Score" value={`${optimization.summary?.efficiency_score ?? 0}/100`} accent="text-cyan-400" />
            <KpiCard icon={DollarSign} label="Est. Savings" value={optimization.summary?.estimated_cost_savings || "$0"} accent="text-amber-400" />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold text-slate-100">AI Optimized Route Map</span>
              {onApplySchedule && (
                <button
                  onClick={() => onApplySchedule(optimization.optimized_schedule)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Apply AI Schedule
                </button>
              )}
            </div>
            <div className="h-[400px]">
              <MapContainer center={mapCenter} zoom={geocodedSites.length ? 6 : 4} style={{ height: "100%", width: "100%" }}>
                <TileLayer className="osm-dark-tiles" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {(optimization.optimized_schedule || []).map((day, idx) => {
                  const crewIdx = personnel.findIndex((p) => p.id === day.contractor_id);
                  const color = CREW_COLORS[(crewIdx >= 0 ? crewIdx : idx) % CREW_COLORS.length];
                  const coords = [];
                  const crew = personnel.find((p) => p.id === day.contractor_id);
                  if (crew?.base_latitude != null && crew?.base_longitude != null) {
                    coords.push([crew.base_latitude, crew.base_longitude]);
                  }
                  (day.assignments || []).forEach((a) => {
                    const site = sites.find((s) => s.id === a.site_id);
                    if (site?.latitude != null && site?.longitude != null) {
                      coords.push([site.latitude, site.longitude]);
                    }
                  });
                  return coords.length >= 2 ? <Polyline key={idx} positions={coords} color={color} weight={3} opacity={0.85} /> : null;
                })}
                {geocodedSites.map((site) => (
                  <Marker key={site.id} position={[site.latitude, site.longitude]} icon={createPin("#126DFA")}>
                    <Popup>
                      <div className="text-xs text-slate-900">
                        <div className="font-bold">{site.name}</div>
                        <div>{site.address}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="space-y-3">
            {(optimization.optimized_schedule || []).map((day, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      {day.contractor_name}
                      {day.requires_flight_bundle && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Plane className="w-3 h-3" /> {day.region_zone || "AK/HI"} Flight Bundle
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{day.date}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="text-slate-200 font-medium">{Number(day.total_hours || 0).toFixed(1)} hrs</div>
                      <div className="text-slate-500">{Number(day.total_travel_km || 0).toFixed(1)} km travel</div>
                    </div>
                    {day.requires_flight_bundle && onCreateTripBundle && (
                      <button
                        onClick={() => onCreateTripBundle(day)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/25 flex items-center gap-1"
                      >
                        <Plane className="w-3.5 h-3.5" /> Bundle Flight
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(day.assignments || []).map((a, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-3 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-[#126DFA] text-white font-bold flex items-center justify-center shrink-0">
                        {a.sequence}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-200 truncate">{a.site_name}</div>
                        <div className="text-slate-500">{a.estimated_start_time} – {a.estimated_end_time}</div>
                      </div>
                      {a.travel_from_previous_km > 0 && (
                        <div className="text-right text-slate-400 shrink-0">
                          {Number(a.travel_from_previous_km).toFixed(1)} km · {a.travel_time_minutes}m
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {optimization.recommendations?.length > 0 && (
            <div className="rounded-xl border border-[#126DFA]/30 bg-[#0A1628] p-4 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-[#4A9EFF] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Dispatch Recommendations
              </div>
              <ul className="list-disc list-inside space-y-1">
                {optimization.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className={`text-xs flex items-center gap-1.5 mb-1 ${accent}`}>
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}
