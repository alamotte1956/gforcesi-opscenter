import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const spreadsheetId = body?.spreadsheet_id;
    if (!spreadsheetId) return Response.json({ error: 'spreadsheet_id required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Cannot access this spreadsheet. Make sure it is shared with your Google account.' }, { status: 502 });
    }
    const meta = await metaRes.json();
    const sheetNames = (meta.sheets || []).map((s) => s.properties?.title).filter(Boolean);
    const sheetName = body?.sheet_name || sheetNames[0];
    if (!sheetName) return Response.json({ error: 'No sheets found in this spreadsheet' }, { status: 400 });

    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valRes.ok) {
      const err = await valRes.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Failed to read sheet values' }, { status: 502 });
    }
    const valData = await valRes.json();
    const values = valData.values || [];
    const headers = (values[0] || []).map((h) => String(h ?? ""));
    const rows = values.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] != null ? String(r[i]) : ""; });
      return obj;
    }).filter((r) => Object.values(r).some((v) => v.trim() !== ""));

    return Response.json({ sheet_names: sheetNames, sheet_name: sheetName, headers, rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}