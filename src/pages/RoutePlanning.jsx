import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Route as RouteIcon, Zap, MapPin, Clock, Navigation, Wand2, GripVertical } from "lucide-react";
import RouteMap from "@/components/operations/RouteMap";

const fieldRoles = ["Field Technician", "Field Pilot"];
const AVG_SPEED_MPH = 35;
const SERVICE_MIN = 45;

function haversineMi(a, b) {
  if (!a || !b || a.lat == null || b.lat == null || a.lng == null || b.lng == null) return null;
  const R = 3958.8;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtTime(d) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function computeRoute(contractor, stops, startTime) {
  const start = startTime || (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; })();
  let prev = contractor ? { lat: contractor.current_latitude, lng: contractor.current_longitude } : null;
  let t = new Date(start);
  let totalDrive = 0;
  const out = stops.map((job) => {
    const p = { lat: job.latitude, lng: job.longitude };
    const mi = prev ? haversineMi(prev, p) : null;
    const driveMin = mi != null ? (mi / AVG_SPEED_MPH) * 60 : null;
    if (driveMin != null) totalDrive += driveMin;
    const arrival = new Date(t.getTime() + (driveMin || 0) * 60000);
    const serviceMin = job.estimated_duration_hours ? job.estimated_duration_hours * 60 : SERVICE_MIN;
    t = new Date(arrival.getTime() + serviceMin * 60000);
    prev = p;
    return { job, mi, driveMin, arrival, serviceMin };
  });
  return { stops: out, totalDrive, endTime: t, start };
}

export default function RoutePlanning() {
  const [jobs, setJobs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState({ pool: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [j, c, cls] = await Promise.all([base44.entities.Job.list(), base44.entities.Contractor.list(), base44.entities.Client.list()]);
    setClients(cls);
    const active = j.filter((job) => !["complete", "invoiced"].includes(job.status));
    const field = c.filter((con) => fieldRoles.includes(con.role));
    setJobs(active);
    setContractors(field);
    const a = { pool: [] };
    field.forEach((con) => (a[con.id] = []));
    active.forEach((job) => {
      const ids = job.assigned_contractor_ids || [];
      const assigned = ids.find((id) => field.find((f) => f.id === id));
      if (assigned) a[assigned].push(job.id);
      else a.pool.push(job.id);
    });
    setAssignments(a);
    if (field.length && !selected) setSelected(field[0].id);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const jobById = (id) => jobs.find((j) => j.id === id);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    const srcList = [...(assignments[source.droppableId] || [])];
    const [movedId] = srcList.splice(source.index, 1);
    const destList = [...(assignments[destination.droppableId] || [])];
    destList.splice(destination.index, 0, movedId);
    setAssignments({ ...assignments, [source.droppableId]: srcList, [destination.droppableId]: destList });
    if (destination.droppableId === "pool") {
      base44.entities.Job.update(movedId, { assigned_contractor_ids: [], assigned_contractor_names: [] });
    } else {
      const c = contractors.find((x) => x.id === destination.droppableId);
      if (c) base44.entities.Job.update(movedId, { assigned_contractor_ids: [c.id], assigned_contractor_names: [c.name] });
    }
  };

  const autoAssign = () => {
    const poolJobs = (assignments.pool || []).map(jobById).filter(Boolean);
    const next = { ...assignments, pool: [] };
    contractors.forEach((c) => { if (!next[c.id]) next[c.id] = []; });
    const updates = [];
    poolJobs.forEach((job) => {
      let best = null, bestMi = Infinity;
      contractors.forEach((c) => {
        const mi = haversineMi({ lat: c.current_latitude, lng: c.current_longitude }, { lat: job.latitude, lng: job.longitude });
        if (mi != null && mi < bestMi) { bestMi = mi; best = c; }
      });
      if (!best && contractors.length) best = contractors[0];
      if (best) {
        next[best.id].push(job.id);
        updates.push(base44.entities.Job.update(job.id, { assigned_contractor_ids: [best.id], assigned_contractor_names: [best.name] }));
      } else {
        next.pool.push(job.id);
      }
    });
    setAssignments(next);
    Promise.all(updates);
  };

  const optimize = (cid) => {
    const c = contractors.find((x) => x.id === cid);
    const list = (assignments[cid] || []).map(jobById).filter(Boolean);
    let prev = c ? { lat: c.current_latitude, lng: c.current_longitude } : null;
    const ordered = [];
    const remaining = [...list];
    while (remaining.length) {
      let bi = 0, bd = Infinity;
      remaining.forEach((j, i) => {
        const d = (prev ? haversineMi(prev, { lat: j.latitude, lng: j.longitude }) : null) ?? Infinity;
        if (d < bd) { bd = d; bi = i; }
      });
      const j = remaining.splice(bi, 1)[0];
      ordered.push(j);
      prev = { lat: j.latitude, lng: j.longitude };
    }
    setAssignments({ ...assignments, [cid]: ordered.map((j) => j.id) });
  };

  const selectedContractor = contractors.find((c) => c.id === selected);
  const selectedStops = (assignments[selected] || []).map(jobById).filter(Boolean);
  const route = useMemo(() => computeRoute(selectedContractor, selectedStops), [selectedContractor, selectedStops]);

  const hoursWarn = (job, arrival) => {
    const client = clients.find((c) => c.id === job.client_id);
    if (!client || !client.opening_time || !client.closing_time) return null;
    const mins = arrival.getHours() * 60 + arrival.getMinutes();
    const [oh, om] = client.opening_time.split(":").map(Number);
    const [ch, cm] = client.closing_time.split(":").map(Number);
    if (mins < oh * 60 + om || mins > ch * 60 + cm) return `${client.opening_time}–${client.closing_time}`;
    return null;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 h-screen lg:h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><RouteIcon className="w-5 h-5 text-cyan-400" /> Route Planning</h1>
          <p className="text-sm text-slate-500">Drag jobs to field crews · auto ETAs · nearest-employee assignment</p>
        </div>
        <button
          onClick={autoAssign}
          disabled={!(assignments.pool || []).length}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-40"
        >
          <Wand2 className="w-4 h-4" /> Auto-assign nearest
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-4 min-h-0 flex-col lg:flex-row">
          {/* Pool */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col min-h-0">
            <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Unassigned ({(assignments.pool || []).length})
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-900/60 rounded-xl border border-slate-800 p-2 min-h-[160px] lg:min-h-0">
              <Droppable droppableId="pool">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {(assignments.pool || []).map((id, i) => {
                      const job = jobById(id);
                      if (!job) return null;
                      return (
                        <Draggable key={job.id} draggableId={job.id} index={i}>
                          {(p) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 hover:border-slate-600 cursor-grab active:cursor-grabbing">
                              <div className="flex items-start gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-200 leading-snug">{job.title}</div>
                                  <div className="text-xs text-slate-500 truncate">{job.site_address}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {!(assignments.pool || []).length && <div className="text-center text-xs text-slate-600 py-6">All jobs assigned</div>}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Contractor routes */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="text-xs font-medium text-slate-400 mb-2">Field Crews ({contractors.length})</div>
            <div className="space-y-3">
              {contractors.map((c) => {
                const stops = (assignments[c.id] || []).map(jobById).filter(Boolean);
                const r = computeRoute(c, stops);
                const isSel = selected === c.id;
                return (
                  <div key={c.id} className={`rounded-xl border bg-slate-900/60 ${isSel ? "border-cyan-500/40" : "border-slate-800"}`}>
                    <div
                      onClick={() => setSelected(c.id)}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-800/40 rounded-t-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">{c.name?.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-200 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{c.current_status?.replace("_", " ")}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-slate-300">{stops.length} stops · {r.totalDrive.toFixed(1)} mi</div>
                        <div className="text-slate-500">Ends {fmtTime(r.endTime)}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); optimize(c.id); }}
                        disabled={stops.length < 2}
                        className="text-xs px-2 py-1 rounded-md bg-slate-800 text-cyan-300 hover:bg-slate-700 flex items-center gap-1 disabled:opacity-40"
                      >
                        <Zap className="w-3 h-3" /> Optimize
                      </button>
                    </div>
                    <div className="px-2 pb-2">
                      <Droppable droppableId={c.id} direction="vertical">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5 min-h-[40px]">
                            {stops.map((job, i) => (
                              <Draggable key={job.id} draggableId={job.id} index={i}>
                                {(p) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2 hover:border-slate-600 cursor-grab active:cursor-grabbing">
                                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm text-slate-200 truncate">{job.title}</div>
                                      <div className="text-xs text-slate-500 truncate">{job.site_address}</div>
                                    </div>
                                    <div className="text-right text-[11px] shrink-0">
                                      <div className="text-cyan-300 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{fmtTime(r.stops[i].arrival)}</div>
                                      {r.stops[i].mi != null && <div className="text-slate-500">{r.stops[i].mi.toFixed(1)} mi</div>}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {stops.length === 0 && <div className="text-center text-xs text-slate-600 py-3">Drop jobs here</div>}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
              {contractors.length === 0 && <div className="text-center text-slate-500 text-sm py-8">No field crew contractors found.</div>}
            </div>
          </div>

          {/* Map + ETA */}
          <div className="w-full lg:w-[400px] shrink-0 flex flex-col min-h-0">
            <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> {selectedContractor?.name || "Select a crew"}'s route
            </div>
            <div className="rounded-xl border border-slate-800 overflow-hidden h-[300px] lg:h-auto lg:flex-1 min-h-[300px]">
              <RouteMap contractor={selectedContractor} stops={selectedStops} />
            </div>
            <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-[240px] overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Optimized ETA schedule</span>
                <span className="text-slate-500">{route.totalDrive.toFixed(1)} mi total</span>
              </div>
              {route.stops.length === 0 ? (
                <div className="text-center text-xs text-slate-600 py-4">No stops yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {route.stops.map((s, i) => (
                    <div key={s.job.id} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-200 truncate">{s.job.title}</div>
                        <div className="text-slate-500 truncate">{s.job.site_address}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-cyan-300">{fmtTime(s.arrival)}</div>
                        {s.mi != null && <div className="text-slate-500">{s.mi.toFixed(1)} mi</div>}
                        {(() => { const w = hoursWarn(s.job, s.arrival); return w ? <div className="text-amber-400 text-[10px] flex items-center gap-0.5 justify-end"><Clock className="w-3 h-3" />outside {w}</div> : null; })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}