import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { ctToday } from '../../shared/ctDateUtils.ts';

function addCadence(dateStr, cadence) {
  const d = new Date(dateStr + 'T00:00:00');
  if (cadence === 'weekly') d.setDate(d.getDate() + 7);
  else if (cadence === 'biweekly') d.setDate(d.getDate() + 14);
  else if (cadence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cadence === 'quarterly') d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Allow scheduled (no-user) invocations; block non-admin direct calls.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const input = await req.json().catch(() => ({}));
    const dryRun = !!input.dry_run;
    const today = input.date || ctToday();

    const schedules = await base44.asServiceRole.entities.RecurringSchedule.list();
    const due = schedules.filter((s) => s.active && s.next_run_date && s.next_run_date <= today);

    const created = [];
    const errors = [];

    for (const s of due) {
      try {
        const startDate = new Date(s.next_run_date + 'T09:00:00');
        const endDate = s.estimated_duration_hours
          ? new Date(startDate.getTime() + s.estimated_duration_hours * 3600000)
          : null;

        const jobPayload = {
          title: s.name,
          project_id: s.project_id || undefined,
          project_name: s.project_name || undefined,
          client_id: s.client_id || undefined,
          client_name: s.client_name || undefined,
          site_address: s.site_address,
          latitude: s.latitude,
          longitude: s.longitude,
          required_equipment: s.required_equipment || [],
          estimated_duration_hours: s.estimated_duration_hours,
          priority: s.priority || 'medium',
          scheduled_start: startDate.toISOString(),
          scheduled_end: endDate ? endDate.toISOString() : undefined,
          assigned_contractor_ids: s.assigned_contractor_ids || [],
          assigned_contractor_names: s.assigned_contractor_names || [],
          status: 'scheduled',
          billable_rate_type: s.billable_rate_type || 'flat',
          billable_rate: s.billable_rate,
          notes: s.notes,
        };

        let jobId;
        if (!dryRun) {
          const job = await base44.asServiceRole.entities.Job.create(jobPayload);
          jobId = job.id;
          const nextDate = addCadence(s.next_run_date, s.cadence);
          await base44.asServiceRole.entities.RecurringSchedule.update(s.id, { next_run_date: nextDate });
        }
        created.push({
          schedule: s.name,
          run_date: s.next_run_date,
          next_run: addCadence(s.next_run_date, s.cadence),
          job_id: jobId || null,
        });
      } catch (e) {
        errors.push({ schedule: s.name, error: e.message });
      }
    }

    return Response.json({
      date: today,
      dryRun,
      due_count: due.length,
      created: created.length,
      created,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}