import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await req.json();
    const { job_id, status } = input || {};
    const valid = ['scheduled', 'en_route', 'on_site', 'scanning', 'processing', 'complete', 'invoiced'];
    if (!job_id || !valid.includes(status)) return Response.json({ error: 'Invalid input' }, { status: 400 });
    await base44.asServiceRole.entities.Job.update(job_id, { status });
    return Response.json({ ok: true, job_id, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}