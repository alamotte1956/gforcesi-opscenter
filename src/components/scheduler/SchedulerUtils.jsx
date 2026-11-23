// Core scheduling & geospatial utilities for G-Force SI multi-stop routing (CONUS, AK, HI)

export function haversineKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
    Number.isNaN(Number(lat1)) || Number.isNaN(Number(lon1)) ||
    Number.isNaN(Number(lat2)) || Number.isNaN(Number(lon2))
  ) {
    return 0;
  }
  const R = 6371;
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function travelTimeHr(distanceKm, speedKmh = 60) {
  const dist = Number(distanceKm);
  const speed = Number(speedKmh);
  if (Number.isNaN(dist) || dist <= 0) return 0;
  const safeSpeed = Number.isNaN(speed) || speed <= 0 ? 60 : speed;
  return dist / safeSpeed;
}

export function withinWindow(date, readyDate, deadline) {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    if (readyDate) {
      const ready = new Date(readyDate);
      if (!Number.isNaN(ready.getTime())) {
        ready.setHours(0, 0, 0, 0);
        if (d < ready) return false;
      }
    }
    if (deadline) {
      const end = new Date(deadline);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(0, 0, 0, 0);
        if (d > end) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function personnelAvailable(person, date) {
  if (!person) return false;
  if (!person.available_days || person.available_days.length === 0) return true;
  try {
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return false;
    const key = dayNames[d.getDay()];
    const days = Array.isArray(person.available_days)
      ? person.available_days
      : String(person.available_days).split(",").map((s) => s.trim());
    return days.some((day) => String(day).toLowerCase().slice(0, 3) === key);
  } catch {
    return false;
  }
}

export function formatTime(decimalHours) {
  if (decimalHours == null || Number.isNaN(Number(decimalHours))) return "08:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  const normalizedH = hours + Math.floor(minutes / 60);
  const normalizedM = minutes % 60;
  return `${String(normalizedH).padStart(2, "0")}:${String(normalizedM).padStart(2, "0")}`;
}

export function getHomeCoords(person) {
  const lat = person?.home_latitude ?? person?.base_latitude ?? person?.current_latitude ?? null;
  const lng = person?.home_longitude ?? person?.base_longitude ?? person?.current_longitude ?? null;
  return { lat, lng };
}

export function kmeansSeeded(sites, personnel) {
  const clusters = {};
  personnel.forEach((person) => {
    clusters[person.id] = { person, sites: [] };
  });

  sites.forEach((site) => {
    let bestId = personnel[0]?.id || null;
    let bestDist = Infinity;
    for (const person of personnel) {
      const { lat, lng } = getHomeCoords(person);
      const dist = lat != null && lng != null ? haversineKm(lat, lng, site.latitude, site.longitude) : 500;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = person.id;
      }
    }
    if (bestId && clusters[bestId]) {
      clusters[bestId].sites.push(site);
    }
  });

  return clusters;
}

export function nearestNeighborRoute(sites, startLat, startLng) {
  if (!sites || sites.length === 0) return [];
  const route = [];
  const remaining = [...sites];
  let currLat = startLat ?? remaining[0].latitude;
  let currLng = startLng ?? remaining[0].longitude;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let minDist = Infinity;
    remaining.forEach((site, idx) => {
      const d = haversineKm(currLat, currLng, site.latitude, site.longitude);
      if (d < minDist) {
        minDist = d;
        bestIdx = idx;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    currLat = next.latitude;
    currLng = next.longitude;
  }
  return route;
}

function routeLengthKm(route, startLat, startLng) {
  let total = 0;
  let prevLat = startLat;
  let prevLng = startLng;
  for (const s of route) {
    if (prevLat != null && prevLng != null) {
      total += haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    }
    prevLat = s.latitude;
    prevLng = s.longitude;
  }
  return total;
}

export function twoOpt(route, startLat, startLng) {
  if (!route || route.length < 3) return route || [];
  let best = [...route];
  let bestDist = routeLengthKm(best, startLat, startLng);
  let improved = true;
  let iter = 0;

  while (improved && iter < 40) {
    improved = false;
    iter++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        const dist = routeLengthKm(candidate, startLat, startLng);
        if (dist + 0.01 < bestDist) {
          best = candidate;
          bestDist = dist;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function packRouteIntoDay(route, person, date) {
  const { lat: homeLat, lng: homeLng } = getHomeCoords(person);
  const startHour = person.shift_start ? parseFloat(person.shift_start.split(":")[0]) : (person.start_hour || 8);
  const endHour = person.shift_end ? parseFloat(person.shift_end.split(":")[0]) : (person.end_hour || 17);
  let dayClock = startHour;
  let remainingHours = person.max_daily_hours || 8;
  let lastLat = homeLat;
  let lastLng = homeLng;
  const bufferHours = 0.25;
  const packed = [];

  for (const site of route) {
    const travelKm = lastLat != null && lastLng != null
      ? haversineKm(lastLat, lastLng, site.latitude, site.longitude)
      : 15;
    const travelHr = travelTimeHr(travelKm, person.vehicle_speed_kmh || 60);
    const serviceHr = Number(site.hours || site.estimated_duration_hours || 2);
    const totalBlock = travelHr + serviceHr + bufferHours;
    const arrivalTime = dayClock + travelHr;
    const finishTime = arrivalTime + serviceHr;

    if (finishTime <= endHour + 0.5 && totalBlock <= remainingHours + 0.5) {
      packed.push({
        site_id: site.id,
        site_name: site.name || site.title,
        region_zone: site.region_zone || "CONUS",
        personnel_id: person.id,
        contractor_id: person.id,
        contractor_name: person.name,
        assigned_date: date,
        start_time: formatTime(arrivalTime),
        end_time: formatTime(finishTime),
        travel_distance_km: Number(travelKm.toFixed(2)),
        travel_time_hr: Number(travelHr.toFixed(2)),
        service_hours: serviceHr,
        status: "scheduled",
      });
      remainingHours -= totalBlock;
      dayClock = finishTime + bufferHours;
      lastLat = site.latitude;
      lastLng = site.longitude;
    }
  }

  return packed;
}
