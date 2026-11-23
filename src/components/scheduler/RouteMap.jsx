import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getHomeCoords } from "./SchedulerUtils";

const COLORS = ["#126DFA", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#ef4444"];

const createDotIcon = (label, color) =>
  L.divIcon({
    className: "gforcesi-route-marker",
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45);color:#fff;font-weight:700;font-size:11px;">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export default function SchedulerRouteMap({ assignments = [], sites = [], personnel = [], selectedDate }) {
  const mapData = useMemo(() => {
    const filtered = selectedDate
      ? assignments.filter((a) => a.assigned_date === selectedDate)
      : assignments;

    const byCrew = {};
    filtered.forEach((a) => {
      const cid = a.contractor_id || a.personnel_id;
      if (!byCrew[cid]) byCrew[cid] = [];
      byCrew[cid].push(a);
    });

    const routes = [];
    const markers = [];
    let latSum = 0;
    let lngSum = 0;
    let ptCount = 0;

    Object.entries(byCrew).forEach(([cid, crewStops], idx) => {
      const person = personnel.find((p) => p.id === cid);
      const color = COLORS[idx % COLORS.length];
      const path = [];
      const home = getHomeCoords(person);

      if (home.lat != null && home.lng != null) {
        path.push([home.lat, home.lng]);
        markers.push({ pos: [home.lat, home.lng], label: "H", title: `${person?.name || "Crew"} Base`, color, isHome: true });
        latSum += home.lat;
        lngSum += home.lng;
        ptCount++;
      }

      crewStops.forEach((a, stopIdx) => {
        const site = sites.find((s) => s.id === a.site_id);
        if (!site || site.latitude == null || site.longitude == null) return;
        path.push([site.latitude, site.longitude]);
        markers.push({
          pos: [site.latitude, site.longitude],
          label: String(stopIdx + 1),
          title: site.name || site.title,
          subtitle: site.address || site.site_address,
          region: site.region_zone || "CONUS",
          time: `${a.start_time} – ${a.end_time}`,
          color,
        });
        latSum += site.latitude;
        lngSum += site.longitude;
        ptCount++;
      });

      if (path.length >= 2) {
        routes.push({
          path,
          color,
          name: person?.name || "Field Crew",
          km: crewStops.reduce((s, a) => s + (a.travel_distance_km || 0), 0),
        });
      }
    });

    const center = ptCount > 0 ? [latSum / ptCount, lngSum / ptCount] : [39.8283, -98.5795];
    return { center, routes, markers };
  }, [assignments, sites, personnel, selectedDate]);

  return (
    <div className="relative rounded-xl border border-slate-800 overflow-hidden h-[420px] bg-[#0A1628]">
      <MapContainer center={mapData.center} zoom={mapData.markers.length > 0 ? 8 : 4} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          className="osm-dark-tiles"
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapData.routes.map((r, i) => (
          <Polyline key={i} positions={r.path} color={r.color} weight={3} opacity={0.85} dashArray="8, 8" />
        ))}
        {mapData.markers.map((m, i) => (
          <Marker key={i} position={m.pos} icon={createDotIcon(m.label, m.color)}>
            <Popup>
              <div className="text-xs text-slate-900 space-y-0.5">
                <div className="font-bold">{m.title}</div>
                {m.subtitle && <div>{m.subtitle}</div>}
                {m.time && <div className="font-medium text-blue-700">{m.time}</div>}
                {m.region && <div>Zone: {m.region}</div>}
              </div>
            </Popup>
            {!m.isHome && <Circle center={m.pos} radius={120} fillColor={m.color} fillOpacity={0.18} stroke={false} />}
          </Marker>
        ))}
      </MapContainer>
      {mapData.routes.length > 0 && (
        <div className="absolute bottom-3 right-3 z-[400] rounded-lg border border-slate-700 bg-[#0A1628]/95 px-3 py-2 text-[11px] text-slate-200 space-y-1 shadow-xl">
          <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Crew Routes</div>
          {mapData.routes.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              <span>{r.name}</span>
              <span className="text-slate-400 ml-auto">{r.km.toFixed(1)} km</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
