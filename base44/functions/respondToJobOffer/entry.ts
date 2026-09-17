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
    const offerId = (body.offer_id || '').trim();
    const decision = (body.response || '').trim().toLowerCase();
    if (!offerId) return Response.json({ error: 'offer_id required' }, { status: 400 });
    if (!['accept', 'decline'].includes(decision)) return Response.json({ error: 'response must be accept or decline' }, { status: 400 });

    const offer = await base44.asServiceRole.entities.JobOffer.get(offerId);
    if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });
    if (normalizeEmail(offer.contractor_email) !== normalizeEmail(user.email)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (offer.status !== 'offered') return Response.json({ error: 'Offer already responded to', status: offer.status }, { status: 409 });

    const now = new Date().toISOString();
    const newStatus = decision === 'accept' ? 'accepted' : 'declined';
    await base44.asServiceRole.entities.JobOffer.update(offerId, { status: newStatus, responded_at: now });

    if (decision === 'accept') {
      const job = await base44.asServiceRole.entities.Job.get(offer.job_id).catch(() => null);
      if (job) {
        const ids = Array.isArray(job.assigned_contractor_ids) ? [...job.assigned_contractor_ids] : [];
        const names = Array.isArray(job.assigned_contractor_names) ? [...job.assigned_contractor_names] : [];
        if (!ids.includes(offer.contractor_id)) {
          ids.push(offer.contractor_id);
          names.push(offer.contractor_name);
          await base44.asServiceRole.entities.Job.update(job.id, { assigned_contractor_ids: ids, assigned_contractor_names: names });
        }
      }
    }

    return Response.json({ ok: true, status: newStatus, offer_id: offerId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}