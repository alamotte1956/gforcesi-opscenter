import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';
import { TEMPLATE_COLUMNS } from "../../shared/importTemplates.ts";

// Generates a filled-in import template (Excel .xlsx or .csv) for the given
// entity, with a header row and one example row. Returns the file as base64
// so the frontend can decode + download it (same pattern as generateUserGuide).
function toBase64(u8: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(bin);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const entity = body.entity;
    const format = String(body.format || 'xlsx').toLowerCase();
    const tpl = TEMPLATE_COLUMNS[entity];
    if (!tpl) return Response.json({ error: 'Unknown entity' }, { status: 400 });

    const aoa = [tpl.headers, tpl.headers.map((h) => tpl.example[h] ?? '')];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    let mime: string;
    let ext: string;
    let b64: string;

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const u8 = new TextEncoder().encode(csv);
      b64 = toBase64(u8);
      mime = 'text/csv';
      ext = 'csv';
    } else {
      const out = XLSX.write({ SheetNames: [entity], Sheets: { [entity]: ws } }, { type: 'array', bookType: 'xlsx' });
      const u8 = new Uint8Array(out);
      b64 = toBase64(u8);
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
    }

    const filename = `${entity}_import_template.${ext}`;
    return Response.json({ file: b64, filename, mime });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}