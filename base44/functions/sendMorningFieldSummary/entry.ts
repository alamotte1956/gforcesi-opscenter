import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ctDate, ctTime, ctToday } from '../../shared/ctDateUtils.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const dryRun = !!input.dry_run;
    const targetDate = input.date || ctToday();

    const [jobs, contractors, clients] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Contractor.list(),
      base44.asServiceRole.entities.Client.list(),
    ]);

    // Today's jobs only (scheduled_start in CT = targetDate), exclude completed/invoiced
    const jobsToday = jobs
      .filter((j) => ctDate(j.scheduled_start) === targetDate)
      .filter((j) => !['complete', 'invoiced'].includes(j.status))
      .sort((a, b) => new Date(a.scheduled_start || 0).getTime() - new Date(b.scheduled_start || 0).getTime());

    const clientById = (id) => clients.find((c) => c.id === id);

    // Field roles only — the people who actually travel to sites
    const fieldContractors = contractors.filter((c) =>
      ['Field Technician', 'Field Pilot'].includes(c.role) && c.email
    );

    const results = [];
    let sent = 0;

    for (const c of fieldContractors) {
      const myJobs = jobsToday.filter((j) => (j.assigned_contractor_ids || []).includes(c.id));
      if (!myJobs.length) continue;

      const lines = [];
      lines.push(`<h2>Good morning ${c.name},</h2>`);
      lines.push(`<p>Here's your schedule and route for <b>${targetDate}</b>. You have <b>${myJobs.length}</b> job${myJobs.length === 1 ? '' : 's'} today.</p>`);

      // Route overview (ordered stops)
      lines.push(`<h3>🗺️ Route Overview</h3><ol>`);
      myJobs.forEach((j, idx) => {
        lines.push(`<li><b>${j.title}</b>${j.site_address ? ` — ${j.site_address}` : ''}${j.scheduled_start ? ` · start ${ctTime(j.scheduled_start)}` : ''}</li>`);
      });
      lines.push(`</ol>`);

      // Job details
      lines.push(`<h3>📋 Job Details</h3>`);
      myJobs.forEach((j, idx) => {
        const client = clientById(j.client_id);
        lines.push(`<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;">`);
        lines.push(`<p style="margin:0 0 4px;"><b>Stop ${idx + 1}: ${j.title}</b></p>`);
        if (j.scheduled_start) lines.push(`<p style="margin:0 0 4px;color:#475569;">Start: ${ctTime(j.scheduled_start)}${j.estimated_duration_hours ? ` · est. ${j.estimated_duration_hours}h` : ''}</p>`);
        if (j.site_address) lines.push(`<p style="margin:0 0 4px;color:#475569;">📍 ${j.site_address}</p>`);
        if (client) {
          const hours = [client.opening_time, client.closing_time].filter(Boolean).join('–');
          lines.push(`<p style="margin:0 0 4px;color:#475569;">Client: ${client.name}${hours ? ` · site hours ${hours}` : ''}${client.access_notes ? ` · access: ${client.access_notes}` : ''}</p>`);
        }
        if (j.priority && j.priority !== 'medium') lines.push(`<p style="margin:0 0 4px;color:#b91c1c;">Priority: ${j.priority}</p>`);
        if (j.required_equipment && j.required_equipment.length) lines.push(`<p style="margin:0 0 4px;color:#475569;">Equipment: ${j.required_equipment.join(', ')}</p>`);
        if (j.deliverables) lines.push(`<p style="margin:0 0 4px;color:#475569;">Deliverables: ${j.deliverables}</p>`);
        if (j.notes) lines.push(`<p style="margin:0 0 4px;color:#475569;">Notes: ${j.notes}</p>`);
        lines.push(`</div>`);
      });

      lines.push(`<p style="margin-top:16px;color:#64748b;">Open the GForceSI OpsCenter field app to update your status and navigate between stops. Have a safe day.</p>`);

      const body = lines.join('');
      const subject = `Your schedule for ${targetDate} — ${myJobs.length} job${myJobs.length === 1 ? '' : 's'}`;

      if (!dryRun) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: c.email, subject, body, from_name: 'GForceSI OpsCenter' });
          sent++;
          results.push({ contractor: c.name, email: c.email, jobs: myJobs.length, sent: true });
        } catch (e) {
          results.push({ contractor: c.name, email: c.email, jobs: myJobs.length, sent: false, error: e.message });
        }
      } else {
        results.push({ contractor: c.name, email: c.email, jobs: myJobs.length, sent: false, dryRun: true });
      }
    }

    return Response.json({
      date: targetDate,
      dryRun,
      fieldContractors: fieldContractors.length,
      contractorsEmailed: sent,
      jobsToday: jobsToday.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}