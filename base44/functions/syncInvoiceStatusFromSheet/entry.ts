import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Maps free-text status values from the sheet to the Invoice status enum.
const STATUS_MAP = {
  draft: "draft", draft: "draft", "not sent": "draft", unsent: "draft",
  sent: "sent", sent: "sent", "sent to client": "sent", "invoice sent": "sent", outstanding: "sent",
  synced: "synced", synced: "synced", "in quickbooks": "synced", "qb synced": "synced", "synced to qb": "synced",
  paid: "paid", paid: "paid", "payment received": "paid", "paid in full": "paid", "fully paid": "paid", complete: "paid", closed: "paid",
  overdue: "overdue", overdue: "overdue", "past due": "overdue", late: "overdue", unpaid: "overdue",
};

function normalizeStatus(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return STATUS_MAP[key] || null;
}

// Finds the best-matching header for a set of candidate names (case/symbol insensitive).
function findColumn(headers, candidates) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const targets = candidates.map(norm);
  for (const t of targets) {
    const idx = headers.findIndex((h) => norm(h) === t);
    if (idx >= 0) return idx;
  }
  // Fuzzy: header contains one of the candidates
  for (const t of targets) {
    const idx = headers.findIndex((h) => norm(h).includes(t));
    if (idx >= 0) return idx;
  }
  return -1;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const spreadsheetId = input.spreadsheet_id;
    if (!spreadsheetId) return Response.json({ error: "spreadsheet_id required" }, { status: 400 });
    const dryRun = !!input.dry_run;

    // Read the sheet via the authorized Google Sheets connector.
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || "Cannot access this spreadsheet. Make sure it is shared with the connected Google account." }, { status: 502 });
    }
    const meta = await metaRes.json();
    const sheetNames = (meta.sheets || []).map((s) => s.properties?.title).filter(Boolean);
    const sheetName = input.sheet_name || sheetNames[0];
    if (!sheetName) return Response.json({ error: "No sheets found in this spreadsheet" }, { status: 400 });

    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valRes.ok) {
      const err = await valRes.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || "Failed to read sheet values" }, { status: 502 });
    }
    const valData = await valRes.json();
    const values = valData.values || [];
    if (!values.length) return Response.json({ error: "Sheet is empty" }, { status: 400 });

    const headers = (values[0] || []).map((h) => String(h ?? ""));
    const invoiceCol = findColumn(headers, ["Invoice Number", "Invoice #", "Invoice No", "Invoice", "invoice_number"]);
    const statusCol = findColumn(headers, ["Status", "Payment Status", "Invoice Status", "Billing Status"]);

    if (invoiceCol < 0) return Response.json({ error: "Could not find an invoice number column (expected a header like 'Invoice Number', 'Invoice #', or 'Invoice No')." }, { status: 400 });
    if (statusCol < 0) return Response.json({ error: "Could not find a status column (expected a header like 'Status', 'Payment Status', or 'Invoice Status')." }, { status: 400 });

    // Build a map of invoice_number -> normalized status from the sheet.
    const sheetStatuses = {};
    let skipped = 0;
    for (const row of values.slice(1)) {
      const num = String(row[invoiceCol] ?? "").trim();
      const rawStatus = row[statusCol];
      if (!num) { skipped++; continue; }
      const status = normalizeStatus(rawStatus);
      if (!status) { skipped++; continue; }
      sheetStatuses[num] = status;
    }

    // Load all invoices and update those whose status changed.
    const invoices = await base44.asServiceRole.entities.Invoice.list();
    const toUpdate = invoices.filter((inv) => {
      const num = String(inv.invoice_number ?? "").trim();
      const newStatus = sheetStatuses[num];
      return newStatus && newStatus !== inv.status;
    });

    const updated = [];
    const unmatched = [];
    for (const inv of toUpdate) {
      const num = String(inv.invoice_number ?? "").trim();
      const newStatus = sheetStatuses[num];
      if (dryRun) {
        updated.push({ id: inv.id, invoice_number: num, from: inv.status, to: newStatus });
        continue;
      }
      try {
        await base44.asServiceRole.entities.Invoice.update(inv.id, { status: newStatus });
        updated.push({ id: inv.id, invoice_number: num, from: inv.status, to: newStatus });
      } catch (e) {
        updated.push({ id: inv.id, invoice_number: num, error: e.message });
      }
    }

    // Sheet rows that didn't match any invoice.
    const knownNumbers = new Set(invoices.map((inv) => String(inv.invoice_number ?? "").trim()));
    for (const num of Object.keys(sheetStatuses)) {
      if (!knownNumbers.has(num)) unmatched.push(num);
    }

    return Response.json({
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
      invoice_column: headers[invoiceCol],
      status_column: headers[statusCol],
      sheet_rows: Object.keys(sheetStatuses).length,
      skipped_rows: skipped,
      invoices_checked: invoices.length,
      updated: updated.length,
      unmatched: unmatched,
      dryRun,
      updates: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}