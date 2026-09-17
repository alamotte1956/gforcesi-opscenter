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

    const job = await base44.asServiceRole.entities.Job.get(offer.job_id).catch(() => null);
    if (decision === 'accept' && job) {
      const ids = Array.isArray(job.assigned_contractor_ids) ? [...job.assigned_contractor_ids] : [];
      const names = Array.isArray(job.assigned_contractor_names) ? [...job.assigned_contractor_names] : [];
      if (!ids.includes(offer.contractor_id)) {
        ids.push(offer.contractor_id);
        names.push(offer.contractor_name);
        await base44.asServiceRole.entities.Job.update(job.id, { assigned_contractor_ids: ids, assigned_contractor_names: names });
      }
    }
    try {
      const dur = job?.estimated_duration_hours ?? offer.estimated_duration_hours;
      const rate = offer.billable_rate ?? job?.billable_rate;
      const rtype = offer.billable_rate_type || job?.billable_rate_type;
      let costLine;
      if (rtype === 'hourly') {
        const total = rate != null && dur ? rate * dur : null;
        costLine = `$${rate}/hr${dur ? ` × ${dur} hr` : ''}${total != null ? ` = $${total.toFixed(2)}` : ''}`;
      } else if (rtype === 'daily') {
        const days = dur ? Math.max(1, Math.ceil(dur / 8)) : null;
        const total = rate != null && days ? rate * days : null;
        costLine = `$${rate}/day${days ? ` × ${days} day(s)` : ''}${total != null ? ` = $${total.toFixed(2)}` : ''}`;
      } else if (rtype === 'flat') {
        costLine = `$${rate} flat`;
      } else if (rtype === 'per_sqft') {
        costLine = `$${rate}/sqft`;
      } else {
        costLine = `$${rate}`;
      }
      const equip = Array.isArray(job?.required_equipment) && job.required_equipment.length ? job.required_equipment.join(', ') : 'As required for the scope of work';
      const fmt = (d) => d ? new Date(d).toLocaleString() : '—';
      const terms = `INDEPENDENT CONTRACTOR AGREEMENT\n\nThis Agreement is entered into between GForceSI ("Company") and ${offer.contractor_name} ("Contractor") for the following work:\n\nJob: ${offer.job_title}${offer.client_name ? `\nClient: ${offer.client_name}` : ''}${job?.project_name || offer.project_name ? `\nProject: ${job?.project_name || offer.project_name}` : ''}${offer.site_address || job?.site_address ? `\nSite: ${offer.site_address || job?.site_address}` : ''}\n\nSCOPE OF WORK\n${job?.deliverables || job?.notes || 'Field scanning and documentation services as described in the job details.'}\n\nEQUIPMENT REQUIRED\n${equip}\n\nTIMELINE\nScheduled start: ${fmt(job?.scheduled_start || offer.scheduled_start)}\nScheduled end: ${fmt(job?.scheduled_end)}\nScan window: ${job?.scan_window_start || '—'} to ${job?.scan_window_end || '—'}\nEstimated duration: ${dur ? `${dur} hour(s)` : '—'}\nCrew size required: ${job?.crew_size_required || 1}\n\nCOMPENSATION & EXACT COST\nRate type: ${rtype || '—'}\nExact cost: ${costLine}\n\n1. Independent Contractor Status. The Contractor is engaged as an independent contractor, not an employee. The Contractor is responsible for their own taxes, insurance, and compliance with all applicable laws.\n2. Insurance. The Contractor confirms they maintain general liability and workers' compensation insurance as required by the Company, and will provide certificates of insurance upon request.\n3. IRS / Tax. The Contractor is responsible for all federal, state, and local taxes on compensation received. A Form W-9 is on file with the Company. The Contractor is not entitled to employee benefits and understands no taxes will be withheld from payments.\n4. Scope of Work. The Contractor shall perform the services described above, using the equipment required, within the timeline stated, for the exact cost set out in this Agreement, in a professional and workmanlike manner and following all site safety requirements.\n5. Payment. The Contractor will be paid the exact cost stated above upon completion and submission of required deliverables.\n6. Compliance. The Contractor agrees to comply with all applicable laws, regulations, and site requirements.\n\nBy signing below electronically, the Contractor acknowledges they have read, understood, and agree to the terms of this Agreement, including the scope of work, equipment, timeline, exact cost, independent contractor status, insurance, and IRS/tax provisions.`;
      await base44.asServiceRole.entities.JobContract.create({
        job_id: offer.job_id, job_title: offer.job_title, project_name: offer.project_name, client_name: offer.client_name, site_address: offer.site_address,
        contractor_id: offer.contractor_id, contractor_name: offer.contractor_name, contractor_email: offer.contractor_email,
        offer_id: offerId, status: decision === 'accept' ? 'pending' : 'declined', terms,
        billable_rate_type: offer.billable_rate_type, billable_rate: offer.billable_rate,
        scheduled_start: offer.scheduled_start,
      });
    } catch (e) {}

    try {
      const accepted = decision === 'accept';
      const subject = accepted ? `Job accepted — ${job?.title || offer.job_title}` : `Job declined — ${offer.job_title}`;
      const comp = offer.billable_rate_type === 'hourly' ? `$${offer.billable_rate}/hr` : offer.billable_rate_type === 'flat' ? `$${offer.billable_rate} flat` : offer.billable_rate_type === 'daily' ? `$${offer.billable_rate}/day` : `$${offer.billable_rate}`;
      const fmt = (d) => d ? new Date(d).toLocaleString() : '—';
      const list = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '—';
      const body = accepted
        ? `Hello ${offer.contractor_name},\n\nThis confirms that you have accepted and agreed to the following job:\n\n` +
          `Job: ${job?.title || offer.job_title}\n` +
          `Client: ${job?.client_name || offer.client_name || '—'}\n` +
          `Project: ${job?.project_name || offer.project_name || '—'}\n` +
          `Site: ${job?.site_address || offer.site_address || '—'}\n` +
          `Scheduled start: ${fmt(job?.scheduled_start || offer.scheduled_start)}\n` +
          `Scheduled end: ${fmt(job?.scheduled_end)}\n` +
          `Scan window: ${job?.scan_window_start || '—'} to ${job?.scan_window_end || '—'}\n` +
          `Priority: ${job?.priority || '—'}\n` +
          `Crew size required: ${job?.crew_size_required || 1}\n` +
          `Required equipment: ${list(job?.required_equipment)}\n` +
          `Required skills: ${list(job?.required_skills)}\n` +
          `Compensation: ${comp}\n` +
          `Deliverables: ${job?.deliverables || '—'}\n` +
          `Notes: ${job?.notes || '—'}\n\n` +
          `You can view your job details in the Field App: https://gforcesi.base44.app/field\n\n— GForceSI Ops`
        : `Hello ${offer.contractor_name},\n\nThis confirms that you have declined the job offer for "${offer.job_title}".\n\nIf this was a mistake, contact your dispatcher.\n\n— GForceSI Ops`;
      await base44.asServiceRole.integrations.Core.SendEmail({ to: offer.contractor_email, from_name: 'GForceSI Ops', subject, body });
    } catch (e) {}

    return Response.json({ ok: true, status: newStatus, offer_id: offerId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}