import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

// Parses an uploaded Excel file (already stored via UploadFile) into raw
// headers + row objects so the Data Import page can map columns the same way
// it does for Google Sheets. First row must contain column headers.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    const resp = await fetch(fileUrl);
    if (!resp.ok) return Response.json({ error: 'Could not download the uploaded file' }, { status: 502 });
    const buf = await resp.arrayBuffer();

    const wb = XLSX.read(buf, { type: 'array' });
    const sheetNames = wb.SheetNames;
    if (!sheetNames.length) return Response.json({ error: 'Workbook has no sheets' }, { status: 400 });
    const sheetName = sheetNames[0];
    const ws = wb.Sheets[sheetName];

    const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
    if (!aoa.length) return Response.json({ error: 'Spreadsheet appears empty' }, { status: 400 });

    const headerRow = (aoa[0] || []).map((h) => String(h == null ? '' : h).trim());
    const headers = headerRow.filter((h) => h.length > 0);
    if (!headers.length) return Response.json({ error: 'No header row found — first row must contain column names' }, { status: 400 });

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < aoa.length; i++) {
      const rowArr = aoa[i] || [];
      if (rowArr.every((c) => c === '' || c == null)) continue;
      const obj: Record<string, string> = {};
      headerRow.forEach((h, idx) => {
        if (h) obj[h] = rowArr[idx] != null ? String(rowArr[idx]) : '';
      });
      rows.push(obj);
    }

    return Response.json({ sheet_names: sheetNames, sheet_name: sheetName, headers, rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}