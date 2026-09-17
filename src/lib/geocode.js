// Geocodes a street address via OpenStreetMap Nominatim (free, no API key).
// Returns { latitude, longitude, display_name } or null when not found.
// Used by job creation to populate coordinates the Route Planner needs for distance/ETA.
export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;
  try {
    const q = encodeURIComponent(address.trim());
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
      headers: { "Accept-Language": "en" },
    });
    const data = await res.json();
    if (!data || !data.length) return null;
    const { lat, lon, display_name } = data[0];
    return { latitude: parseFloat(lat), longitude: parseFloat(lon), display_name };
  } catch (e) {
    return null;
  }
}