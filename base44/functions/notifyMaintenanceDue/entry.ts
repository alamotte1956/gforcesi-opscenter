import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SOON_DAYS = 7;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const dryRun = !!input.dry_run;

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const today = new Date(todayStr + 'T00:00:00');
    const soon = new Date(today);
    soon.setDate(soon.getDate() + SOON_DAYS);

    const [equipment, contractors, users] = await Promise.all([
      base44.asServiceRole.entities.Equipment.list(),
      base44.asServiceRole.entities.Contractor.list(),
      base44.asServiceRole.entities.User.list(),
    ]);

    const state = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      if (d < today) return 'overdue';
      if (d <= soon) return 'due_soon';
      return null;
    };

    const flagged = equipment
      .map((e) => {
        const mState = state(e.maintenance_due_date);
        const cState = state(e.calibration_due_date);
        if (!mState && !cState && e.status !== 'in_maintenance') return null;
        return {
          id: e.id,
          name: e.name,
          type: e.type,
          serial_number: e.serial_number,
          assigned_to_contractor_name: e.assigned_to_contractor_name,
          status: e.status,
          maintenance_due_date: e.maintenance_due_date,
          maintenance_state: mState,
          calibration_due_date: e.calibration_due_date,
          calibration_state: cState,
        };
      })
      .filter(Boolean);

    const overdue = flagged.filter((e) => e.maintenance_state === 'overdue' || e.calibration_state === 'overdue' || e.status === 'in_maintenance');
    const dueSoon = flagged.filter((e) =>
      (e.maintenance_state === 'due_soon' || e.calibration_state === 'due_soon') &&
      e.maintenance_state !== 'overdue' && e.calibration_state !== 'overdue'
    );

    if (!flagged.length) {
      return Response.json({ date: todayStr, dryRun, flagged: 0, overdue: 0, dueSoon: 0, sent: 0, message: 'No equipment due for maintenance.' });
    }

    const label = (e) => {
      const bits = [];
      if (e.maintenance_state === 'overdue') bits.push(`maintenance overdue (${e.maintenance_due_date})`);
      else if (e.maintenance_state === 'due_soon') bits.push(`maintenance due ${e.maintenance_due_date}`);
      if (e.calibration_state === 'overdue') bits.push(`calibration overdue (${e.calibration_due_date})`);
      else if (e.calibration_state === 'due_soon') bits.push(`calibration due ${e.calibration_due_date}`);
      if (e.status === 'in_maintenance' && !bits.length) bits.push('currently in maintenance');
      return bits.join('; ');
    };

    const lines = [];
    lines.push(`<h2>⚠️ GForceSI — Equipment Maintenance Alert (${todayStr})</h2>`);
    lines.push(`<p>${overdue.length} asset${overdue.length === 1 ? '' : 's'} overdue or in maintenance, ${dueSoon.length} due within ${SOON_DAYS} days. <b>Please pull overdue units from the field.</b></p>`);

    if (overdue.length) {
      lines.push(`<h3>Overdue / In Maintenance (${overdue.length})</h3><ul>`);
      overdue.forEach((e) => {
        lines.push(`<li><b>${e.name}</b> (${e.type}${e.serial_number ? ` · ${e.serial_number}` : ''}) — ${label(e)}${e.assigned_to_contractor_name ? ` · assigned to ${e.assigned_to_contractor_name}` : ''}${e.status === 'checked_out' ? ' · <b>currently checked out</b>' : ''}</li>`);
      });
      lines.push(`</ul>`);
    }
    if (dueSoon.length) {
      lines.push(`<h3>Due Soon (${dueSoon.length})</h3><ul>`);
      dueSoon.forEach((e) => {
        lines.push(`<li><b>${e.name}</b> (${e.type}) — ${label(e)}${e.assigned_to_contractor_name ? ` · assigned to ${e.assigned_to_contractor_name}` : ''}</li>`);
      });
      lines.push(`</ul>`);
    }
    lines.push(`<p style="color:#64748b;font-size:12px;margin-top:16px">Review and update due dates on the Equipment page once serviced.</p>`);

    const body = lines.join('');
    const subject = `⚠️ Equipment Maintenance Alert — ${overdue.length} overdue, ${dueSoon.length} due soon`;

    // Recipients: admins + dispatchers (contractors with Dispatcher role).
    const adminEmails = (users || []).filter((u) => u.role === 'admin' && u.email).map((u) => u.email);
    const dispatcherEmails = (contractors || []).filter((c) => c.role === 'Dispatcher' && c.email).map((c) => c.email);
    const recipients = [...new Set([...adminEmails, ...dispatcherEmails])].filter(Boolean);

    let sent = 0;
    const errors = [];
    if (!dryRun) {
      for (const to of recipients) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, from_name: 'GForceSI OpsCenter' });
          sent++;
        } catch (e) {
          errors.push({ to, error: e.message });
        }
      }
    }

    return Response.json({
      date: todayStr,
      dryRun,
      flagged: flagged.length,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      recipients,
      sent,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}