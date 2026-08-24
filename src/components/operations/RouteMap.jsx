import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const startIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #0f172a;box-shadow:0 0 0 2px #3b82f6"></div>',
  className: "", iconSize: [16, 16], iconAnchor: [8, 8],
});

const stopIcon = (n) => L.divIcon({
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#06b6d4;color:#0f172a;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #0f172a">${n}</div>`,
  className: "", iconSize: [24, 24], iconAnchor: [12, 12],
});

export default function RouteMap({ contractor, stops }) {
  const stopPoints = stops
    .map((s, i) => ({ job: s, point: [s.latitude, s.longitude], idx: i }))
    .filter((x) => x.point[0] != null && x.point[1] != null);

  const start = contractor && contractor.current_latitude != null
    ? [contractor.current_latitude, contractor.current_longitude]
    : null;

  const line = [...(start ? [start] : []), ...stopPoints.map((x) => x.point)];
  if (line.length === 0) {
    return <div className="h-full min-h-[300px] flex items-center justify-center text-slate-500 text-sm">No coordinates available for this route.</div>;
  }

  return (
    <MapContainer center={line[0]} zoom={11} className="h-full w-full min-h-[300px]" style={{ background: "#0f172a" }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />
      {start && (
        <Marker position={start} icon={startIcon}>
          <Popup>Start — {contractor.name}</Popup>
        </Marker>
      )}
      {stopPoints.map((x) => (
        <Marker key={x.job.id} position={x.point} icon={stopIcon(x.idx + 1)}>
          <Popup>
            <div className="text-xs">
              <div className="font-medium">{x.job.title}</div>
              <div className="text-slate-500">{x.job.site_address}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      {line.length > 1 && (
        <Polyline positions={line} pathOptions={{ color: "#06b6d4", weight: 3, opacity: 0.85, dashArray: "6 6" }} />
      )}
    </MapContainer>
  );
}