import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Route as RouteIcon, Zap, MapPin, Clock, Navigation, Wand2, GripVertical, Loader2 } from "lucide-react";
import RouteMap from "@/components/operations/RouteMap";
import { geocodeAddress } from "@/lib/geocode";
import { useToast } from "@/components/ui/use-toast";

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

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function timeToday(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
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
  const [projects, setProjects] = useState([]);
  const [assignments, setAssignments] = useState({ pool: [] });
  const [reasons, setReasons] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("17:00");
  const [geocoding, setGeocoding] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [j, c, cls, prj] = await Promise.all([base44.entities.Job.list(), base44.entities.Contractor.list(), base44.entities.Client.list(), base44.entities.Project.list()]);
    setClients(cls);
    setProjects(prj);
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

  const missingCoords = jobs.filter((j) => j.site_address && (j.latitude == null || j.longitude == null)).length;

  const geocodeAllSites = async () => {
    const missing = jobs.filter((j) => j.site_address && (j.latitude == null || j.longitude == null));
    if (missing.length === 0) {
      toast({ title: "All set", description: "Every job site already has coordinates." });
      return;
    }
    setGeocoding(true);
    let done = 0, failed = 0;
    for (const job of missing) {
      const coords = await geocodeAddress(job.site_address);
      if (coords) {
        await base44.entities.Job.update(job.id, { latitude: coords.latitude, longitude: coords.longitude });
        done++;
      } else {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 1100)); // respect Nominatim ~1 req/sec
    }
    setGeocoding(false);
    await load();
    toast({ title: "Geocoding complete", description: `${done} site(s) geocoded${failed ? `, ${failed} not found` : ""}.` });
  };

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
    const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
    poolJobs.sort((a, b) => (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2));
    const available = contractors.filter((c) => ["available", "en_route"].includes(c.current_status));
    const pool = available.length ? available : contractors;
    const next = { ...assignments, pool: [] };
    contractors.forEach((c) => { if (!next[c.id]) next[c.id] = []; });
    const updates = [];
    poolJobs.forEach((job) => {
      let best = null, bestScore = Infinity;
      pool.forEach((c) => {
        const load = (next[c.id] || []).length;
        const mi = haversineMi({ lat: c.current_latitude, lng: c.current_longitude }, { lat: job.latitude, lng: job.longitude });
        const dist = mi != null ? mi : (load === 0 ? 0 : 50);
        const score = dist + load * 5;
        if (score < bestScore) { bestScore = score; best = c; }
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

  const nearestNeighborOrder = (start, list) => {
    let prev = start;
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
    return ordered;
  };

  const optimize = (cid) => {
    const c = contractors.find((x) => x.id === cid);
    const list = (assignments[cid] || []).map(jobById).filter(Boolean);
    if (list.length < 2) return;
    const start = c ? { lat: c.current_latitude, lng: c.current_longitude } : null;
    const before = computeRoute(c, list, timeToday(dayStart)).totalDrive;
    const ordered = nearestNeighborOrder(start, list);
    const after = computeRoute(c, ordered, timeToday(dayStart)).totalDrive;
    setAssignments({ ...assignments, [cid]: ordered.map((j) => j.id) });
    if (before === 0 && after === 0) {
      toast({ title: "Can't optimize", description: "These jobs are missing coordinates — add lat/long to optimize routing.", variant: "destructive" });
    } else if (after >= before) {
      toast({ title: "Already optimal", description: `${c?.name || "Route"} is already in the best order (${before.toFixed(1)} mi).` });
    } else {
      toast({ title: "Route optimized", description: `${c?.name || "Route"}: ${before.toFixed(1)} → ${after.toFixed(1)} mi (saved ${(before - after).toFixed(1)} mi).` });
    }
  };

  const optimizeAll = () => {
    const next = { ...assignments };
    let optimizedCount = 0, totalSaved = 0, noCoordCount = 0;
    contractors.forEach((c) => {
      const list = (assignments[c.id] || []).map(jobById).filter(Boolean);
      if (list.length < 2) return;
      const start = { lat: c.current_latitude, lng: c.current_longitude };
      const before = computeRoute(c, list, timeToday(dayStart)).totalDrive;
      const ordered = nearestNeighborOrder(start, list);
      const after = computeRoute(c, ordered, timeToday(dayStart)).totalDrive;
      next[c.id] = ordered.map((j) => j.id);
      if (before === 0 && after === 0) noCoordCount++;
      else if (after < before) { optimizedCount++; totalSaved += before - after; }
    });
    setAssignments(next);
    if (optimizedCount === 0 && noCoordCount > 0) {
      toast({ title: "Can't optimize", description: "Jobs are missing coordinates — add lat/long to optimize routing.", variant: "destructive" });
    } else if (optimizedCount === 0) {
      toast({ title: "Already optimal", description: "All crew routes are already in their best order." });
    } else {
      toast({ title: "Routes optimized", description: `${optimizedCount} crew route(s) improved — saved ${totalSaved.toFixed(1)} miles total.${noCoordCount ? ` ${noCoordCount} crew(s) skipped (missing coordinates).` : ""}` });
    }
  };

  const generateDailyPlan = () => {
    const startMin = toMin(dayStart);
    const endMin = toMin(dayEnd);
    const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
    // Urgent jobs penalize distance harder so they prefer the closest crew.
    const prioWeight = { urgent: 0.6, high: 0.8, medium: 1, low: 1.3 };
    // Gather every current job (pool + already assigned) as candidates.
    const seen = new Set();
    const candidates = [];
    [...(assignments.pool || []), ...contractors.flatMap((c) => assignments[c.id] || [])].forEach((id) => {
      const job = jobById(id);
      if (job && !seen.has(job.id)) { seen.add(job.id); candidates.push(job); }
    });
    // Most important / soonest SLA first so they get claimed before the day fills.
    candidates.sort((a, b) => {
      const pa = prio[a.priority] ?? 2, pb = prio[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      const sa = a.sla_due_date ? new Date(a.sla_due_date).getTime() : Infinity;
      const sb = b.sla_due_date ? new Date(b.sla_due_date).getTime() : Infinity;
      return sa - sb;
    });
    const available = contractors.filter((c) => ["available", "en_route"].includes(c.current_status));
    const pool = available.length ? available : contractors;
    const next = { pool: [] };
    contractors.forEach((c) => { next[c.id] = []; });
    const crewState = {};
    pool.forEach((c) => {
      crewState[c.id] = { pos: { lat: c.current_latitude, lng: c.current_longitude }, time: startMin };
    });
    const updates = [];
    const newReasons = {};
    candidates.forEach((job) => {
      let best = null, bestScore = Infinity, bestArrival = null, bestReasons = [];
      const jobRegion = projects.find((p) => p.id === job.project_id)?.region;
      pool.forEach((c) => {
        const st = crewState[c.id];
        if (!st) return;
        const mi = haversineMi(st.pos, { lat: job.latitude, lng: job.longitude });
        const driveMin = mi != null ? (mi / AVG_SPEED_MPH) * 60 : 15;
        const arrival = st.time + driveMin;
        const serviceMin = job.estimated_duration_hours ? job.estimated_duration_hours * 60 : SERVICE_MIN;
        if (arrival + serviceMin > endMin + 30) return; // doesn't fit in the workday
        const client = clients.find((cl) => cl.id === job.client_id);
        const rs = [`${(mi ?? 0).toFixed(1)} mi`];
        let penalty = 0;
        // Client site hours
        if (client && client.opening_time && client.closing_time) {
          const open = toMin(client.opening_time), close = toMin(client.closing_time);
          if (arrival > close) penalty = 1000; // after hours — avoid
          else if (arrival < open) { penalty = (open - arrival) * 2; rs.push(`wait until ${client.opening_time}`); }
          else rs.push("within site hours");
        }
        // Scheduled start alignment
        if (job.scheduled_start) {
          const schedMin = new Date(job.scheduled_start).getHours() * 60 + new Date(job.scheduled_start).getMinutes();
          const diff = Math.abs(arrival - schedMin);
          if (diff > 60) penalty += (diff - 60) * 0.5;
          if (diff <= 30) rs.push("on schedule");
        }
        // SLA urgency
        if (job.sla_due_date) {
          const sla = new Date(job.sla_due_date);
          if (sla.toDateString() === new Date().toDateString()) { penalty -= 15; rs.push("SLA today"); }
          else if (sla < new Date(Date.now() + 2 * 86400000)) { penalty -= 8; rs.push("SLA soon"); }
        }
        // Region match
        if (jobRegion && c.region && jobRegion.toLowerCase() === c.region.toLowerCase()) {
          penalty -= 10; rs.push("region match");
        }
        // Equipment match
        const reqEq = job.required_equipment || [];
        const crewEq = c.assigned_equipment || [];
        if (reqEq.length && crewEq.length) {
          const matches = reqEq.filter((e) => crewEq.some((x) => x && x.toLowerCase().includes(e.toLowerCase())));
          if (matches.length) { penalty -= matches.length * 4; rs.push(`${matches.length} equip match`); }
        }
        // Priority-weighted distance + workload balance
        const pw = prioWeight[job.priority] ?? 1;
        const load = (next[c.id] || []).length;
        const score = driveMin * pw + penalty + load * 3;
        if (score < bestScore) { bestScore = score; best = c; bestArrival = arrival; bestReasons = rs; }
      });
      if (best) {
        const st = crewState[best.id];
        const serviceMin = job.estimated_duration_hours ? job.estimated_duration_hours * 60 : SERVICE_MIN;
        next[best.id].push(job.id);
        newReasons[job.id] = bestReasons;
        crewState[best.id].pos = { lat: job.latitude, lng: job.longitude };
        crewState[best.id].time = bestArrival + serviceMin;
        if (!(job.assigned_contractor_ids || []).includes(best.id)) {
          updates.push(base44.entities.Job.update(job.id, { assigned_contractor_ids: [best.id], assigned_contractor_names: [best.name] }));
        }
      } else {
        // Doesn't fit any crew today — defer back to the pool.
        next.pool.push(job.id);
        if (job.assigned_contractor_ids && job.assigned_contractor_ids.length) {
          updates.push(base44.entities.Job.update(job.id, { assigned_contractor_ids: [], assigned_contractor_names: [] }));
        }
      }
    });
    // Sequence each crew's stops by nearest-neighbor from their start position.
    Object.keys(next).forEach((cid) => {
      if (cid === "pool") return;
      const c = contractors.find((x) => x.id === cid);
      const list = (next[cid] || []).map(jobById).filter(Boolean);
      if (list.length < 2) return;
      let prev = { lat: c.current_latitude, lng: c.current_longitude };
      const ordered = [];
      const remaining = [...list];
      while (remaining.length) {
        let bi = 0, bd = Infinity;
        remaining.forEach((j, i) => {
          const d = haversineMi(prev, { lat: j.latitude, lng: j.longitude }) ?? Infinity;
          if (d < bd) { bd = d; bi = i; }
        });
        const j = remaining.splice(bi, 1)[0];
        ordered.push(j);
        prev = { lat: j.latitude, lng: j.longitude };
      }
      next[cid] = ordered.map((j) => j.id);
    });
    setAssignments(next);
    setReasons(newReasons);
    Promise.all(updates);
    const assigned = candidates.length - (next.pool || []).length;
    toast({ title: "Suggested plan generated", description: `${assigned} of ${candidates.length} jobs assigned across ${pool.length} available crew(s).` });
  };

  const toggleAuto = (on) => {
    setAutoMode(on);
    if (on) generateDailyPlan();
  };

  const suggestContractor = (job) => {
    const available = contractors.filter((c) => ["available", "en_route"].includes(c.current_status));
    const pool = available.length ? available : contractors;
    let best = null, bestMi = Infinity;
    pool.forEach((c) => {
      const mi = haversineMi({ lat: c.current_latitude, lng: c.current_longitude }, { lat: job.latitude, lng: job.longitude });
      if (mi != null && mi < bestMi) { bestMi = mi; best = c; }
    });
    if (!best) return null;
    const driveMin = bestMi != null ? (bestMi / AVG_SPEED_MPH) * 60 : null;
    return { contractor: best, mi: bestMi, driveMin };
  };

  const assignSuggested = (job) => {
    const s = suggestContractor(job);
    if (!s) return;
    const next = { ...assignments };
    next.pool = (next.pool || []).filter((id) => id !== job.id);
    if (!next[s.contractor.id]) next[s.contractor.id] = [];
    next[s.contractor.id] = [...next[s.contractor.id], job.id];
    setAssignments(next);
    base44.entities.Job.update(job.id, { assigned_contractor_ids: [s.contractor.id], assigned_contractor_names: [s.contractor.name] });
  };

  const selectedContractor = contractors.find((c) => c.id === selected);
  const selectedStops = (assignments[selected] || []).map(jobById).filter(Boolean);
  const route = useMemo(() => computeRoute(selectedContractor, selectedStops, timeToday(dayStart)), [selectedContractor, selectedStops, dayStart]);

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
          <p className="text-sm text-slate-500">{autoMode ? "Suggested plan generated — drag any job to override" : "Manual mode — drag jobs to crews · click Automatic to generate a suggested plan"}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <Clock className="w-4 h-4 text-slate-500" />
            <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="bg-transparent text-sm text-slate-200 focus:outline-none w-[74px]" />
            <span className="text-slate-600 text-xs">to</span>
            <input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className="bg-transparent text-sm text-slate-200 focus:outline-none w-[74px]" />
          </div>
          <button
            onClick={generateDailyPlan}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"
          >
            <Wand2 className="w-4 h-4" /> Generate daily plan
          </button>
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => toggleAuto(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition ${!autoMode ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
            >
              <RouteIcon className="w-4 h-4" /> Manual
            </button>
            <button
              onClick={() => toggleAuto(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition ${autoMode ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Wand2 className="w-4 h-4" /> Automatic
            </button>
          </div>
          <button
            onClick={geocodeAllSites}
            disabled={geocoding}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700 disabled:opacity-50"
          >
            {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} Geocode sites{missingCoords > 0 ? ` (${missingCoords})` : ""}
          </button>
          <button
            onClick={optimizeAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700"
          >
            <Zap className="w-4 h-4" /> Optimize all
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[10px] text-slate-500">
        <span className="text-slate-600">Suggested plan weighs:</span>
        {["Priority", "SLA due date", "Distance / drive time", "Crew availability", "Site hours", "Scheduled start", "Region match", "Equipment match", "Workload balance"].map((f) => (
          <span key={f} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">{f}</span>
        ))}
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
                        <Draggable key={job.id} draggableId={job.id} index={i} isDragDisabled={false}>
                          {(p) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 hover:border-slate-600 cursor-grab active:cursor-grabbing">
                              <div className="flex items-start gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-200 leading-snug">{job.title}</div>
                                  <div className="text-xs text-slate-500 truncate">{job.site_address}</div>
                                  {(() => {
                                    const s = suggestContractor(job);
                                    if (!s) return null;
                                    return (
                                      <div className="mt-1.5 flex items-center gap-1.5">
                                        <div className="text-[10px] text-cyan-400/90 flex items-center gap-1 flex-1 min-w-0">
                                          <Navigation className="w-3 h-3 shrink-0" />
                                          <span className="truncate">{s.contractor.name}</span>
                                          <span className="text-slate-500 shrink-0">· {s.mi.toFixed(1)} mi{s.driveMin != null ? ` · ${Math.round(s.driveMin)}m` : ""}</span>
                                        </div>
                                        <button
                                          onClick={() => assignSuggested(job)}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 font-medium shrink-0"
                                        >
                                          Assign
                                        </button>
                                      </div>
                                    );
                                  })()}
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
                const r = computeRoute(c, stops, timeToday(dayStart));
                const isSel = selected === c.id;
                return (
                  <div key={c.id} className={`rounded-xl border bg-slate-900/60 ${isSel ? "border-cyan-500/40" : "border-slate-800"}`}>
                    <div
                      onClick={() => setSelected(c.id)}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-800/40 rounded-t-xl"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">{c.name?.charAt(0)}</div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${c.current_status === "available" ? "bg-emerald-400" : ["en_route", "on_site"].includes(c.current_status) ? "bg-amber-400" : "bg-slate-500"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-200 truncate">{c.name}</div>
                        <div className={`text-xs capitalize ${c.current_status === "available" ? "text-emerald-400" : "text-slate-500"}`}>{c.current_status?.replace("_", " ")}</div>
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
                              <Draggable key={job.id} draggableId={job.id} index={i} isDragDisabled={false}>
                                {(p) => (
                                  <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2 hover:border-slate-600 cursor-grab active:cursor-grabbing">
                                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm text-slate-200 truncate">{job.title}</div>
                                      <div className="text-xs text-slate-500 truncate">{job.site_address}</div>
                                      {reasons[job.id]?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {reasons[job.id].slice(0, 3).map((rs, k) => (
                                            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300/80 border border-cyan-500/20">{rs}</span>
                                          ))}
                                        </div>
                                      )}
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