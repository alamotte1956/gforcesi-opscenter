import { base44 } from "@/api/base44Client";

// Log a contractor status/shift/location event to the ContractorStatusEvent ledger.
// Best-effort: never throws (logging must not break the calling flow).
export async function logContractorEvent(contractor, eventType, payload = {}) {
  if (!contractor?.id) return;
  try {
    await base44.entities.ContractorStatusEvent.create({
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      event_type: eventType,
      status: payload.status ?? contractor.current_status,
      shift_status: payload.shift_status ?? contractor.shift_status,
      latitude: payload.latitude ?? contractor.current_latitude,
      longitude: payload.longitude ?? contractor.current_longitude,
      job_id: payload.job_id ?? contractor.current_job_id,
      job_title: payload.job_title ?? contractor.current_job_title,
      note: payload.note,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    /* best-effort */
  }
}

// Capture the browser geolocation as a Promise (resolves to {latitude, longitude} or null).
export function captureGeolocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}