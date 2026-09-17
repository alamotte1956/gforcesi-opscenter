// Quickbase REST API helper. Used by pullFromQuickbase.
// Docs: https://developer.quickbase.com (records/query)
const QB_BASE = "https://api.quickbase.com/v1";

export function qbHeaders(realm, token) {
  return {
    "QB-Realm": realm,
    "Authorization": `QB-USER-TOKEN ${token}`,
    "Content-Type": "application/json",
  };
}

function normLabel(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function coerce(val, type) {
  if (val == null || val === "") return undefined;
  if (type === "date") {
    const n = Number(val);
    if (!isNaN(n) && n > 0) return new Date(n).toISOString();
    return String(val);
  }
  if (type === "checkbox") return !!val;
  if (type === "float" || type === "numeric" || type === "duration") {
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }
  if (type && type.indexOf("multi") === 0) {
    return Array.isArray(val) ? val.filter((x) => x != null && x !== "") : [String(val)];
  }
  return val;
}

function normalizeRecord(rec, fields) {
  const out = { _rid: null, _labels: {} };
  for (const f of fields) {
    const id = String(f.id);
    const label = normLabel(f.label);
    const val = coerce(rec[id], f.type);
    if (val !== undefined) out._labels[label] = val;
    if (label === "recordid" || id === "3") out._rid = val;
  }
  return out;
}

// Paginate through all records of a table.
export async function qbQuery(realm, token, tableId) {
  const all = [];
  let skip = 0;
  const top = 1000;
  let guard = 0;
  while (true) {
    guard++; if (guard > 200) break;
    const res = await fetch(`${QB_BASE}/records/query`, {
      method: "POST",
      headers: qbHeaders(realm, token),
      body: JSON.stringify({ from: tableId, options: { skip, top } }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Quickbase query failed (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = await res.json();
    const records = json.data || [];
    const fields = json.fields || [];
    for (const r of records) all.push(normalizeRecord(r, fields));
    if (records.length < top) break;
    skip += top;
  }
  return all;
}

// Pick the first non-empty value whose Quickbase field label matches one of the given names.
export function pick(rec, ...labels) {
  for (const l of labels) {
    const key = normLabel(l);
    if (key in rec._labels) return rec._labels[key];
  }
  return undefined;
}

export function toArray(v) {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v;
  return String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

// Match a Quickbase value to one of the allowed enum values (case/space insensitive).
export function enumVal(v, set) {
  if (v == null) return undefined;
  const s = String(v).toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const s2 = String(v).toLowerCase().trim().replace(/\s+/g, "_");
  return set.find((x) => x.toLowerCase() === s || x.toLowerCase() === s2);
}

// Build a payload, dropping empty/undefined values so we don't overwrite existing data with blanks.
export function build(map) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}