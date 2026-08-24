import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Reports which integrations the current admin has connected.
// - Google Sheets: app-user connection (each admin connects their own account)
// - QuickBooks: shared app-wide connection (authorized by the builder in chat)
// Google Calendar has no workspace connector registered, so it is not checked.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const SHEETS_CONNECTOR_ID = '6a78afeef15cdc646169800c';

    let sheets = false;
    let quickbooks = false;
    try {
      await base44.asServiceRole.connectors.getCurrentAppUserConnection(SHEETS_CONNECTOR_ID);
      sheets = true;
    } catch {}
    try {
      await base44.asServiceRole.connectors.getConnection('quickbooks');
      quickbooks = true;
    } catch {}

    return Response.json({ sheets, quickbooks, calendar: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}