import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const input = await req.json();
    const { job_id, status, matterport } = input || {};
    const valid = ['scheduled', 'en_route', 'on_site', 'scanning', 'processing', 'complete', 'invoiced'];
    if (!job_id || !valid.includes(status)) return Response.json({ error: 'Invalid input' }, { status: 400 });

    const job = await base44.asServiceRole.entities.Job.get(job_id);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    const update = { $set: { status } };
    if (matterport && matterport.model_id) {
      update.$set.matterport_model_id = String(matterport.model_id);
      update.$set.matterport_share_url = String(matterport.share_url || '');
      update.$set.matterport_embed_url = String(matterport.embed_url || '');
      update.$set.matterport_synced_at = new Date().toISOString();
    }
    // Record the transition so stage durations can be measured later.
    if (job.status !== status) {
      update.$push = { status_history: { status, entered_at: new Date().toISOString() } };
    }
    await base44.asServiceRole.entities.Job.updateMany({ id: job_id }, update);
    return Response.json({ ok: true, job_id, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}