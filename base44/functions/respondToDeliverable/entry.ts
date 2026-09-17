import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function normalizeEmail(email) {
  const e = (email || '').trim().toLowerCase();
  const at = e.indexOf('@');
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') return `${local.replace(/\./g, '')}@${domain}`;
  return e;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const deliverableId = (body.deliverable_id || '').trim();
    const response = (body.response || '').trim();
    const reason = (body.rejected_reason || '').trim();
    if (!deliverableId) return Response.json({ error: 'deliverable_id required' }, { status: 400 });
    if (!['accept', 'reject'].includes(response)) return Response.json({ error: 'response must be accept or reject' }, { status: 400 });

    const deliv = await base44.asServiceRole.entities.Deliverable.get(deliverableId);
    if (!deliv) return Response.json({ error: 'Deliverable not found' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const clients = await base44.asServiceRole.entities.Client.list();
      const owns = clients.some((c) => c.id === deliv.client_id && normalizeEmail(c.portal_email) === normalizeEmail(user.email));
      if (!owns) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!['delivered', 'accepted', 'rejected'].includes(deliv.status)) {
      return Response.json({ error: 'Deliverable not yet delivered for client review' }, { status: 409 });
    }

    const now = new Date().toISOString();
    if (response === 'accept') {
      await base44.asServiceRole.entities.Deliverable.update(deliverableId, {
        status: 'accepted',
        accepted_at: now,
        accepted_by_name: user.full_name || user.email,
        rejected_reason: '',
      });
    } else {
      await base44.asServiceRole.entities.Deliverable.update(deliverableId, {
        status: 'rejected',
        rejected_reason: reason,
      });
    }
    return Response.json({ ok: true, status: response === 'accept' ? 'accepted' : 'rejected' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}