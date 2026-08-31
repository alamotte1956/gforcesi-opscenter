import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow workflow (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const { job_id, status } = input;
    if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

    const job = await base44.asServiceRole.entities.Job.get(job_id);
    const contractorIds = job.assigned_contractor_ids || [];
    if (!contractorIds.length) return Response.json({ notified: 0, reason: 'no assigned contractors' });

    const [contractors, users] = await Promise.all([
      base44.asServiceRole.entities.Contractor.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const assigned = contractors.filter((c) => contractorIds.includes(c.id));
    const userByEmail = {};
    users.forEach((u) => { if (u.email) userByEmail[u.email.toLowerCase()] = u; });

    const isOnSite = status === 'on_site';
    const title = isOnSite ? 'Job On Site' : 'New Job Assigned';
    const body = isOnSite
      ? `You're on site for "${job.title}". Tap to open the job.`
      : `"${job.title}" has been assigned to you. Tap to view details.`;

    let sent = 0;
    const results = [];
    for (const c of assigned) {
      const u = c.email ? userByEmail[c.email.toLowerCase()] : null;
      if (!u) { results.push({ contractor: c.name, skipped: 'no matching app user' }); continue; }
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: u.id,
          title,
          content: body,
          action_label: 'Open Job',
          action_url: `/jobs/${job.id}`,
        });
        sent++;
        results.push({ contractor: c.name, sent: true });
      } catch (e) {
        results.push({ contractor: c.name, error: e.message });
      }
    }

    return Response.json({ job_id, status, notified: sent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}