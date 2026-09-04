import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ctDate, ctTime, ctToday } from '../../shared/ctDateUtils.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const dryRun = !!input.dry_run;

    const today = ctToday();

    const [jobs, issues, invoices, expenses, contractors, clients, equipment, reports, inspections, users] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Issue.list(),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.Expense.list(),
      base44.asServiceRole.entities.Contractor.list(),
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Equipment.list(),
      base44.asServiceRole.entities.DailyReport.list(),
      base44.asServiceRole.entities.Inspection.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    // ---- Activity summary ----
    const jobsToday = jobs.filter((j) => ctDate(j.scheduled_start) === today);
    const byStatus = jobs.reduce((m, j) => { m[j.status] = (m[j.status] || 0) + 1; return m; }, {});
    const inProgress = jobs.filter((j) => ['en_route', 'on_site', 'scanning', 'processing'].includes(j.status));
    const unassignedToday = jobsToday.filter((j) => !(j.assigned_contractor_ids || []).length);
    const reportsToday = reports.filter((r) => r.report_date === today);
    const issuesOpen = issues.filter((i) => ['open', 'in_progress'].includes(i.status));
    const issuesNewToday = issues.filter((i) => ctDate(i.created_date) === today);
    const inspToday = inspections.filter((i) => i.inspection_date === today);
    const expensesPending = expenses.filter((e) => e.status === 'pending');
    const invoicesOverdue = invoices.filter((i) => i.status === 'overdue' || (i.due_date && i.due_date < today && i.status !== 'paid'));
    const invoicesSent = invoices.filter((i) => i.status === 'sent' || i.status === 'synced');

    // ---- Watch areas ----
    const criticalIssues = issuesOpen.filter((i) => ['high', 'critical'].includes(i.severity));
    const complianceGaps = contractors.filter((c) => c.onboarding_status !== 'complete' || !c.w9_on_file || !c.insurance_on_file || !c.workers_comp_on_file || !c.contract_signed);
    const equipWatch = equipment.filter((e) => e.status === 'in_maintenance' || (e.calibration_due_date && e.calibration_due_date < today) || (e.maintenance_due_date && e.maintenance_due_date < today));

    const clientById = (id) => clients.find((c) => c.id === id);
    const outsideHours = jobsToday.filter((j) => {
      const c = clientById(j.client_id);
      if (!c || !c.opening_time || !c.closing_time || !j.scheduled_start) return false;
      const parts = new Date(j.scheduled_start).toLocaleString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', hour12: false, minute: '2-digit' }).split(':').map(Number);
      const mins = parts[0] * 60 + parts[1];
      const [oh, om] = c.opening_time.split(':').map(Number);
      const [ch, cm] = c.closing_time.split(':').map(Number);
      return mins < oh * 60 + om || mins > ch * 60 + cm;
    });

    // ---- Build email ----
    const lines = [];
    lines.push(`<h2>GForceSI OpsCenter — Daily Report (${today})</h2>`);
    lines.push(`<h3>Activity Summary</h3><ul>`);
    lines.push(`<li><b>${jobsToday.length}</b> jobs scheduled today</li>`);
    lines.push(`<li><b>${inProgress.length}</b> jobs currently in progress</li>`);
    lines.push(`<li><b>${reportsToday.length}</b> daily reports filed today</li>`);
    lines.push(`<li><b>${issuesNewToday.length}</b> new issues today · <b>${issuesOpen.length}</b> open total</li>`);
    lines.push(`<li><b>${inspToday.length}</b> inspections scheduled today</li>`);
    lines.push(`<li><b>${expensesPending.length}</b> expenses pending approval ($${expensesPending.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()})</li>`);
    lines.push(`<li><b>${invoicesSent.length}</b> invoices awaiting payment · <b>${invoicesOverdue.length}</b> overdue</li>`);
    lines.push(`<li>Jobs by status: ${Object.entries(byStatus).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ') || 'none'}</li>`);
    lines.push(`</ul>`);

    lines.push(`<h3>⚠️ Watch Areas</h3>`);
    const watch = [];
    if (criticalIssues.length) {
      watch.push(`<b>Critical/high issues (${criticalIssues.length}):</b><ul>${criticalIssues.slice(0, 8).map((i) => `<li>${i.title}${i.job_title ? ` — ${i.job_title}` : ''} [${i.severity}]</li>`).join('')}</ul>`);
    }
    if (invoicesOverdue.length) {
      watch.push(`<b>Overdue invoices (${invoicesOverdue.length}):</b><ul>${invoicesOverdue.slice(0, 8).map((i) => `<li>${i.invoice_number} — ${i.client_name || ''} · $${(i.total || 0).toLocaleString()} (due ${i.due_date || '?'})</li>`).join('')}</ul>`);
    }
    if (expensesPending.length) {
      watch.push(`<b>Expenses awaiting approval:</b> ${expensesPending.length} totaling $${expensesPending.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}<br/>`);
    }
    if (complianceGaps.length) {
      watch.push(`<b>Compliance gaps (${complianceGaps.length}):</b><ul>${complianceGaps.slice(0, 8).map((c) => `<li>${c.name} — ${[!c.w9_on_file && 'W-9', !c.insurance_on_file && 'insurance', !c.workers_comp_on_file && 'workers comp', !c.contract_signed && 'contract'].filter(Boolean).join(', ') || 'onboarding incomplete'}</li>`).join('')}</ul>`);
    }
    if (equipWatch.length) {
      watch.push(`<b>Equipment attention (${equipWatch.length}):</b><ul>${equipWatch.slice(0, 8).map((e) => `<li>${e.name} — ${e.status === 'in_maintenance' ? 'in maintenance' : `due ${e.calibration_due_date || e.maintenance_due_date}`}</li>`).join('')}</ul>`);
    }
    if (unassignedToday.length) {
      watch.push(`<b>Unassigned jobs today (${unassignedToday.length}):</b><ul>${unassignedToday.slice(0, 8).map((j) => `<li>${j.title}</li>`).join('')}</ul>`);
    }
    if (outsideHours.length) {
      watch.push(`<b>Scheduled outside client hours (${outsideHours.length}):</b><ul>${outsideHours.slice(0, 8).map((j) => `<li>${j.title} — ${ctTime(j.scheduled_start)}</li>`).join('')}</ul>`);
    }
    const watchCount = criticalIssues.length + invoicesOverdue.length + expensesPending.length + complianceGaps.length + equipWatch.length + unassignedToday.length + outsideHours.length;
    if (watchCount === 0) watch.push(`<p>No watch areas — all clear.</p>`);
    lines.push(...watch);

    const body = lines.join('');
    const subject = `GForceSI Daily Ops Report — ${today}`;

    // ---- Recipients: admins + management contractors ----
    const adminEmails = (users || []).filter((u) => u.role === 'admin' && u.email).map((u) => u.email);
    const mgmtEmails = (contractors || []).filter((c) => ['Admin', 'Dispatcher', 'Billing Manager'].includes(c.role) && c.email).map((c) => c.email);
    const recipients = [...new Set([...adminEmails, ...mgmtEmails])].filter(Boolean);

    let sent = 0;
    if (!dryRun) {
      for (const to of recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, from_name: 'GForceSI OpsCenter' });
          sent++;
        } catch (e) {}
      }
    }

    return Response.json({
      date: today,
      dryRun,
      recipients,
      sent,
      watchAreas: watchCount,
      summary: {
        jobsToday: jobsToday.length,
        inProgress: inProgress.length,
        reportsToday: reportsToday.length,
        issuesOpen: issuesOpen.length,
        issuesNewToday: issuesNewToday.length,
        expensesPending: expensesPending.length,
        invoicesOverdue: invoicesOverdue.length,
        invoicesSent: invoicesSent.length,
        byStatus,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}