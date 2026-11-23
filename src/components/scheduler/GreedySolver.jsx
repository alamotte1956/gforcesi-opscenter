import {
  withinWindow,
  personnelAvailable,
  kmeansSeeded,
  nearestNeighborRoute,
  twoOpt,
  packRouteIntoDay,
  getHomeCoords,
} from "./SchedulerUtils";

export async function runFastGreedySolver(config) {
  const {
    projectId,
    weekStartDate,
    horizonDays = 7,
    sites = [],
    personnel = [],
    honorPriority = true,
  } = config;

  const assignments = [];
  const assignedSiteIds = new Set();

  const horizon = [];
  for (let i = 0; i < horizonDays; i++) {
    const d = new Date(`${weekStartDate}T00:00:00`);
    d.setDate(d.getDate() + i);
    horizon.push(d.toISOString().split("T")[0]);
  }

  const workloadTracking = {};
  personnel.forEach((p) => {
    workloadTracking[p.id] = { totalHours: 0, assignments: 0 };
  });

  for (const date of horizon) {
    const eligibleSites = sites.filter(
      (site) => !assignedSiteIds.has(site.id) && withinWindow(date, site.ready_date, site.deadline)
    );
    const availablePersonnel = personnel.filter((person) => personnelAvailable(person, date));

    if (eligibleSites.length === 0 || availablePersonnel.length === 0) continue;

    const sortedSites = [...eligibleSites];
    if (honorPriority) {
      sortedSites.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (da !== db) return da - db;
        return (b.priority || 0) - (a.priority || 0);
      });
    }

    const clusters = kmeansSeeded(sortedSites, availablePersonnel);

    for (const personId of Object.keys(clusters)) {
      const { person, sites: clusterSites } = clusters[personId];
      if (!clusterSites.length) continue;

      const { lat, lng } = getHomeCoords(person);
      let route = nearestNeighborRoute(clusterSites, lat, lng);
      route = twoOpt(route, lat, lng);

      const dayAssignments = packRouteIntoDay(route, person, date);
      dayAssignments.forEach((a) => {
        a.project_id = projectId;
        assignments.push(a);
        assignedSiteIds.add(a.site_id);
        workloadTracking[personId].totalHours += a.service_hours || 2;
        workloadTracking[personId].assignments += 1;
      });
    }
  }

  const kpis = calculateKPIs(assignments, sites, personnel, workloadTracking);
  const finalUnassigned = sites
    .filter((site) => !assignedSiteIds.has(site.id))
    .map((site) => ({
      site_id: site.id,
      site_name: site.name || site.title,
      region_zone: site.region_zone || "CONUS",
      reason: "No available crew capacity in planning window",
      deadline: site.deadline,
      priority: site.priority,
    }));

  return {
    assignments,
    unassigned: finalUnassigned,
    kpis,
    summary: {
      totalSites: sites.length,
      scheduledSites: assignedSiteIds.size,
      unscheduledSites: finalUnassigned.length,
      totalAssignments: assignments.length,
      scheduleRate: sites.length > 0 ? ((assignedSiteIds.size / sites.length) * 100).toFixed(1) : "0.0",
    },
  };
}

function calculateKPIs(assignments, sites, personnel, workloadTracking) {
  const totalTravelDistance = assignments.reduce((s, a) => s + (a.travel_distance_km || 0), 0);
  const totalTravelTime = assignments.reduce((s, a) => s + (a.travel_time_hr || 0), 0);
  const totalServiceTime = assignments.reduce((s, a) => s + (a.service_hours || 2), 0);

  const personnelStats = personnel.map((person) => {
    const mine = assignments.filter((a) => a.contractor_id === person.id);
    const tracking = workloadTracking[person.id] || { totalHours: 0, assignments: 0 };
    const travelDistance = mine.reduce((s, a) => s + (a.travel_distance_km || 0), 0);
    const travelTime = mine.reduce((s, a) => s + (a.travel_time_hr || 0), 0);
    return {
      personnel_id: person.id,
      personnel_name: person.name,
      assignments: tracking.assignments,
      service_hours: tracking.totalHours.toFixed(1),
      travel_distance_km: travelDistance.toFixed(1),
      travel_time_hr: travelTime.toFixed(2),
      total_hours: (tracking.totalHours + travelTime).toFixed(1),
    };
  });

  const hours = personnelStats.map((p) => parseFloat(p.total_hours));
  const avgHours = hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
  const variance = hours.length ? hours.reduce((s, h) => s + (h - avgHours) ** 2, 0) / hours.length : 0;
  const cv = avgHours > 0 ? Math.sqrt(variance) / avgHours : 0;

  return {
    total_travel_distance_km: totalTravelDistance.toFixed(1),
    total_travel_time_hr: totalTravelTime.toFixed(2),
    total_service_time_hr: totalServiceTime.toFixed(1),
    total_time_hr: (totalTravelTime + totalServiceTime).toFixed(1),
    avg_travel_per_assignment_km: assignments.length ? (totalTravelDistance / assignments.length).toFixed(1) : "0.0",
    workload_balance_cv: cv.toFixed(3),
    personnel_stats: personnelStats,
  };
}

export default { runFastGreedySolver };
