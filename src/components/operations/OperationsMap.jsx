import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const employeeColors = {
  available: "#22c55e",
  en_route: "#3b82f6",
  on_site: "#f59e0b",
  off_duty: "#64748b",
};

const siteColors = {
  scheduled: "#64748b",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  delayed: "#ef4444",
};

const jobStatusToSite = {
  scheduled: "scheduled",
  en_route: "in_progress",
  on_site: "in_progress",
  scanning: "in_progress",
  processing: "in_progress",
  complete: "completed",
  invoiced: "completed",
};

function makeIcon(color, label, isSite = false) {
  const size = isSite ? 22 : 18;
  return L.divIcon({
    className: "ops-marker",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid #0f172a;
      box-shadow:0 0 0 3px ${color}40, 0 2px 6px rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center;
      font-size:${isSite ? 10 : 9}px;font-weight:700;color:#0f172a;
    ">${label || ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ employees, jobs }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    employees.forEach((e) => {
      if (e.current_latitude && e.current_longitude) pts.push([e.current_latitude, e.current_longitude]);
    });
    jobs.forEach((j) => {
      if (j.latitude && j.longitude) pts.push([j.latitude, j.longitude]);
    });
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts).pad(0.2), { animate: true });
    } else if (pts.length === 1) {
      map.setView(pts[0], 12);
    }
  }, [employees, jobs, map]);
  return null;
}

export default function OperationsMap({ employees = [], jobs = [], selectedEmployeeId, onSelectEmployee, onSelectJob }) {
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.current_latitude && e.current_longitude),
    [employees]
  );
  const geocodedJobs = useMemo(() => jobs.filter((j) => j.latitude && j.longitude), [jobs]);

  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      className="w-full h-full z-0"
      zoomControl={true}
      style={{ background: "#0b1424" }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
        maxZoom={16}
      />
      <FitBounds employees={activeEmployees} jobs={geocodedJobs} />

      {geocodedJobs.map((job, idx) => {
        const siteStatus = jobStatusToSite[job.status] || "scheduled";
        const color = siteColors[siteStatus];
        return (
          <Marker
            key={job.id}
            position={[job.latitude, job.longitude]}
            icon={makeIcon(color, String(idx + 1), true)}
            eventHandlers={{ click: () => onSelectJob?.(job) }}
          >
            <Popup>
              <div className="text-xs min-w-[180px]">
                <div className="font-semibold text-slate-900 text-sm mb-1">{job.title}</div>
                <div className="text-slate-600">{job.site_address}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="capitalize">{siteStatus.replace("_", " ")}</span>
                </div>
                <div className="text-slate-500 mt-1">Priority: {job.priority || "standard"}</div>
                {(job.assigned_contractor_names || job.assigned_employee_names)?.length > 0 && (
                  <div className="text-slate-500 mt-0.5">
                    Team: {(job.assigned_contractor_names || job.assigned_employee_names).join(", ")}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {activeEmployees.map((emp) => {
        const color = employeeColors[emp.current_status] || employeeColors.off_duty;
        const isSelected = emp.id === selectedEmployeeId;
        return (
          <Marker
            key={emp.id}
            position={[emp.current_latitude, emp.current_longitude]}
            icon={makeIcon(color, emp.name?.charAt(0) || "?")}
            eventHandlers={{ click: () => onSelectEmployee?.(emp) }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <div className="text-xs min-w-[180px]">
                <div className="font-semibold text-slate-900 text-sm mb-1">{emp.name}</div>
                <div className="text-slate-600">{emp.role}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="capitalize">{String(emp.current_status || "off_duty").replace(/_/g, " ")}</span>
                </div>
                {emp.current_job_title && (
                  <div className="text-slate-500 mt-1">Current: {emp.current_job_title}</div>
                )}
                {emp.eta_minutes != null && emp.eta_minutes > 0 && (
                  <div className="text-slate-500">ETA: {emp.eta_minutes} min</div>
                )}
                <div className="text-slate-400 mt-1">
                  {emp.location_sharing ? "📍 Sharing location" : "🚫 Location off"}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}