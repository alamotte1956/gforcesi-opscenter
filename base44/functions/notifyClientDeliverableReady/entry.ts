import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = (body.deliverable_id || '').trim();
    if (!id) return Response.json({ error: 'deliverable_id required' }, { status: 400 });
    const d = await base44.asServiceRole.entities.Deliverable.get(id);
    if (!d) return Response.json({ error: 'Not found' }, { status: 404 });
    const clients = await base44.asServiceRole.entities.Client.list();
    const client = clients.find((c) => c.id === d.client_id);
    const to = client?.billing_email || client?.portal_email;
    if (!to) return Response.json({ ok: true, emailed: false, reason: 'No client email on file' });
    const link = d.share_url || '';
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject: `Your 3D model is ready for review — ${d.job_title || 'your site'}`,
      body: `Hi ${client?.name || ''},\n\nYour digital twin for ${d.job_title || 'your site'} is ready for review.${link ? `\n\nView it here: ${link}` : ''}\n\nPlease log in to your client portal to accept it or request changes.\n\n— GForceSI`,
    });
    return Response.json({ ok: true, emailed: true });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}