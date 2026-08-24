import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Pushes the full job/scan record to workspace.7GProsconsulting.com using Basic auth.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;
    if (!jobId) return Response.json({ error: 'job_id is required' }, { status: 400 });

    const job = await base44.entities.Job.get(jobId);

    const payload = {
      source: 'GForceSI OpsCenter',
      job: {
        id: job.id,
        title: job.title,
        project_id: job.project_id,
        project_name: job.project_name,
        client_id: job.client_id,
        client_name: job.client_name,
        site_address: job.site_address,
        latitude: job.latitude,
        longitude: job.longitude,
        required_equipment: job.required_equipment || [],
        estimated_duration_hours: job.estimated_duration_hours,
        priority: job.priority,
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
        sla_due_date: job.sla_due_date,
        assigned_contractor_ids: job.assigned_contractor_ids || [],
        assigned_contractor_names: job.assigned_contractor_names || [],
        status: job.status,
        status_history: job.status_history || [],
        billable_rate_type: job.billable_rate_type,
        billable_rate: job.billable_rate,
        notes: job.notes,
        deliverables: job.deliverables,
        photos: job.photos || [],
        matterport: {
          model_id: job.matterport_model_id,
          share_url: job.matterport_share_url,
          embed_url: job.matterport_embed_url,
          synced_at: job.matterport_synced_at,
        },
      },
      uploaded_by: { id: user.id, email: user.email, name: user.full_name },
      uploaded_at: new Date().toISOString(),
    };

    const username = secrets.get('SEVENG_API_USERNAME');
    const password = secrets.get('SEVENG_API_PASSWORD');
    const url = secrets.get('SEVENG_UPLOAD_URL');
    if (!username || !password || !url) {
      return Response.json({ error: '7G upload credentials not configured. Set SEVENG_API_USERNAME, SEVENG_API_PASSWORD, and SEVENG_UPLOAD_URL in Secrets.' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(username + ':' + password);
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await upstream.text();
    let responseBody;
    try { responseBody = JSON.parse(responseText); } catch { responseBody = responseText; }

    if (!upstream.ok) {
      return Response.json({ ok: false, status: upstream.status, error: responseBody }, { status: 200 });
    }
    return Response.json({ ok: true, status: upstream.status, response: responseBody });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}