import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const EN_ROUTE_STALL_MIN = 45;
const STALE_LOCATION_MIN = 30;
const ACTIVE_JOB_STATUSES = ['en_route', 'on_site', 'scanning', 'processing'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const dryRun = !!input.dry_run;

    const [contractors, jobs, issues, users] = await Promise.all([
      base44.asServiceRole.entities.Contractor.list(),
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Issue.list().catch(() => []),
      base44.asServiceRole.entities.User.list().catch(() => []),
    ]);

    const now = Date.now();
    const anomalies = [];

    for (const c of contractors) {
      if (!c || !c.id) continue;
      const myActiveJob = jobs.find((j) => ACTIVE_JOB_STATUSES.includes(j.status) && (j.assigned_contractor_ids || []).includes(c.id));

      // Off-duty mid-job
      if (c.current_status === 'off_duty' && myActiveJob) {
        anomalies.push({ contractor: c, type: 'off_duty_mid_job', job: myActiveJob, severity: 'high', message: `${c.name} is Off Duty but still assigned to active job "${myActiveJob.title}".` });
      }

      // En-route stall
      if (c.current_status === 'en_route' && c.last_status_at) {
        const mins = (now - new Date(c.last_status_at).getTime()) / 60000;
        if (mins >= EN_ROUTE_STALL_MIN) {
          anomalies.push({ contractor: c, type: 'en_route_stall', job: myActiveJob || null, severity: 'medium', message: `${c.name} has been En Route for ${Math.round(mins)} min (threshold ${EN_ROUTE_STALL_MIN}).` });
        }
      }

      // Stale location
      if (c.location_sharing) {
        const hasCoords = c.current_latitude != null && c.current_longitude != null;
        const locAge = c.last_location_at ? (now - new Date(c.last_location_at).getTime()) / 60000 : null;
        if (!hasCoords || locAge == null || locAge >= STALE_LOCATION_MIN) {
          const detail = !hasCoords ? 'no fix yet' : locAge == null ? 'no fix timestamp' : `${Math.round(locAge)} min since last fix`;
          anomalies.push({ contractor: c, type: 'stale_location', job: null, severity: 'low', message: `${c.name} location is stale (${detail}).` });
        }
      }
    }

    // Dedup against open issues with the same anomaly title.
    const openIssues = (issues || []).filter((i) => ['open', 'in_progress'].includes(i.status));
    const titleFor = (c, type) => `⚠️ ${c.name} — ${type.replace(/_/g, ' ')}`;
    const existing = new Set(openIssues.map((i) => i.title));
    const fresh = anomalies.filter((a) => !existing.has(titleFor(a.contractor, a.type)));

    let created = 0;
    const errors = [];
    if (!dryRun) {
      for (const a of fresh) {
        try {
          await base44.asServiceRole.entities.Issue.create({
            title: titleFor(a.contractor, a.type),
            description: a.message,
            job_id: a.job?.id,
            job_title: a.job?.title,
            project_id: a.job?.project_id,
            project_name: a.job?.project_name,
            severity: a.severity,
            status: 'open',
            assigned_to_name: a.contractor.name,
            notes: `Auto-detected by Contractor Status Monitor at ${new Date().toISOString()}`,
          });
          created++;
        } catch (e) {
          errors.push({ contractor: a.contractor.name, error: e.message });
        }
      }
    }

    // Email digest to admins when there are new alerts.
    const adminEmails = (users || []).filter((u) => u.role === 'admin' && u.email).map((u) => u.email);
    let sent = 0;
    if (!dryRun && fresh.length && adminEmails.length) {
      const lines = [`<h2>⚠️ Contractor Status Monitor — ${fresh.length} new alert${fresh.length > 1 ? 's' : ''}</h2><ul>`];
      fresh.forEach((a) => { lines.push(`<li><b>${a.contractor.name}</b> — ${a.message}</li>`); });
      lines.push('</ul>');
      const body = lines.join('');
      const subject = `⚠️ Contractor Status Monitor — ${fresh.length} alert${fresh.length > 1 ? 's' : ''}`;
      for (const to of adminEmails) {
        try { await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, from_name: 'GForceSI OpsCenter' }); sent++; } catch (e) {}
      }
    }

    return Response.json({
      dryRun,
      detected: anomalies.length,
      newAlerts: fresh.length,
      issuesCreated: created,
      emailsSent: sent,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}