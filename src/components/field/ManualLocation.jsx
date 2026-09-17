import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, Locate } from "lucide-react";
import { logContractorEvent } from "@/lib/contractorStatus";

// Geocodes a typed address via OpenStreetMap Nominatim (free, no API key)
// and writes the coordinates onto the contractor record so the Route Planner
// and live map can use them even when GPS is unavailable or declined.
export default function ManualLocation({ contractor, onUpdated }) {
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!addr.trim() || !contractor) return;
    setBusy(true);
    setErr("");
    try {
      const q = encodeURIComponent(addr.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
        headers: { "Accept-Language": "en" },
      });
      const data = await res.json();
      if (!data || !data.length) {
        setErr("Address not found — try a more specific address.");
        setBusy(false);
        return;
      }
      const { lat, lon, display_name } = data[0];
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const now = new Date().toISOString();
      await base44.entities.Contractor.update(contractor.id, {
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_at: now,
        location_sharing: true,
        last_status_at: now,
      });
      await logContractorEvent({ ...contractor, current_latitude: latitude, current_longitude: longitude }, "location_update", {
        latitude,
        longitude,
        note: `Manual location set: ${display_name || addr}`,
      });
      setAddr("");
      onUpdated?.();
    } catch (e) {
      setErr("Couldn't set location. Check your connection and try again.");
    }
    setBusy(false);
  };

  const useGps = async () => {
    if (!contractor) return;
    setBusy(true);
    setErr("");
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      const now = new Date().toISOString();
      await base44.entities.Contractor.update(contractor.id, {
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_at: now,
        location_sharing: true,
        last_status_at: now,
      });
      await logContractorEvent({ ...contractor, current_latitude: latitude, current_longitude: longitude }, "location_update", {
        latitude,
        longitude,
        note: "Location set via GPS",
      });
      onUpdated?.();
    } catch (e) {
      setErr("Couldn't get GPS location. Type your address instead.");
    }
    setBusy(false);
  };

  const hasCoords = contractor?.current_latitude != null && contractor?.current_longitude != null;

  return (
    <div className="mt-2.5 bg-slate-800/40 border border-slate-700/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[11px] font-medium text-slate-400">My current location</span>
        {hasCoords && <span className="text-[10px] text-emerald-400 ml-auto">● Set</span>}
      </div>
      <div className="flex gap-1.5">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type your address…"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          disabled={busy}
        />
        <button
          onClick={submit}
          disabled={busy || !addr.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-medium disabled:opacity-50 flex items-center gap-1"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          Set
        </button>
      </div>
      <button
        onClick={useGps}
        disabled={busy}
        className="mt-1.5 w-full py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-700 disabled:opacity-50"
      >
        <Locate className="w-3.5 h-3.5" /> Use my GPS instead
      </button>
      {err && <div className="mt-1.5 text-[11px] text-rose-400">{err}</div>}
    </div>
  );
}