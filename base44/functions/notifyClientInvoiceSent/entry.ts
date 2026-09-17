import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = (body.invoice_id || '').trim();
    if (!id) return Response.json({ error: 'invoice_id required' }, { status: 400 });
    const inv = await base44.asServiceRole.entities.Invoice.get(id);
    if (!inv) return Response.json({ error: 'Not found' }, { status: 404 });
    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find((c) => c.id === inv.client_id);
    const to = client?.billing_email || client?.portal_email;
    if (!to) return Response.json({ ok: true, emailed: false, reason: 'No client email on file' });
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: `Invoice ${inv.invoice_number} from GForceSI`,
      body: `Hi ${client?.name || ''},\n\nInvoice ${inv.invoice_number} for $${Number(inv.total || 0).toLocaleString()} has been issued.${inv.due_date ? ` Due ${inv.due_date}.` : ''}\n\n— GForceSI`,
    });
    return Response.json({ ok: true, emailed: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}